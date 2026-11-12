import { Router } from 'express';

const positiveId = (value) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
const text = (value) => typeof value === 'string' ? value.trim() : '';

function toProductV2(product) {
  const { title, quantity, ...fields } = product;
  return { ...fields, name: title, stock: product.stock ?? quantity };
}

export function createProductsV2Router({ db, listingSelect }) {
  const router = Router();

  router.param('id', (req, res, next, id) => {
    if (!positiveId(id)) return res.status(400).json({ message: 'Use a positive integer resource ID.' });
    return next();
  });

  router.get('/products', async (req, res) => {
    const search = text(req.query.search);
    const county = text(req.query.county);
    const category = text(req.query.category);
    const kind = text(req.query.kind);
    let sql = `${listingSelect('products', 'stock', ', products.kind, products.stock AS stock')} WHERE 1 = 1`;
    const parameters = [];
    if (['input', 'service'].includes(kind)) {
      sql += ' AND products.kind = ?';
      parameters.push(kind);
    }
    if (search) {
      sql += ' AND (products.title LIKE ? OR products.description LIKE ?)';
      parameters.push(`%${search}%`, `%${search}%`);
    }
    if (county) {
      sql += ' AND products.county = ?';
      parameters.push(county);
    }
    if (category) {
      sql += ' AND products.category = ?';
      parameters.push(category);
    }
    sql += ' ORDER BY products.kind, products.created_at DESC';
    const rows = await db.prepare(sql).all(...parameters);
    const data = rows.map(toProductV2);
    return res.json({ data, count: data.length });
  });

  router.get('/products/:id/inventory', async (req, res) => {
    const product = await db.prepare(`
      SELECT id, title, stock, unit, updated_at AS lastUpdated
      FROM products WHERE id = ?
    `).get(req.params.id);
    if (!product) return res.status(404).json({ message: 'This listing no longer exists.' });
    res.set('Cache-Control', 'no-store');
    const { title, ...fields } = product;
    return res.json({ data: { ...fields, name: title, inStock: product.stock > 0 } });
  });

  router.get('/products/:id', async (req, res) => {
    const product = await db.prepare(`${listingSelect('products', 'stock', ', products.kind, products.stock AS stock')} WHERE products.id = ?`).get(req.params.id);
    if (!product) return res.status(404).json({ message: 'This listing no longer exists.' });
    return res.json({ data: toProductV2(product) });
  });

  return router;
}
