# Campus Hub integration

Local base: `http://localhost:3001/api`. Hosted base: `https://farmers-agroconnect.onrender.com/api`. [openapi.yaml](../openapi.yaml) is the contract; this guide is the current consumer reference. HTTP tests validate actual response payloads against the contract. OpenAPI server URLs omit `/api` because its paths already include `/api`; do not double the prefix.

ENDPOINT_LIST.md, CONTRACT_QUESTIONS.md, CONTRACT_DEVIATIONS.md and INTEGRATION_LOG.MD are historical snapshots. Their earlier deployment gaps and endpoint proposals are not a current support matrix. In particular, `/api/messages` is not implemented in the current server.

## Presentation data and handoff verification

Hosted verification on **23 October 2026**: demo farmers `4` and `5` have readable published locations; demo supplier `6` owns products `1`, `2`, and `3`. All three product detail and inventory reads succeeded, with matching stock values; product `3` is the zero-stock service. Public list reads returned HTTP 200 and `Access-Control-Allow-Origin: *`. These IDs describe that verification only; discover current IDs from the lists when integrating.

Run the API locally with `npm start`, then in another terminal run:

```sh
node scripts/seed-downstream.mjs
```

To populate the hosted API explicitly:

```sh
node scripts/seed-downstream.mjs https://farmers-agroconnect.onrender.com/api
```

The seeder creates two dedicated sample farmer accounts with published fictional locations, one sample supplier, and three catalogue entries: maize seed, an irrigation kit, and an out-of-stock soil testing service. All use placeholder phone numbers and reserved `.invalid` email addresses.

The script prints the actual farmer and product IDs and verifies location, product detail and inventory reads. It retains a random demo password in a per-target Git-ignored `.downstream-seed-*.local` file; keep that file private and retain it for reruns. No public demo password is added to the contract. Reruns preserve existing demo locations and listings, including changed quantities; they do not reset stock. Use `--refresh-presentation` after the API URL to replace the original DEMO-prefixed product copy and location text while preserving quantities. Account names on older databases require the targeted SQL in `scripts/refresh-presentation-profiles.sql`, because the API has no profile-edit route. Run one seeder at a time. Requests are not automatically retried; after an interrupted run, rerun using the retained credentials to discover records already created.

Before handoff, read `/health`, `/farmers`, and `/products`; use returned IDs to read a demo farmer's `/farm-location`, product detail, and `/inventory`. Confirm inventory `stock` equals product `quantity` and `stock`, and that `inStock` is false for the zero-stock fixture. Check browser CORS from the consumer origin. Successful reads confirm deployment independently of historical logs. Published locations for ordinary farmers can still be absent.

## Public reads

| Need | Route | Success payload |
| --- | --- | --- |
| Farmer directory | `GET /farmers` | `{farmers: [...]}` |
| Farmer profile/contact | `GET /farmers/{id}` | `{farmer: {...}}` |
| Published visit address | `GET /farmers/{id}/farm-location` | FarmLocation object, without wrapper |
| Input/service catalogue | `GET /products?kind=input&county=Nakuru` | `{listings: [...]}` |
| Harvest catalogue | `GET /produce?category=Vegetables` | `{listings: [...]}` |
| Single offering | `GET /products/{id}` | `{listing: {...}}` |
| Single harvest | `GET /produce/{id}` | `{listing: {...}}` |
| Inventory | `GET /products/{id}/inventory` | `{id, title, stock, unit, inStock, lastUpdated}` |

Previously proposed `/products/{id}/detail` and `/produce/{id}/detail` routes also work, returning `{product}` and `{produce}` respectively. Prefer canonical routes above for new integrations.

Product responses expose both `quantity` and `stock`, with equal integer values; writes still use `quantity`. Inventory uses `Cache-Control: no-store`. Reading stock does not reserve it; a later order can return 409. Collections are unpaginated and return empty arrays for no matches. County/category filters are case-sensitive; search matches title/description substrings. IDs are positive safe integers. Invalid IDs return 400, missing resources 404. Public profiles omit password hashes and authentication secrets. Contact discovery does not independently verify identity.

Public farmer/catalogue GET/HEAD reads allow browser origins with `Access-Control-Allow-Origin: *`. Authenticated browser operations still require an exact origin in backend `CORS_ORIGINS` in production. Server-to-server calls do not need CORS. Use HTTPS for hosted calls from HTTPS pages.

## Farm location ownership

A county is not a visit address. The location endpoint returns 404 until the farmer publishes a location. Do not fabricate an address or assume county alone is enough for a visit.

A signed-in farmer publishes or replaces their own location with `PUT /farmers/{their-id}/farm-location`, a Bearer JWT and JSON:

```json
{
  "subCounty": "Naivasha",
  "farmLocation": "Farmer-provided address",
  "landmarks": "Farmer-provided landmark",
  "visitInstructions": "Call before visiting",
  "farmSizeAcres": 2.5
}
```

Only `subCounty` and `farmLocation` are required. Omitted optional text becomes empty strings; omitted acreage becomes null. This is a full replacement. Published details are public; farmers should only submit information they intend to share. Contact phone and county come from the account.

## Error handling and startup

Check HTTP status and `message`; validation may include `fields`. Messages vary, so do not branch on exact text. JSON writes require an object and `Content-Type: application/json`. Missing/malformed bodies return 400, unsupported media types 415, oversized bodies 413, validation 422, missing/invalid JWT 401, and permission failures 403. DELETE success is 204 with no body. Native database timestamps use UTC `YYYY-MM-DD HH:mm:ss`; interpret them explicitly as UTC. Consultation `date` uses ISO UTC; SkillBridge confirmed that availability uses East Africa Time (EAT, UTC+03:00) for both parties. Date/startTime values are EAT wall-clock values; requested appointments are normalized to UTC.

Render's free service can be slow to wake. Allow for initial read delays and bounded safe GET retries. Never blindly retry order or consultation creation. Use IDs from current lists rather than assuming demo ID 1 exists. New hosted databases can be empty. Backend environment files are not loaded automatically. See [deployment instructions](DEPLOYMENT.md).