import { Router } from 'express';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const positiveId = (value) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));

export function createProductsV1Router({ db, listingSelect }) {
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
    return res.json({ listings: await db.prepare(sql).all(...parameters) });
  });

  router.get('/products/:id/inventory', async (req, res) => {
    const product = await db.prepare('SELECT id, title, stock, unit, updated_at AS lastUpdated FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ message: 'This listing no longer exists.' });
    res.set('Cache-Control', 'no-store');
    return res.json({ ...product, inStock: product.stock > 0 });
  });

  router.get('/products/:id', async (req, res) => {
    const product = await db.prepare(`${listingSelect('products', 'stock', ', products.kind, products.stock AS stock')} WHERE products.id = ?`).get(req.params.id);
    if (!product) return res.status(404).json({ message: 'This listing no longer exists.' });
    return res.json({ listing: product });
  });

  return router;
}
