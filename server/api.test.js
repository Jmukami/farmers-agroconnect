import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

test('API validation, atomic stock handling, seller isolation and migration', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agro-test-'));
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  let child;
  const start = async () => {
    child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATABASE_PATH: join(directory, 'test.db'), JWT_SECRET: 'isolated-test-secret' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      child.once('error', reject);
      child.stderr.on('data', (data) => { clearTimeout(timer); reject(new Error(String(data))); });
      child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    });
  };
  const stop = () => new Promise((resolve) => { child.once('exit', resolve); child.kill(); });
  const request = async (path, method = 'GET', body, token, raw = false, contentType = 'application/json') => {
    const response = await fetch(`http://127.0.0.1:${port}/api${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': contentType } : {}) }, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  };
  try {
    await start();
    const login = async (email) => (await request('/auth/login', 'POST', { email, password: 'agroconnect' })).data.token;
    const farmer = await login('grace@agroconnect.local');
    const supplier = await login('rift@agroconnect.local');
    const outsider = await login('vetcare@agroconnect.local');
    const buyer = (await request('/auth/register', 'POST', { fullName: 'Test Buyer', email: 'test@example.com', phone: '0712345678', county: 'Nairobi', role: 'buyer', password: 'test-password' })).data.token;
    for (const path of ['/health', '/farmers', '/farmers/1', '/produce?search=tomatoes', '/products?kind=input&search=Hybrid', '/auth/me']) {
      assert.equal((await request(path, 'GET', undefined, buyer)).status, 200);
    }
    assert.equal((await request('/auth/me')).status, 401);
    assert.equal((await request('/auth/login', 'POST', { email: 'grace@agroconnect.local', password: {} })).status, 401);
    for (const path of ['/auth/register', '/auth/login', '/produce', '/products', '/orders', '/orders/1/status']) {
      const method = path.endsWith('/status') ? 'PATCH' : 'POST';
      assert.equal((await request(path, method, undefined, buyer)).status, 400);
      assert.equal((await request(path, method, 'text', buyer, true, 'text/plain')).status, 415);
      assert.equal((await request(path, method, '{', buyer, true)).status, 400);
      assert.equal((await request(path, method, 'x'.repeat(103000), buyer, true)).status, 413);
    }
    for (const item of [null, {}, { id: 1, type: 'seed', quantity: 1 }, { id: '1', type: 'produce', quantity: 1 }, { id: 1, type: 'produce', quantity: '1' }, { id: 1, type: 'produce', quantity: 0 }]) {
      assert.equal((await request('/orders', 'POST', { items: [item] }, buyer)).status, 422);
    }
    const stock = async () => (await request('/produce')).data.listings.find((item) => item.id === 1).quantity;
    const before = await stock();
    assert.equal((await request('/orders', 'POST', { items: [{ id: 1, type: 'produce', quantity: before }, { id: 1, type: 'produce', quantity: 1 }] }, buyer)).status, 409);
    assert.equal(await stock(), before);
    assert.equal((await request('/orders', 'GET', undefined, buyer)).data.orders.length, 0);
    assert.equal((await request('/orders', 'POST', { items: [{ id: 1, type: 'produce', quantity: 1 }] }, farmer)).status, 422);
    const listing = { title: 'Test carrots', category: 'Vegetables', price: 90, unit: 'kg', quantity: 20, county: 'Nakuru', description: 'Fresh carrots for collection.' };
    for (const invalid of [{ price: '90' }, { quantity: '20' }, { price: null }, { quantity: false }]) {
      assert.equal((await request('/produce', 'POST', { ...listing, ...invalid }, farmer)).status, 422);
    }
    const created = await request('/produce', 'POST', listing, farmer);
    assert.equal(created.status, 201);
    assert.equal((await request(`/produce/${created.data.listing.id}`, 'PUT', listing, farmer)).status, 200);
    assert.equal((await request(`/produce/${created.data.listing.id}`, 'DELETE', undefined, farmer)).status, 204);
    const product = await request('/products', 'POST', { ...listing, kind: 'input' }, supplier);
    assert.equal(product.status, 201);
    assert.equal((await request(`/products/${product.data.listing.id}`, 'PUT', { ...listing, kind: 'service' }, supplier)).status, 200);
    assert.equal((await request(`/products/${product.data.listing.id}`, 'DELETE', undefined, supplier)).status, 204);
    const placed = await request('/orders', 'POST', { items: [{ id: 1, type: 'produce', quantity: 1 }, { id: 1, type: 'produce', quantity: 1 }, { id: 1, type: 'product', quantity: 1 }] }, buyer);
    assert.equal(placed.status, 201);
    assert.equal(placed.data.order.total, 620);
    assert.equal(await stock(), before - 2);
    const id = placed.data.order.id;
    const orders = async (token) => (await request('/orders', 'GET', undefined, token)).data.orders;
    assert.equal((await orders(farmer))[0].total, 170);
    assert.equal((await orders(farmer))[0].items.length, 1);
    assert.equal((await orders(supplier))[0].total, 450);
    assert.equal((await orders(buyer))[0].items.length, 2);
    assert.equal((await orders(outsider)).length, 0);
    const patch = (token, status) => request(`/orders/${id}/status`, 'PATCH', { status }, token);
    assert.equal((await patch(outsider, 'cancelled')).status, 403);
    assert.equal((await patch(farmer, 'fulfilled')).status, 409);
    assert.equal((await patch(farmer, 'confirmed')).status, 200);
    assert.equal((await orders(supplier))[0].status, 'pending');
    assert.equal((await patch(buyer, 'cancelled')).status, 403);
    assert.equal((await patch(farmer, 'fulfilled')).status, 200);
    assert.equal((await patch(supplier, 'cancelled')).status, 200);
    assert.equal((await orders(buyer))[0].status, 'fulfilled');
    assert.equal((await patch(supplier, 'confirmed')).status, 409);
    const cancellable = await request('/orders', 'POST', { items: [{ id: 1, type: 'produce', quantity: 1 }, { id: 1, type: 'product', quantity: 1 }] }, buyer);
    assert.equal((await request(`/orders/${cancellable.data.order.id}/status`, 'PATCH', { status: 'cancelled' }, buyer)).status, 200);
    await stop();
    await start();
    const persisted = (await orders(buyer)).find((order) => order.id === id);
    assert.deepEqual(persisted.sellers.map((portion) => portion.status).sort(), ['cancelled', 'fulfilled']);
    await stop();
    // Simulate a database made before the seller-status migration.
    const { default: Database } = await import('better-sqlite3');
    const legacy = new Database(join(directory, 'test.db'));
    legacy.exec('DROP TABLE order_sellers');
    legacy.close();
    await start();
    const migrated = (await orders(buyer)).find((order) => order.id === id);
    assert.equal(migrated.sellers.length, 2);
    assert.ok(migrated.sellers.every((portion) => portion.status === 'fulfilled'));
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) await stop();
    rmSync(directory, { recursive: true, force: true });
  }
});
