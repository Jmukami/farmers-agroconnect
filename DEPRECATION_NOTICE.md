# Deprecation notice: AgroConnect product reads v1

**To:** Campus Hub (Team 7)  
**From:** AgroConnect (Team 6)  
**Date:** 12 November 2026  
**Status:** Scope clarification received 12 November 2026. This product notice does not apply to Campus Hub's stated `/produce` and `/farmers` integration. The proposed date below remains unagreed and applies only to product reads.

## Summary

This draft covers only AgroConnect's product catalogue, product detail, and inventory **read** routes: `/api/products...` and `/api/v1/products...`. Campus Hub has confirmed it calls `/produce` and `/farmers`, not `/products`; those routes are out of scope and require no action under this notice. The product v2 replacements exist locally at `/api/v2/products` and are not deployed. Campus Hub proposed **30 November 2026** for the product v1 sunset and requested no breaking changes from 18 through 20 November. AgroConnect has recorded that proposal, but the date and rollout are not agreed or deployed.

## What is changing

- Product collection responses change from `{ "listings": [...] }` to `{ "data": [...], "count": N }`.
- Product `title` is renamed to `name`.
- Product `quantity` is removed because `stock` already carries the same value. Use `stock` for product inventory.
- Product detail and inventory responses are wrapped in `data` and use `name`.
- Search and filters (`kind`, `search`, `county`, `category`), IDs, values, and the API key requirement stay the same.
- Product create, update, and delete routes are not changed in this rollout. Their request bodies continue to use `title` and `quantity`.

## Before and after

**v1 - `GET /api/products?kind=input`**

```json
{
  "listings": [
    {
      "id": 1,
      "title": "Hybrid maize seed",
      "quantity": 75,
      "stock": 75
    }
  ]
}
```

**v2 - `GET /api/v2/products?kind=input`**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Hybrid maize seed",
      "stock": 75
    }
  ],
  "count": 1
}
```

The examples show only the changed fields; the full property set is in [openapi.yaml](openapi.yaml).

## How to migrate

1. Call `GET /api/v2/products` instead of `GET /api/products` or `GET /api/v1/products`.
2. Read the collection from `body.data`; use `body.count` for its returned row count.
3. Read product names from `name` instead of `title`.
4. Read product inventory from `stock`; remove reliance on the duplicate `quantity` field.
5. For detail, use `GET /api/v2/products/{id}` and read `body.data`.
6. For inventory, use `GET /api/v2/products/{id}/inventory` and read `body.data`.
7. Keep the same `X-API-Key`, filter parameters, and product write routes. Test the migration, then confirm with AgroConnect so we can verify the v2 traffic in `/api/stats`.

## Timeline

- 12 November 2026: v2 contract and handlers prepared locally; v1 remains available.
- Proposed 30 November 2026: product v1 reads may be retired only after scope, migration, and date are agreed. Campus Hub says it does not consume these routes.
- No v1 shutdown is scheduled by this draft. The hosted API must be deployed and the sunset date agreed before the timeline becomes binding.

The local implementation adds `Deprecation`, `Sunset`, and successor `Link` headers to legacy product reads. A hosted unauthenticated probe on 12 November 2026 returned 401 and did **not** include these headers; the response body was `{"message":"A valid X-API-Key header is required."}`. This confirms Render has not deployed the local header change. No authenticated hosted response was captured. No exact post-sunset status/body is committed yet. The current local and hosted product routes continue to respond normally unless a later reviewed deployment changes that behavior.

## Questions

Campus Hub clarified that its `/produce` proxy maps `title` and `quantity`, and `PartnerProduce.jsx` displays both; it does not read those fields from `/products`. Therefore this notice does not require Campus Hub code changes. `/produce` and `/farmers` remain unchanged. The proposed 30 November date applies only to product reads and remains subject to agreement with any product consumer.
