import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { databaseClient } from './database-client.js';
import { spawnSync } from 'node:child_process';

test('production refuses to use a local database when Turso configuration is missing', () => {
  const result = spawnSync(process.execPath, ['server/index.js'], {
    env: { ...process.env, NODE_ENV: 'production', TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', JWT_SECRET: 'test-secret' },
    encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Production requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN/);
});

test('asynchronous transactions commit together and roll back all writes on failure', async () => {
  const db = databaseClient(createClient({ url: ':memory:' }));
  try {
    await db.exec('CREATE TABLE stock (id INTEGER PRIMARY KEY, quantity INTEGER CHECK(quantity >= 0))');
    await db.prepare('INSERT INTO stock VALUES (?, ?)').run(1, 10);
    await assert.rejects(db.transaction(async () => {
      await db.prepare('UPDATE stock SET quantity = quantity - ? WHERE id = ?').run(2, 1);
      await db.prepare('INSERT INTO stock VALUES (?, ?)').run(2, -1);
    }));
    assert.equal((await db.prepare('SELECT quantity FROM stock WHERE id = ?').get(1)).quantity, 10);
    await db.transaction(async () => {
      await db.prepare('UPDATE stock SET quantity = quantity - ? WHERE id = ?').run(2, 1);
      await db.prepare('INSERT INTO stock VALUES (?, ?)').run(2, 3);
    });
    assert.deepEqual((await db.prepare('SELECT quantity FROM stock ORDER BY id').all()).map((row) => row.quantity), [8, 3]);
  } finally {
    db.close();
  }
});
