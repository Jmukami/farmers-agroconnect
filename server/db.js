import { createClient } from '@libsql/client';
import { databaseClient } from './database-client.js';
import bcrypt from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.DATABASE_PATH || join(currentDirectory, 'data', 'agroconnect.db');

const remoteUrl = process.env.TURSO_DATABASE_URL;
if (process.env.NODE_ENV === 'production' && (!remoteUrl || !process.env.TURSO_AUTH_TOKEN)) {
  throw new Error('Production requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
}
if (remoteUrl && !/^(libsql|https):\/\//.test(remoteUrl)) {
  throw new Error('TURSO_DATABASE_URL must be a remote libsql:// or https:// URL.');
}
if (remoteUrl && !process.env.TURSO_AUTH_TOKEN) throw new Error('Set TURSO_AUTH_TOKEN for the remote database.');
if (!remoteUrl) mkdirSync(dirname(databasePath), { recursive: true });
const db = databaseClient(createClient({
  url: remoteUrl || pathToFileURL(databasePath).href,
  authToken: remoteUrl ? process.env.TURSO_AUTH_TOKEN : undefined,
  intMode: 'number',
}));

await db.exec('PRAGMA foreign_keys = ON');

await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT NOT NULL,
    county TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('farmer', 'buyer', 'supplier')),
    focus TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('input', 'service')),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    unit TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    county TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS produce_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    unit TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity >= 0),
    county TEXT NOT NULL,
    description TEXT NOT NULL,
    available_from TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL REFERENCES users(id),
    total REAL NOT NULL CHECK(total >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id),
    listing_type TEXT NOT NULL CHECK(listing_type IN ('product', 'produce')),
    listing_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    unit TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    recipient_id INTEGER NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const rowCount = (await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count;

const seedDemoData = process.env.SEED_DEMO_DATA === 'true' || (process.env.SEED_DEMO_DATA !== 'false' && process.env.NODE_ENV !== 'production');

if (rowCount === 0 && seedDemoData) {
  const passwordHash = bcrypt.hashSync('agroconnect', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, phone, county, role, focus, password_hash)
    VALUES (@fullName, @email, @phone, @county, @role, @focus, @passwordHash)
  `);
  const insertProduct = db.prepare(`
    INSERT INTO products (owner_id, kind, title, category, price, unit, stock, county, description)
    VALUES (@ownerId, @kind, @title, @category, @price, @unit, @stock, @county, @description)
  `);
  const insertProduce = db.prepare(`
    INSERT INTO produce_listings (owner_id, title, category, price, unit, quantity, county, description, available_from)
    VALUES (@ownerId, @title, @category, @price, @unit, @quantity, @county, @description, @availableFrom)
  `);

  await db.transaction(async () => {
    // Recheck under the write lock so concurrent startups cannot seed twice.
    if ((await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count !== 0) return;
    const farmerId = (await insertUser.run({
      fullName: 'Grace Wanjiku', email: 'grace@agroconnect.local', phone: '0712 555 818',
      county: 'Nakuru', role: 'farmer', focus: 'Maize and horticulture', passwordHash,
    })).lastInsertRowid;
    const farmerTwoId = (await insertUser.run({
      fullName: 'Peter Otieno', email: 'peter@agroconnect.local', phone: '0722 610 445',
      county: 'Kisumu', role: 'farmer', focus: 'Rice and poultry', passwordHash,
    })).lastInsertRowid;
    const supplierId = (await insertUser.run({
      fullName: 'Rift Farm Supplies', email: 'rift@agroconnect.local', phone: '0708 312 908',
      county: 'Nakuru', role: 'supplier', focus: 'Inputs and animal health', passwordHash,
    })).lastInsertRowid;
    const servicesId = (await insertUser.run({
      fullName: 'VetCare Kenya', email: 'vetcare@agroconnect.local', phone: '0790 214 206',
      county: 'Kiambu', role: 'supplier', focus: 'Veterinary services', passwordHash,
    })).lastInsertRowid;

    for (const product of [
      { ownerId: supplierId, kind: 'input', title: 'Hybrid maize seed', category: 'Seeds', price: 450, unit: 'kg', stock: 75, county: 'Nakuru', description: 'Drought-tolerant maize seed suited to mid-altitude regions.' },
      { ownerId: supplierId, kind: 'input', title: 'Organic fertiliser', category: 'Fertiliser', price: 1200, unit: '50 kg bag', stock: 32, county: 'Nakuru', description: 'Composted soil conditioner for vegetables, cereals and fruit trees.' },
      { ownerId: supplierId, kind: 'input', title: 'Drip irrigation kit', category: 'Irrigation', price: 4500, unit: 'set', stock: 9, county: 'Nakuru', description: 'Starter kit for a quarter-acre vegetable plot.' },
      { ownerId: supplierId, kind: 'input', title: 'Poultry feed concentrate', category: 'Animal feed', price: 1850, unit: '25 kg bag', stock: 41, county: 'Nakuru', description: 'High-protein concentrate for layers and broilers.' },
      { ownerId: servicesId, kind: 'service', title: 'Livestock health visit', category: 'Veterinary', price: 2500, unit: 'visit', stock: 12, county: 'Kiambu', description: 'On-farm animal examination and treatment guidance.' },
      { ownerId: servicesId, kind: 'service', title: 'Soil testing service', category: 'Advisory', price: 1800, unit: 'sample', stock: 25, county: 'Kiambu', description: 'Soil nutrient analysis with a practical fertiliser recommendation.' },
    ]) await insertProduct.run(product);

    for (const listing of [
      { ownerId: farmerId, title: 'Fresh tomatoes', category: 'Vegetables', price: 85, unit: 'kg', quantity: 320, county: 'Nakuru', description: 'Firm, graded field tomatoes. Available for pickup or arranged delivery.', availableFrom: 'Available now' },
      { ownerId: farmerId, title: 'Dry maize', category: 'Cereals', price: 58, unit: 'kg', quantity: 1250, county: 'Nakuru', description: 'Clean, sun-dried maize stored after the current harvest.', availableFrom: 'Available now' },
      { ownerId: farmerTwoId, title: 'Table eggs', category: 'Livestock products', price: 420, unit: 'tray', quantity: 80, county: 'Kisumu', description: 'Freshly collected brown eggs from a small free-range flock.', availableFrom: 'Available now' },
      { ownerId: farmerTwoId, title: 'Paddy rice', category: 'Cereals', price: 72, unit: 'kg', quantity: 600, county: 'Kisumu', description: 'Locally grown paddy rice sold in bulk quantities.', availableFrom: 'September 2026' },
    ]) await insertProduce.run(listing);
  });
}

// Backfill existing orders once, preserving their historical shared status.
await db.transaction(async () => {
  await db.exec(`CREATE TABLE IF NOT EXISTS order_sellers (
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
    PRIMARY KEY (order_id, seller_id)
  )`);
  await db.exec(`INSERT OR IGNORE INTO order_sellers (order_id, seller_id, status)
    SELECT DISTINCT orders.id, order_items.seller_id, orders.status
    FROM orders JOIN order_items ON order_items.order_id = orders.id`);
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS farm_locations (
    farmer_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sub_county TEXT NOT NULL,
    farm_location TEXT NOT NULL,
    landmarks TEXT NOT NULL DEFAULT '',
    visit_instructions TEXT NOT NULL DEFAULT '',
    farm_size_acres REAL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expert_id INTEGER NOT NULL,
    expert_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    appointment_at TEXT NOT NULL,
    submission_state TEXT NOT NULL CHECK(submission_state IN ('submitting', 'submitted', 'unknown', 'rejected')),
    partner_request_id INTEGER,
    partner_status TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, expert_id, appointment_at)
  );
`);

export default db;
