import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createSkillBridgeRouter } from './skillbridge.js';
import { createSkillBridgeClient } from './skillbridge.js';
import { getSkillBridgeExpertApi } from './skillbridge-contract.js';
import { assertContract } from './contract-assertions.js';

test('SkillBridge filters agricultural experts and isolates optional upstream failures', async () => {
  const expert = { id: 13, name: 'Agronomist', estate: 'Kiambu', rating: 4.9, skills: ['Soil Health'] };
  const upstreamExpert = { id: 13, name: 'Agronomist', location: 'Kiambu', rating: 4.9, skills: ['Soil Health'] };
  let malformed = false;
  let offline = false;
  const calls = [];
  const app = express();
  app.use('/api/skillbridge', createSkillBridgeRouter({ apiKey: 'test-upstream-key', fetchImpl: async (url) => {
    calls.push(url);
    if (offline) throw new Error('connection failed');
    if (malformed) return Response.json({ invalid: true });
    if (url.endsWith('/reviews')) return new Response('unavailable', { status: 503 });
    if (url.endsWith('/availability')) return Response.json([]);
    if (url.includes('/skills')) return Response.json([{ id: 1, name: 'Soil Health', category: 'Agriculture' }]);
    if (url.endsWith('/v2/experts/13')) return Response.json({ data: { ...upstreamExpert, email: 'private@example.invalid', password_hash: 'private', isAdmin: true } });
    if (url.endsWith('/v2/experts/99')) return new Response('', { status: 404 });
    return Response.json({ data: [{ ...upstreamExpert, ...(url.includes('proximity') ? { distanceKm: 4.2 } : {}) }, { ...upstreamExpert, id: 2, skills: ['Music'], distanceKm: 1 }], count: 2 });
  }, onFailure: () => {} }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = async (path) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/skillbridge${path}`);
    assertContract(`/skillbridge${path}`, 'GET', response.status, await response.clone().json());
    return response;
  };
  try {
    const list = await (await request('/experts')).json();
    assert.deepEqual(list.experts, [expert]);
    assert.deepEqual(list.estates, ['Kiambu']);
    assert.equal((await request('/skills?tag=Agriculture')).status, 200);
    assert.equal((await request('/experts/13/availability')).status, 200);
    assert.equal((await request('/experts/13/reviews')).status, 503);
    assert.equal((await request('/experts?sort=invalid')).status, 400);
    assert.equal((await request('/experts?sort=proximity')).status, 400);
    assert.equal((await request('/experts?lat=0&lng=181')).status, 400);
    assert.equal((await request('/experts?estate=a&estate=b')).status, 400);
    const nearest = await (await request('/experts?sort=proximity&lat=0&lng=0&estate=Kiambu')).json();
    assert.equal(nearest.experts[0].distanceKm, 4.2);
    assert.ok(calls.some((url) => url.endsWith('/v2/experts?sort=proximity&location=Kiambu&lat=0&lng=0')));
    assert.ok(calls.some((url) => url.endsWith('/v2/experts?sort=rating')));
    assert.deepEqual((await (await request('/experts?skill=Music')).json()).experts, []);
    const detail = await (await request('/experts/13')).json();
    assert.deepEqual(detail.expert, expert);
    assert.equal(detail.reviews, null);
    assert.deepEqual(detail.availability, []);
    assert.equal((await request('/experts/invalid')).status, 400);
    assert.equal((await request('/experts/99')).status, 404);
    malformed = true;
    const malformedSaved = await request('/experts');
    assert.equal(malformedSaved.status, 200);
    assert.equal((await malformedSaved.json()).stale, true);
    malformed = false;
    offline = true;
    const saved = await request('/experts');
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).stale, true);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('SkillBridge client reports sanitized failures, preserves conflicts and does not retry writes', async () => {
  const events = [];
  let calls = 0;
  const client = createSkillBridgeClient({ apiKey: 'test-upstream-key', onFailure: (event) => events.push(event), fetchImpl: async () => { calls++; return new Response('', { status: 409 }); } });
  await assert.rejects(client('/requests', () => true, { method: 'POST', body: { farmerName: 'Private name' } }), { status: 409 });
  assert.equal(calls, 1);
  assert.equal(events[0].upstreamStatus, 409);
  assert.ok(!JSON.stringify(events).includes('Private name'));
  const invalidJson = createSkillBridgeClient({ apiKey: 'test-upstream-key', onFailure: () => {}, fetchImpl: async () => new Response('invalid') });
  await assert.rejects(invalidJson('/skills', () => true), { status: 502 });
  const timeout = createSkillBridgeClient({ apiKey: 'test-upstream-key', timeoutMs: 5, onFailure: () => {}, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(signal.reason)); setTimeout(() => reject(new Error('Test fallback')), 30); }) });
  await assert.rejects(timeout('/experts', () => true), { status: 503 });
});

test('SkillBridge credentials stay in upstream headers and failures are sanitized', async () => {
  const secret = 'private-partner-test-key';
  const events = [];
  for (const status of [200, 401, 403]) {
    let calls = 0;
    const client = createSkillBridgeClient({ apiKey: secret, onFailure: (event) => events.push(event), fetchImpl: async (url, options) => {
      calls++;
      assert.equal(options.headers['X-API-Key'], secret);
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.redirect, 'error');
      assert.ok(!url.includes(secret));
      return Response.json(status === 200 ? [] : { message: secret }, { status });
    } });
    if (status === 200) assert.deepEqual(await client('/skills', Array.isArray), []);
    else await assert.rejects(client('/skills', Array.isArray), (error) => error.status === 503 && !error.message.includes(secret));
    assert.equal(calls, 1);
  }
  let calls = 0;
  const missing = createSkillBridgeClient({ apiKey: '', onFailure: (event) => events.push(event), fetchImpl: async () => { calls++; } });
  await assert.rejects(missing('/skills', Array.isArray), { status: 503 });
  assert.equal(calls, 0);
  assert.ok(!JSON.stringify(events).includes(secret));
});

test('SkillBridge expert contract supports explicit v1 rollback and strictly parses v2 envelopes', () => {
  const v1 = getSkillBridgeExpertApi('v1');
  assert.equal(v1.listPath, '/experts');
  assert.equal(v1.locationQuery, 'estate');
  assert.deepEqual(v1.parseList([{ id: 13, name: 'Amina', estate: 'Ruiru', rating: 4.9, skills: ['Agronomy'] }])[0].estate, 'Ruiru');

  const v2 = getSkillBridgeExpertApi('v2');
  assert.equal(v2.listPath, '/v2/experts');
  const parsed = v2.parseList({ data: [{ id: 13, name: 'Amina', location: 'Ruiru', rating: 4.9, skills: ['Agronomy'] }], count: 1 });
  assert.equal(parsed[0].estate, 'Ruiru');
  assert.equal(parsed[0].location, undefined);
  assert.equal(v2.parseList([{ id: 13, name: 'Amina', location: 'Ruiru', rating: 4.9, skills: [] }]), null);
  assert.equal(v2.parseDetail({ data: { id: 13, name: 'Amina', location: 'Ruiru', rating: 4.9, skills: [] } }).estate, 'Ruiru');
  assert.throws(() => getSkillBridgeExpertApi('v3'), /must be v1 or v2/);
});
