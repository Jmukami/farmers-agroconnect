# Week 13 versioning notes

**Team:** AgroConnect (Team 6)  
**Date:** 12 November 2026

## Downstream change: Campus Hub

**Change:** add parallel v2 product catalogue, detail, and inventory reads under `/api/v2/products`, preserving the unversioned and explicit `/api/v1/products` legacy reads; v2 wraps payloads in `data`, names offerings with `name`, and uses only `stock` for product inventory.

**Why the break is worthwhile:** v1 product responses duplicate inventory in `quantity` and `stock`, use `title` where consumers describe a product name, and use different top-level wrappers for list, detail, and inventory responses. V2 gives product consumers one consistent response envelope and one canonical product inventory field while preserving v1 for migration. Campus Hub later clarified that it does not consume `/products`, so this product change does not require action from Campus Hub.

**Consumer clarification:** Our initial prediction about Campus Hub reading product `title`, `quantity`, or `listings` was incorrect. Campus Hub confirmed its integration calls `GET /produce` and `GET /farmers`, and its `/produce` proxy maps `title` and `quantity`; `PartnerProduce.jsx` displays both. It does not read these fields from `/products`. AgroConnect is not deprecating `/produce` or `/farmers`, so Campus Hub needs no migration for this notice.

**Other questions answered:** Campus Hub proposed 30 November 2026 for any product v1 sunset and requested no breaking changes from 18 through 20 November. The date remains unagreed. The v2 product routes are local only; Render has not been updated, so no hosted v2 URL/test key is available. An unauthenticated hosted `curl -i` returned 401 without `Deprecation`, `Sunset`, or `Link`; no authenticated hosted response was captured. The exact post-sunset status/body has not been committed. `POST /api/orders` continues to accept `{items: [{id, type, quantity}]}` with `type` equal to `produce` or `product`.

## Upstream change: SkillBridge

SkillBridge Team 5's notice dated 9 November 2026 deprecates `GET /api/experts` and the `/experts` alias. Its v2 list is `GET /api/v2/experts`, returning `{data: [...], count: N}` with `location` replacing `estate`; detail is `GET /api/v2/experts/:id`, returning `{data: {...}}`. IDs, names, ratings, bio, skills, API key, and `location`/`estate` query filters are stated to remain compatible. The v1 sunset is 20 November 2026 at 00:00 UTC (03:00 in Nairobi). V1 carries deprecation and sunset headers before shutdown.

The failure prediction is concrete in this repository: the old adapter's expert-list validator in `server/skillbridge.js` expected a bare array, and its detail validator expected a raw expert object. Switching upstream first would have produced an invalid-response 502 and served a cached response if one existed; consultation creation would have failed at its preliminary expert lookup as well. AgroConnect now selects v2 by default, validates the envelope, maps `location` to its existing internal `estate` shape, and uses the same parser for consultation validation. `SKILLBRIDGE_EXPERTS_VERSION=v1` remains available for rollback only until the announced sunset.

The notice does not state whether `sort`, `lat`, `lng`, reviews, availability, skills, or request routes change. These calls are retained and recorded as partner questions in `docs/SKILLBRIDGE.md`; no compatibility claim is made for them. The provided SkillBridge `VERSIONING_NOTES.md` contains that team's own reflection and Maji-specific experience, so it is not copied as AgroConnect's account.

## Team reflection (draft for review)

The notice gives AgroConnect enough detail to migrate expert discovery and profile validation: it includes before-and-after payloads, identifies the field rename and response envelope, confirms the API key and location filters, and sets a UTC sunset date. The migration also exposed two separate dependencies in our backend: the expert proxy and consultation submission both validate the expert before continuing. Updating only the listing path would therefore have left consultation requests failing at the partner lookup. We kept AgroConnect's existing `estate` response field so the upstream change does not force a simultaneous Campus Hub migration.

The notice does not say whether sorting and coordinate parameters remain supported, or whether reviews, availability, skills, and consultation requests have corresponding v2 routes. We have preserved those calls and documented the questions rather than infer behavior. Our Campus Hub notice marks its proposed sunset as subject to partner agreement and describes which write routes remain unchanged. For the next migration, we should request a complete route matrix and an accessible v2 test environment early enough to validate every integration path before changing the production default. This draft should be reviewed by the team and adjusted to reflect its actual experience.

The adapter tests use representative v2 responses and verify that unexpected envelopes are rejected, but they do not replace a live request against SkillBridge. We have left the deployment and upstream traffic confirmation as follow-up work so the status of local verification is not mistaken for production evidence.
