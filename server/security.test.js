import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createApiProtection } from './security.js';

test('keys fail closed; limiter isolates consumers, resets and exempts health/preflight', async () => {
  assert.throws(() => createApiProtection({ keys: '' }), /Configure API_KEYS/);
  let time = 1000;
  const app = express();
  app.use('/api', createApiProtection({ keys: 'test-consumer-a,test-consumer-b', limit: 2, windowMs: 1000, now: () => time }));
  app.use((_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = async (key, path = '/products', method = 'GET') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: key ? { 'X-API-Key': key } : {} });
    const body = await response.json();
    return { status: response.status, retry: response.headers.get('retry-after'), body };
  };
  try {
    for (const path of ['/products', '/auth/login', '/skillbridge/experts', '/missing', '/products?api_key=test-consumer-a']) {
      assert.equal((await request(undefined, path)).status, 401);
    }
    assert.equal((await request('wrong')).status, 401);
    assert.equal((await request(undefined, '/health')).status, 200);
    assert.equal((await request(undefined, '/products', 'OPTIONS')).status, 200);
    assert.equal((await request('test-consumer-a')).status, 200);
    assert.equal((await request('test-consumer-a', '/skillbridge/experts')).status, 200);
    assert.deepEqual(await request('test-consumer-a'), { status: 429, retry: '1', body: { message: 'Rate limit exceeded. Please try again later.' } });
    assert.equal((await request('test-consumer-b')).status, 200);
    time = 2000;
    assert.equal((await request('test-consumer-a')).status, 200);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
