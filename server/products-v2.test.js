import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { assertContract } from './contract-assertions.js';

test('product v2 reads use the canonical shape while legacy reads stay stable and announce deprecation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agro-products-v2-'));
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const child = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      API_KEYS: 'version-test-key',
      TURSO_DATABASE_URL: '',
      TURSO_AUTH_TOKEN: '',
      SEED_DEMO_DATA: 'true',
      PORT: String(port),
      DATABASE_PATH: join(directory, 'test.db'),
      JWT_SECRET: 'version-test-secret',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += String(chunk); });
  child.stderr.on('data', (chunk) => { output += String(chunk); });
  const stop = () => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  });
  const base = `http://127.0.0.1:${port}`;
  const headers = { 'X-API-Key': 'version-test-key' };
  const read = async (path, extraHeaders = headers) => fetch(`${base}${path}`, { headers: extraHeaders });

  try {
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error(`API startup timed out. ${output}`)), 10000);
      const poll = setInterval(() => {
        if (output.includes('AgroConnect API is running')) {
          clearInterval(poll);
          clearTimeout(deadline);
          resolve();
        } else if (child.exitCode !== null) {
          clearInterval(poll);
          clearTimeout(deadline);
          reject(new Error(`API exited before startup. ${output}`));
        }
      }, 20);
    });

    const legacy = await read('/api/products');
    assert.equal(legacy.status, 200);
    assert.equal(legacy.headers.get('deprecation'), 'true');
    assert.equal(legacy.headers.get('sunset'), 'Wed, 18 Nov 2026 00:00:00 GMT');
    assert.equal(legacy.headers.get('link'), '</api/v2/products>; rel="successor-version"');
    const legacyBody = await legacy.json();
    assertContract('/products', 'GET', 200, legacyBody);
    assert.ok(Array.isArray(legacyBody.listings));
    assert.ok(legacyBody.listings.length > 0);
    const legacyProduct = legacyBody.listings[0];
    assert.equal(legacyProduct.title, 'Hybrid maize seed');
    assert.equal(legacyProduct.quantity, legacyProduct.stock);
    assert.ok(!Object.hasOwn(legacyProduct, 'name'));

    const explicitV1 = await read('/api/v1/products');
    assert.equal(explicitV1.status, 200);
    assert.equal(explicitV1.headers.get('deprecation'), 'true');
    assert.equal(explicitV1.headers.get('sunset'), 'Wed, 18 Nov 2026 00:00:00 GMT');
    assert.equal(explicitV1.headers.get('link'), '</api/v2/products>; rel="successor-version"');
    const explicitV1Body = await explicitV1.json();
    assertContract('/v1/products', 'GET', 200, explicitV1Body);
    assert.deepEqual(explicitV1Body, legacyBody);

    const v2 = await read('/api/v2/products');
    assert.equal(v2.status, 200);
    assert.equal(v2.headers.get('deprecation'), null);
    const v2Body = await v2.json();
    assertContract('/v2/products', 'GET', 200, v2Body);
    assert.equal(v2Body.count, v2Body.data.length);
    const v2Product = v2Body.data.find((item) => item.id === legacyProduct.id);
    assert.ok(v2Product);
    assert.equal(v2Product.name, legacyProduct.title);
    assert.equal(v2Product.stock, legacyProduct.stock);
    assert.ok(!Object.hasOwn(v2Product, 'title'));
    assert.ok(!Object.hasOwn(v2Product, 'quantity'));

    const legacyDetail = await read(`/api/products/${legacyProduct.id}`);
    assert.equal(legacyDetail.headers.get('link'), `</api/v2/products/${legacyProduct.id}>; rel="successor-version"`);
    const explicitV1Detail = await read(`/api/v1/products/${legacyProduct.id}`);
    assert.equal(explicitV1Detail.headers.get('link'), `</api/v2/products/${legacyProduct.id}>; rel="successor-version"`);
    assert.deepEqual(await explicitV1Detail.json(), { listing: legacyProduct });
    const v2Detail = await read(`/api/v2/products/${legacyProduct.id}`);
    assert.equal(v2Detail.status, 200);
    assertContract(`/v2/products/${legacyProduct.id}`, 'GET', 200, await v2Detail.clone().json());
    assert.equal((await v2Detail.json()).data.name, legacyProduct.title);

    const legacyInventory = await read(`/api/products/${legacyProduct.id}/inventory`);
    assert.equal(legacyInventory.headers.get('cache-control'), 'no-store');
    assert.equal(legacyInventory.headers.get('link'), `</api/v2/products/${legacyProduct.id}/inventory>; rel="successor-version"`);
    const explicitV1Inventory = await read(`/api/v1/products/${legacyProduct.id}/inventory`);
    assert.equal(explicitV1Inventory.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await explicitV1Inventory.json(), await (await read(`/api/products/${legacyProduct.id}/inventory`)).json());
    const v2Inventory = await read(`/api/v2/products/${legacyProduct.id}/inventory`);
    assert.equal(v2Inventory.status, 200);
    assert.equal(v2Inventory.headers.get('cache-control'), 'no-store');
    assertContract(`/v2/products/${legacyProduct.id}/inventory`, 'GET', 200, await v2Inventory.clone().json());
    const v2InventoryBody = await v2Inventory.json();
    assert.equal(v2InventoryBody.data.name, legacyProduct.title);
    assert.equal(v2InventoryBody.data.stock, legacyProduct.stock);

    const filtered = await read('/api/v2/products?kind=input&search=Hybrid');
    const filteredBody = await filtered.json();
    assert.equal(filtered.status, 200);
    assertContract('/v2/products?kind=input&search=Hybrid', 'GET', 200, filteredBody);
    assert.ok(filteredBody.data.every((item) => item.kind === 'input' && item.name.includes('Hybrid')));

    const missingKey = await read('/api/v2/products', {});
    assert.equal(missingKey.status, 401);
    assertContract('/v2/products', 'GET', 401, await missingKey.json());
    const invalidId = await read('/api/v2/products/not-an-id');
    assert.equal(invalidId.status, 400);
    assertContract('/v2/products/not-an-id', 'GET', 400, await invalidId.json());
    const missingProduct = await read('/api/v2/products/999999999');
    assert.equal(missingProduct.status, 404);
    assertContract('/v2/products/999999999', 'GET', 404, await missingProduct.json());

    const browserRead = await fetch(`${base}/api/v2/products`, { headers: { ...headers, Origin: 'https://campus-hub.example' } });
    assert.equal(browserRead.headers.get('access-control-allow-origin'), '*');
    await browserRead.arrayBuffer();
  } finally {
    await stop();
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
