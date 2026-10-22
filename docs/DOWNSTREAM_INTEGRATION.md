# Campus Hub integration

Local base: `http://localhost:3001/api`. Hosted base: `https://farmers-agroconnect.onrender.com/api`. Check [INTEGRATION_LOG.MD](../INTEGRATION_LOG.MD) for deployment gaps before using newly added routes on the hosted service. [openapi.yaml](../openapi.yaml) is the contract; HTTP tests validate actual response payloads against it.

ENDPOINT_LIST.md, CONTRACT_QUESTIONS.md and CONTRACT_DEVIATIONS.md are preserved unchanged at the owner's request and can contain historical information. In particular, `/api/messages` is not implemented in the current server.

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

Check HTTP status and `message`; validation may include `fields`. Messages vary, so do not branch on exact text. JSON writes require an object and `Content-Type: application/json`. Missing/malformed bodies return 400, unsupported media types 415, oversized bodies 413, validation 422, missing/invalid JWT 401, and permission failures 403. DELETE success is 204 with no body. Native database timestamps use UTC `YYYY-MM-DD HH:mm:ss`; interpret them explicitly as UTC. Consultation `date` uses ISO UTC; SkillBridge availability has an unconfirmed timezone.

Render's free service can be slow to wake. Allow for initial read delays and bounded safe GET retries. Never blindly retry order or consultation creation. Use IDs from current lists rather than assuming demo ID 1 exists. New hosted databases can be empty. Backend environment files are not loaded automatically. See [deployment instructions](DEPLOYMENT.md).
