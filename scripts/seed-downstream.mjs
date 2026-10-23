import { randomBytes, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Add demo records through the same authenticated API used by consumers.
// Existing locations and listings are preserved, including changed stock.
export async function seedDownstream({ baseUrl, password, refreshPresentation = false }) {
  baseUrl = baseUrl.replace(/\/$/, '');
  if (!password) throw new Error('A demo account password is required.');
  const request = async (path, method = 'GET', body, token) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json();
    return { status: response.status, data };
  };
  const expect = (result, statuses, label) => {
    if (!statuses.includes(result.status)) throw new Error(`${label}: HTTP ${result.status}. ${result.data.message || ''}`);
    return result.data;
  };
  const account = async (slug, fullName, role, county) => {
    const email = `${slug}@downstream-demo.invalid`;
    let result = await request('/auth/login', 'POST', { email, password });
    if (result.status === 401) result = await request('/auth/register', 'POST', {
      email, password, fullName, role, county, phone: '0000000000', focus: role === 'farmer' ? 'Horticulture and mixed farming' : 'Seeds, irrigation and soil advisory',
    });
    const data = expect(result, [200, 201], `Demo account ${slug}`);
    if (data.user.role !== role) throw new Error(`Unexpected demo account role: ${slug}`);
    return data;
  };
  const farmers = [];
  for (const [slug, name, county, subCounty] of [
    ['nakuru-farmer', 'Daniel Kamau', 'Nakuru', 'Naivasha'],
    ['kisumu-farmer', 'Akinyi Ouma', 'Kisumu', 'Nyando'],
  ]) {
    const { user, token } = await account(slug, name, 'farmer', county);
    const path = `/farmers/${user.id}/farm-location`;
    const existing = await request(path);
    if (existing.status === 404 || (refreshPresentation && existing.status === 200 && existing.data.farmLocation.startsWith('DEMO ONLY'))) expect(await request(path, 'PUT', {
      subCounty, farmLocation: county === 'Nakuru' ? 'Mwangaza Farm, Green Valley access road, Naivasha' : 'Nyota Farm, Lower Valley access road, Nyando',
      landmarks: 'Green entrance gate beside the farm water tank',
      visitInstructions: 'Visits by appointment, Monday to Saturday, 9:00 am to 4:00 pm. Please arrange access before arrival.',
      farmSizeAcres: 2.5,
    }, token), [200], 'Publish demo location');
    else expect(existing, [200], 'Read demo location');
    expect(await request(path), [200], 'Verify demo location');
    farmers.push(user.id);
  }
  const { user: supplier, token } = await account('supplier', 'Mavuno Farm Supplies', 'supplier', 'Nakuru');
  const catalog = expect(await request('/products'), [200], 'Read catalogue').listings;
  const products = [];
  for (const fixture of [
    { title: 'Hybrid maize seed', kind: 'input', category: 'Seeds', price: 450, unit: 'kg', quantity: 75, description: 'Hybrid maize seed for mid-altitude growing areas, supplied in sealed packs. Store in a cool, dry place before planting.' },
    { title: 'Drip irrigation kit', kind: 'input', category: 'Irrigation', price: 4500, unit: 'set', quantity: 9, description: 'Quarter-acre drip irrigation starter kit with drip lines, connectors and a filter. Suitable for small vegetable plots.' },
    { title: 'Soil testing service', kind: 'service', category: 'Advisory', price: 1800, unit: 'sample', quantity: 0, description: 'Soil nutrient and pH analysis with a written fertiliser recommendation. New sample appointments are currently fully booked.' },
  ]) {
    let listing = catalog.find((item) => item.ownerId === supplier.id && (item.title === fixture.title || item.title === `DEMO ${fixture.title}`));
    if (!listing) listing = expect(await request('/products', 'POST', {
      ...fixture, county: 'Nakuru',
    }, token), [201], 'Create demo product').listing;
    if (refreshPresentation && listing.title.startsWith('DEMO ')) {
      listing = expect(await request(`/products/${listing.id}`, 'PUT', {
        ...fixture, county: listing.county, quantity: listing.quantity,
      }, token), [200], 'Refresh presentation copy').listing;
    }
    const detail = expect(await request(`/products/${listing.id}`), [200], 'Verify detail').listing;
    const inventory = expect(await request(`/products/${listing.id}/inventory`), [200], 'Verify inventory');
    if (detail.stock !== detail.quantity || inventory.stock !== detail.stock || inventory.inStock !== (detail.stock > 0)) throw new Error('Inventory does not match product detail.');
    products.push(listing.id);
  }
  return { farmers, supplier: supplier.id, products };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const baseUrl = process.argv[2] || 'http://localhost:3001/api';
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Use HTTPS for remote APIs.');
    const key = createHash('sha256').update(baseUrl.replace(/\/$/, '')).digest('hex').slice(0, 12);
    const credentialsPath = resolve(`.downstream-seed-${key}.local`);
    let password;
    if (existsSync(credentialsPath)) password = JSON.parse(readFileSync(credentialsPath, 'utf8')).password;
    else {
      password = randomBytes(32).toString('base64url');
      writeFileSync(credentialsPath, JSON.stringify({ baseUrl, password }), { flag: 'wx', mode: 0o600 });
    }
    console.log(JSON.stringify(await seedDownstream({ baseUrl, password, refreshPresentation: process.argv.includes('--refresh-presentation') }), null, 2));
    console.log(`Demo credentials retained in Git-ignored ${credentialsPath}. Keep this file private for reruns.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
