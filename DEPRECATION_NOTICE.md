# Deprecation notice: AgroConnect product reads v1

**To:** Campus Hub (Team 7)  
**From:** AgroConnect (Team 6)  
**Date:** 12 November 2026  
**Status:** Draft for partner review; the sunset date below is proposed, not agreed.

## Summary

The legacy product catalogue, product detail, and inventory **read** routes are deprecated. The old unversioned paths and explicit `/api/v1/products` aliases return the same frozen v1 shape. Their v2 replacements are live locally at `/api/v2/products`. The proposed sunset for v1 reads is **16 November 2026**, subject to Campus Hub agreement. The deployed Render service will not change until this rollout is reviewed and deployed.

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
- Proposed 16 November 2026: v1 product reads may be retired after Campus Hub confirms its migration and the date is agreed.
- No v1 shutdown is scheduled by this draft. The hosted API must be deployed and the sunset date agreed before the timeline becomes binding.

Legacy product read responses from both `/api/v1/products...` and the old unversioned `/api/products...` paths carry `Deprecation`, `Sunset`, and `Link` headers. The Link header points to the matching v2 route.

## Questions

Please confirm which Campus Hub client fields currently read `title` and `quantity`, whether the proposed sunset date is workable, and whether any additional consumer needs to be covered. AgroConnect will update this notice after that review.
