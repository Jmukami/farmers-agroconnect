import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createClient } from '@libsql/client';
import { databaseClient } from './database-client.js';
import { createConsultationRouter } from './consultations.js';
import { assertContract } from './contract-assertions.js';

test('consultations persist success and ambiguous outcomes, isolate users and prevent repeated POSTs', async () => {
  const db = databaseClient(createClient({ url: 'file::memory:' }));
  await db.exec(`CREATE TABLE consultations (id INTEGER PRIMARY KEY, user_id INTEGER, expert_id INTEGER, expert_name TEXT, topic TEXT, appointment_at TEXT, submission_state TEXT, partner_request_id INTEGER, partner_status TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, expert_id, appointment_at));`);
  let writes = 0;
  let outcome = 'success';
  const app = express();
  app.use(express.json());
  app.use('/requests', createConsultationRouter({ db, apiKey: 'test-upstream-key',
    authenticate: (req, res, next) => { if (!req.headers.authorization) return res.sendStatus(401); req.user = { id: Number(req.headers.authorization), fullName: 'Authenticated Farmer' }; next(); },
    onFailure: () => {}, fetchImpl: async (url, options) => {
      assert.equal(options.headers['X-API-Key'], 'test-upstream-key');
      assert.equal(options.headers.Authorization, undefined);
      if (url.includes('/experts/')) return Response.json({ id: 13, name: 'Agronomist', skills: ['Soil Health'] });
      if (url.includes('/skills')) return Response.json([{ name: 'Soil Health', category: 'Agriculture' }]);
      writes++;
      assert.equal(JSON.parse(options.body).farmerName, 'Authenticated Farmer');
      if (outcome === 'timeout') throw new Error('Response lost');
      if (outcome === 'conflict') return new Response('', { status: 409 });
      return Response.json({ requestId: 501, status: 'Pending' });
    },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = async (body, user = 1) => {
    const method = body ? 'POST' : 'GET';
    const response = await fetch(`http://127.0.0.1:${server.address().port}/requests`, { method, headers: { Authorization: String(user), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assertContract('/skillbridge/requests', method, response.status, await response.clone().json());
    return response;
  };
  const input = { expertId: 13, topic: 'Soil advice', date: '2099-10-23T10:00:00+03:00', farmerName: 'Spoofed identity' };
  try {
    assert.equal((await request({ ...input, date: '2099-10-23T10:00:00' })).status, 422);
    const concurrent = await Promise.all([request(input), request(input)]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
    assert.equal(writes, 1);
    const history = await (await request()).json();
    assert.equal(history.consultations[0].requestId, 501);
    assert.equal(history.consultations[0].date, '2099-10-23T07:00:00.000Z');
    assert.equal((await (await request(undefined, 2)).json()).consultations.length, 0);
    outcome = 'timeout';
    const uncertain = { ...input, date: '2099-10-24T10:00:00+03:00' };
    assert.equal((await request(uncertain)).status, 503);
    assert.equal((await request(uncertain)).status, 409);
    assert.equal(writes, 2);
    assert.equal((await (await request()).json()).consultations[0].submissionState, 'unknown');
    outcome = 'conflict';
    assert.equal((await request({ ...input, date: '2099-10-25T10:00:00+03:00' })).status, 409);
    assert.equal((await (await request()).json()).consultations[0].submissionState, 'rejected');
  } finally { await new Promise((resolve) => server.close(resolve)); db.close(); }
});
