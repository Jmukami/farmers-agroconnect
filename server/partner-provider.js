import { Router } from 'express';

export function createPartnerProviderRouter({ db, authenticate, listingSelect }) {
  const router = Router();
  router.param('id', (_req, res, next, id) => {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return res.status(400).json({ message: 'Use a positive integer resource ID.' });
    next();
  });
  const locationSelect = `SELECT users.id AS farmerId, users.full_name AS farmerName, users.county, users.phone AS visitContactPhone,
    farm_locations.sub_county AS subCounty, farm_locations.farm_location AS farmLocation, farm_locations.landmarks,
    farm_locations.visit_instructions AS visitInstructions, farm_locations.farm_size_acres AS farmSizeAcres,
    farm_locations.updated_at AS updatedAt FROM users JOIN farm_locations ON farm_locations.farmer_id = users.id
    WHERE users.id = ? AND users.role = 'farmer'`;
  router.get('/farmers/:id/farm-location', async (req, res) => {
    const location = await db.prepare(locationSelect).get(req.params.id);
    if (!location) return res.status(404).json({ message: 'Farm location is not available. The farmer may not have published one.' });
    return res.json(location);
  });
  router.put('/farmers/:id/farm-location', authenticate, async (req, res) => {
    if (req.user.role !== 'farmer' || req.user.id !== Number(req.params.id)) return res.status(403).json({ message: 'You can only publish your own farm location using a farmer account.' });
    const text = (key) => typeof req.body[key] === 'string' ? req.body[key].trim() : '';
    const subCounty = text('subCounty');
    const farmLocation = text('farmLocation');
    const landmarks = text('landmarks');
    const visitInstructions = text('visitInstructions');
    const size = req.body.farmSizeAcres ?? null;
    if (subCounty.length < 2 || farmLocation.length < 3 || [subCounty, farmLocation, landmarks, visitInstructions].some((s) => s.length > 1000) || (size !== null && (!Number.isFinite(size) || size <= 0))) return res.status(422).json({ message: 'Provide subCounty, farmLocation and, optionally, a positive numeric farmSizeAcres. Text fields may contain up to 1000 characters.' });
    await db.prepare(`INSERT INTO farm_locations (farmer_id, sub_county, farm_location, landmarks, visit_instructions, farm_size_acres)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(farmer_id) DO UPDATE SET sub_county = excluded.sub_county, farm_location = excluded.farm_location,
      landmarks = excluded.landmarks, visit_instructions = excluded.visit_instructions, farm_size_acres = excluded.farm_size_acres, updated_at = CURRENT_TIMESTAMP`).run(req.user.id, subCounty, farmLocation, landmarks, visitInstructions, size);
    return res.json(await db.prepare(locationSelect).get(req.user.id));
  });
  for (const [path, table, quantityColumn, extra, legacyKey] of [
    ['products', 'products', 'stock', ', products.kind, products.stock AS stock', 'product'],
    ['produce', 'produce_listings', 'quantity', ', produce_listings.available_from AS availableFrom', 'produce'],
  ]) {
    async function detail(req, res, key) {
      const listing = await db.prepare(`${listingSelect(table, quantityColumn, extra)} WHERE ${table}.id = ?`).get(req.params.id);
      if (!listing) return res.status(404).json({ message: 'This listing no longer exists.' });
      return res.json({ [key]: listing });
    }
    router.get(`/${path}/:id`, (req, res) => detail(req, res, 'listing'));
    router.get(`/${path}/:id/detail`, (req, res) => detail(req, res, legacyKey));
  }
  router.get('/products/:id/inventory', async (req, res) => {
    const item = await db.prepare('SELECT id, title, stock, unit, updated_at AS lastUpdated FROM products WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ message: 'This listing no longer exists.' });
    res.set('Cache-Control', 'no-store');
    return res.json({ ...item, inStock: item.stock > 0 });
  });
  return router;
}
