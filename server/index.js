import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const app = express();
const port = process.env.PORT || 3001;
const jwtSecret = process.env.JWT_SECRET || 'agroconnect-school-project-local-secret';

app.use(cors());
app.use(express.json({ limit: '100kb' }));

const publicUserFields = 'id, full_name AS fullName, email, phone, county, role, focus, created_at AS createdAt';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sendError(res, status, message, fields) {
  return res.status(status).json({ message, fields });
}

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return sendError(res, 401, 'Sign in to continue.');

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare(`SELECT ${publicUserFields} FROM users WHERE id = ?`).get(payload.id);
    if (!user) return sendError(res, 401, 'Your session is no longer valid. Please sign in again.');
    req.user = user;
    return next();
  } catch {
    return sendError(res, 401, 'Your session has expired. Please sign in again.');
  }
}

function validateRegistration(body) {
  const data = {
    fullName: cleanText(body.fullName),
    email: cleanText(body.email).toLowerCase(),
    phone: cleanText(body.phone),
    county: cleanText(body.county),
    role: cleanText(body.role),
    focus: cleanText(body.focus),
    password: body.password || '',
  };
  const fields = {};
  if (data.fullName.length < 2) fields.fullName = 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(data.email)) fields.email = 'Enter a valid email address.';
  if (data.phone.replace(/\D/g, '').length < 9) fields.phone = 'Enter a valid phone number.';
  if (data.county.length < 2) fields.county = 'Enter your county.';
  if (!['farmer', 'buyer', 'supplier'].includes(data.role)) fields.role = 'Choose how you will use AgroConnect.';
  if (data.password.length < 8) fields.password = 'Use at least 8 characters.';
  return { data, fields };
}

function listingSelect(table, quantityColumn, extraFields = '') {
  return `
    SELECT ${table}.id, ${table}.owner_id AS ownerId, ${table}.title, ${table}.category,
      ${table}.price, ${table}.unit, ${table}.${quantityColumn} AS quantity, ${table}.county,
      ${table}.description, ${table}.created_at AS createdAt, ${table}.updated_at AS updatedAt,
      users.full_name AS sellerName, users.phone AS sellerPhone, users.role AS sellerRole${extraFields}
    FROM ${table}
    JOIN users ON users.id = ${table}.owner_id
  `;
}

function parseListing(body, type) {
  const data = {
    title: cleanText(body.title), category: cleanText(body.category), unit: cleanText(body.unit),
    county: cleanText(body.county), description: cleanText(body.description),
    price: Number(body.price), quantity: Number(body.quantity),
  };
  if (type === 'produce') data.availableFrom = cleanText(body.availableFrom);
  const fields = {};
  if (data.title.length < 2) fields.title = 'Enter a clear listing name.';
  if (data.category.length < 2) fields.category = 'Choose a category.';
  if (!Number.isFinite(data.price) || data.price < 0) fields.price = 'Enter a valid price.';
  if (data.unit.length < 1) fields.unit = 'Enter the price unit, e.g. kg or bag.';
  if (!Number.isInteger(data.quantity) || data.quantity < 0) fields.quantity = 'Enter a whole number that is zero or more.';
  if (data.county.length < 2) fields.county = 'Enter the listing county.';
  if (data.description.length < 12) fields.description = 'Add at least 12 characters so people understand the listing.';
  return { data, fields };
}

function ownerOrNotFound(req, res, table, id) {
  const listing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!listing) {
    sendError(res, 404, 'This listing no longer exists.');
    return null;
  }
  if (listing.owner_id !== req.user.id) {
    sendError(res, 403, 'You can only manage your own listings.');
    return null;
  }
  return listing;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', (req, res) => {
  const { data, fields } = validateRegistration(req.body);
  if (Object.keys(fields).length) return sendError(res, 422, 'Please correct the highlighted fields.', fields);
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)) {
    return sendError(res, 409, 'An account with this email already exists.', { email: 'Try signing in instead.' });
  }

  const result = db.prepare(`
    INSERT INTO users (full_name, email, phone, county, role, focus, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.fullName, data.email, data.phone, data.county, data.role, data.focus, bcrypt.hashSync(data.password, 10));
  const user = db.prepare(`SELECT ${publicUserFields} FROM users WHERE id = ?`).get(result.lastInsertRowid);
  return res.status(201).json({ user, token: makeToken(user) });
});

app.post('/api/auth/login', (req, res) => {
  const email = cleanText(req.body.email).toLowerCase();
  const password = req.body.password || '';
  const account = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!account || !bcrypt.compareSync(password, account.password_hash)) {
    return sendError(res, 401, 'Email or password is incorrect.');
  }
  const user = db.prepare(`SELECT ${publicUserFields} FROM users WHERE id = ?`).get(account.id);
  return res.json({ user, token: makeToken(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

app.get('/api/farmers', (_req, res) => {
  const farmers = db.prepare(`
    SELECT id, full_name AS fullName, phone, county, focus, created_at AS createdAt
    FROM users WHERE role = 'farmer' ORDER BY full_name
  `).all();
  res.json({ farmers });
});

app.get('/api/farmers/:id', (req, res) => {
  const farmer = db.prepare(`
    SELECT id, full_name AS fullName, phone, county, focus, created_at AS createdAt
    FROM users WHERE id = ? AND role = 'farmer'
  `).get(req.params.id);
  if (!farmer) return sendError(res, 404, 'This farmer could not be found.');
  return res.json({ farmer });
});

app.get('/api/produce', (req, res) => {
  const search = cleanText(req.query.search);
  const county = cleanText(req.query.county);
  const category = cleanText(req.query.category);
  let sql = `${listingSelect('produce_listings', 'quantity', ', produce_listings.available_from AS availableFrom')} WHERE 1 = 1`;
  const parameters = [];
  if (search) { sql += ' AND (produce_listings.title LIKE ? OR produce_listings.description LIKE ?)'; parameters.push(`%${search}%`, `%${search}%`); }
  if (county) { sql += ' AND produce_listings.county = ?'; parameters.push(county); }
  if (category) { sql += ' AND produce_listings.category = ?'; parameters.push(category); }
  sql += ' ORDER BY produce_listings.created_at DESC';
  res.json({ listings: db.prepare(sql).all(...parameters) });
});

app.post('/api/produce', authenticate, (req, res) => {
  if (req.user.role !== 'farmer') return sendError(res, 403, 'Only farmer accounts can post produce listings.');
  const { data, fields } = parseListing(req.body, 'produce');
  if (Object.keys(fields).length) return sendError(res, 422, 'Please correct the highlighted fields.', fields);
  const result = db.prepare(`
    INSERT INTO produce_listings (owner_id, title, category, price, unit, quantity, county, description, available_from)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, data.title, data.category, data.price, data.unit, data.quantity, data.county, data.description, data.availableFrom);
  const listing = db.prepare(`${listingSelect('produce_listings', 'quantity', ', produce_listings.available_from AS availableFrom')} WHERE produce_listings.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ listing });
});

app.put('/api/produce/:id', authenticate, (req, res) => {
  if (!ownerOrNotFound(req, res, 'produce_listings', req.params.id)) return;
  const { data, fields } = parseListing(req.body, 'produce');
  if (Object.keys(fields).length) return sendError(res, 422, 'Please correct the highlighted fields.', fields);
  db.prepare(`UPDATE produce_listings SET title = ?, category = ?, price = ?, unit = ?, quantity = ?, county = ?, description = ?, available_from = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(data.title, data.category, data.price, data.unit, data.quantity, data.county, data.description, data.availableFrom, req.params.id);
  const listing = db.prepare(`${listingSelect('produce_listings', 'quantity', ', produce_listings.available_from AS availableFrom')} WHERE produce_listings.id = ?`).get(req.params.id);
  res.json({ listing });
});

app.delete('/api/produce/:id', authenticate, (req, res) => {
  if (!ownerOrNotFound(req, res, 'produce_listings', req.params.id)) return;
  db.prepare('DELETE FROM produce_listings WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/products', (req, res) => {
  const search = cleanText(req.query.search);
  const county = cleanText(req.query.county);
  const category = cleanText(req.query.category);
  const kind = cleanText(req.query.kind);
  let sql = `${listingSelect('products', 'stock', ', products.kind')} WHERE 1 = 1`;
  const parameters = [];
  if (['input', 'service'].includes(kind)) { sql += ' AND products.kind = ?'; parameters.push(kind); }
  if (search) { sql += ' AND (products.title LIKE ? OR products.description LIKE ?)'; parameters.push(`%${search}%`, `%${search}%`); }
  if (county) { sql += ' AND products.county = ?'; parameters.push(county); }
  if (category) { sql += ' AND products.category = ?'; parameters.push(category); }
  sql += ' ORDER BY products.kind, products.created_at DESC';
  res.json({ listings: db.prepare(sql).all(...parameters) });
});

app.post('/api/products', authenticate, (req, res) => {
  if (req.user.role !== 'supplier') return sendError(res, 403, 'Only supplier accounts can post inputs and services.');
  const kind = cleanText(req.body.kind);
  if (!['input', 'service'].includes(kind)) return sendError(res, 422, 'Choose whether this is an input or service.', { kind: 'Choose a listing type.' });
  const { data, fields } = parseListing(req.body, 'product');
  if (Object.keys(fields).length) return sendError(res, 422, 'Please correct the highlighted fields.', fields);
  const result = db.prepare(`
    INSERT INTO products (owner_id, kind, title, category, price, unit, stock, county, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, kind, data.title, data.category, data.price, data.unit, data.quantity, data.county, data.description);
  const listing = db.prepare(`${listingSelect('products', 'stock', ', products.kind')} WHERE products.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ listing });
});

app.put('/api/products/:id', authenticate, (req, res) => {
  if (!ownerOrNotFound(req, res, 'products', req.params.id)) return;
  const kind = cleanText(req.body.kind);
  if (!['input', 'service'].includes(kind)) return sendError(res, 422, 'Choose whether this is an input or service.', { kind: 'Choose a listing type.' });
  const { data, fields } = parseListing(req.body, 'product');
  if (Object.keys(fields).length) return sendError(res, 422, 'Please correct the highlighted fields.', fields);
  db.prepare(`UPDATE products SET kind = ?, title = ?, category = ?, price = ?, unit = ?, stock = ?, county = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(kind, data.title, data.category, data.price, data.unit, data.quantity, data.county, data.description, req.params.id);
  const listing = db.prepare(`${listingSelect('products', 'stock', ', products.kind')} WHERE products.id = ?`).get(req.params.id);
  res.json({ listing });
});

app.delete('/api/products/:id', authenticate, (req, res) => {
  if (!ownerOrNotFound(req, res, 'products', req.params.id)) return;
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.post('/api/orders', authenticate, (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return sendError(res, 422, 'Add at least one item before placing an order.');
  if (items.length > 25) return sendError(res, 422, 'An order can contain up to 25 line items.');

  const resolvedItems = [];
  for (const item of items) {
    const listingType = item.type === 'produce' ? 'produce' : 'product';
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return sendError(res, 422, 'Every item needs a valid quantity.');
    const table = listingType === 'produce' ? 'produce_listings' : 'products';
    const countColumn = listingType === 'produce' ? 'quantity' : 'stock';
    const listing = db.prepare(`SELECT id, owner_id, title, unit, price, ${countColumn} AS available FROM ${table} WHERE id = ?`).get(item.id);
    if (!listing || listing.available < quantity) return sendError(res, 409, `One or more items are no longer available in the requested quantity.`);
    if (listing.owner_id === req.user.id) return sendError(res, 422, 'You cannot order your own listing.');
    resolvedItems.push({ ...listing, listingType, quantity });
  }

  const createOrder = db.transaction(() => {
    const total = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = db.prepare('INSERT INTO orders (buyer_id, total) VALUES (?, ?)').run(req.user.id, total);
    const insertItem = db.prepare(`INSERT INTO order_items (order_id, seller_id, listing_type, listing_id, title, unit, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of resolvedItems) {
      insertItem.run(order.lastInsertRowid, item.owner_id, item.listingType, item.id, item.title, item.unit, item.price, item.quantity);
      const table = item.listingType === 'produce' ? 'produce_listings' : 'products';
      const countColumn = item.listingType === 'produce' ? 'quantity' : 'stock';
      db.prepare(`UPDATE ${table} SET ${countColumn} = ${countColumn} - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(item.quantity, item.id);
    }
    return order.lastInsertRowid;
  });

  const orderId = createOrder();
  const order = db.prepare('SELECT id, total, status, created_at AS createdAt FROM orders WHERE id = ?').get(orderId);
  res.status(201).json({ order });
});

app.get('/api/orders', authenticate, (req, res) => {
  const orders = db.prepare(`
    SELECT DISTINCT orders.id, orders.buyer_id AS buyerId, orders.total, orders.status, orders.created_at AS createdAt,
      buyer.full_name AS buyerName, buyer.phone AS buyerPhone
    FROM orders
    JOIN users buyer ON buyer.id = orders.buyer_id
    LEFT JOIN order_items ON order_items.order_id = orders.id
    WHERE orders.buyer_id = ? OR order_items.seller_id = ?
    ORDER BY orders.created_at DESC
  `).all(req.user.id, req.user.id);
  const findItems = db.prepare(`
    SELECT order_items.id, order_items.title, order_items.unit, order_items.price, order_items.quantity,
      order_items.seller_id AS sellerId, seller.full_name AS sellerName
    FROM order_items JOIN users seller ON seller.id = order_items.seller_id WHERE order_id = ?
  `);
  res.json({ orders: orders.map((order) => ({ ...order, items: findItems.all(order.id) })) });
});

app.patch('/api/orders/:id/status', authenticate, (req, res) => {
  const status = cleanText(req.body.status);
  if (!['confirmed', 'fulfilled', 'cancelled'].includes(status)) return sendError(res, 422, 'Choose a valid order status.');
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return sendError(res, 404, 'This order no longer exists.');
  const isSeller = db.prepare('SELECT 1 FROM order_items WHERE order_id = ? AND seller_id = ?').get(order.id, req.user.id);
  const canCancel = status === 'cancelled' && order.buyer_id === req.user.id && order.status === 'pending';
  if (!isSeller && !canCancel) return sendError(res, 403, 'You cannot change this order status.');
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
  res.json({ status });
});

app.get('/api/messages', authenticate, (req, res) => {
  const messages = db.prepare(`
    SELECT messages.id, messages.subject, messages.body, messages.created_at AS createdAt,
      messages.sender_id AS senderId, messages.recipient_id AS recipientId,
      sender.full_name AS senderName, recipient.full_name AS recipientName
    FROM messages
    JOIN users sender ON sender.id = messages.sender_id
    JOIN users recipient ON recipient.id = messages.recipient_id
    WHERE sender_id = ? OR recipient_id = ? ORDER BY messages.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json({ messages });
});

app.post('/api/messages', authenticate, (req, res) => {
  const recipientId = Number(req.body.recipientId);
  const subject = cleanText(req.body.subject);
  const body = cleanText(req.body.body);
  const fields = {};
  if (!Number.isInteger(recipientId)) fields.recipientId = 'Select a valid recipient.';
  if (subject.length < 3) fields.subject = 'Use a subject of at least 3 characters.';
  if (body.length < 10) fields.body = 'Your message needs at least 10 characters.';
  if (Object.keys(fields).length) return sendError(res, 422, 'Please correct the highlighted fields.', fields);
  if (recipientId === req.user.id) return sendError(res, 422, 'You cannot message yourself.');
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(recipientId)) return sendError(res, 404, 'This seller could not be found.');
  const result = db.prepare('INSERT INTO messages (sender_id, recipient_id, subject, body) VALUES (?, ?, ?, ?)').run(req.user.id, recipientId, subject, body);
  const message = db.prepare('SELECT id, subject, body, created_at AS createdAt FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message });
});

app.use((_req, res) => sendError(res, 404, 'This API route was not found.'));

app.use((error, _req, res, next) => {
  void next;
  console.error(error);
  sendError(res, 500, 'Something went wrong on the server. Please try again.');
});

app.listen(port, () => console.log(`AgroConnect API is running at http://localhost:${port}`));
