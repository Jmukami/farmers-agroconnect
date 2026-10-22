import express from 'express';
import { appendFileSync } from 'node:fs';
import { createSkillBridgeRouter } from '../server/skillbridge.js';
import { assertContract } from '../server/contract-assertions.js';

// Read-only live check. No consultations or remote data are created.
const app = express();
app.use('/api/skillbridge', createSkillBridgeRouter());
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const rows = [];
let failures = 0;
async function check(path, expected = 200) {
  const started = Date.now();
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/skillbridge${path}`, { signal: AbortSignal.timeout(45000) });
    const data = await response.json();
    assertContract(`/skillbridge${path}`, 'GET', response.status, data);
    if (response.status !== expected) throw new Error(`HTTP ${response.status}; expected ${expected}`);
    rows.push(`| GET ${path} | ${response.status} | PASS | ${Date.now() - started} ms |`);
    return data;
  } catch (error) {
    failures++;
    rows.push(`| GET ${path} | — | FAIL: ${error.message.replace(/[|\r\n]/g, ' ')} | ${Date.now() - started} ms |`);
    return null;
  }
}
try {
  const list = await check('/experts');
  await check('/skills');
  await check('/skills?tag=Agriculture');
  await check('/experts?sort=proximity&lat=-1.286&lng=36.817');
  if (list?.experts[0]) {
    const expert = list.experts[0];
    await check(`/experts?${new URLSearchParams({ estate: expert.estate, sort: 'rating' })}`);
    await check(`/experts/${expert.id}`);
    await check(`/experts/${expert.id}/availability`);
    await check(`/experts/${expert.id}/reviews`);
  } else { failures++; rows.push('| Expert-specific checks | — | SKIPPED: no expert available | — |'); }
  await check('/experts?sort=proximity', 400);
  await check('/experts/999999', 404);
} finally {
  await new Promise((resolve) => server.close(resolve));
  const timestamp = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date());
  const section = `\n\n## Read-only live adapter verification — ${timestamp} EAT\n\nLocal AgroConnect adapter → configured SkillBridge service. Response bodies validated against OpenAPI. Expected 400/404 results are successful negative checks. No upstream POST was issued.\n\n| Adapter request | HTTP | Result | Duration |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`;
  appendFileSync(new URL('../INTEGRATION_LOG.MD', import.meta.url), section);
  console.log(rows.join('\n'));
  if (failures) process.exitCode = 1;
}
