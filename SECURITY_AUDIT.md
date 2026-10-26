# Security Audit Report

Audit date: 26 October 2026.

## What we checked

We read the success and error responses from the marketplace, farm-location, order and SkillBridge routes as a caller looking for information they should not have. We used the Part D checklist:

- **Sensitive fields:** Could responses expose password hashes, unnecessary email addresses, tokens or internal flags?
- **Other people's data:** Could changing an ID in the URL reveal another user's private records or allow changes to their data?
- **Error messages:** Could errors reveal stack traces, file paths, database queries or table names?
- **Write endpoints:** Could extra fields such as `id`, `owner_id` or `isAdmin` be saved or override values controlled by the server?
- **Keys in the wrong place:** Were credentials committed in Git history, printed in logs or included in the README? We checked tracked environment files, logging code and all 50 reachable commits, covering 172 unique blobs.

## What we found

- **Sensitive fields:** Account responses already excluded password hashes. Email and session tokens were returned for the caller's account where needed. However, SkillBridge responses validated known fields and then forwarded the whole upstream object, which could include unexpected private fields. Farmer and seller contact numbers, and voluntarily published farm directions, remain visible to key holders for discovery and visits.
- **Other people's data:** The existing ownership checks held. Listing changes require the owner's account, farm-location changes require the matching farmer, and consultation history is scoped to the signed-in user. Orders are restricted to participating buyers and sellers. Sellers see only their own items and statuses, with totals calculated from those items. Directory entries, listings and published farm locations are intentionally shared discovery records.
- **Error messages:** Expected failures already used controlled messages. Unexpected API failures returned a generic 500, but the server logged the full exception. Unexpected SkillBridge router errors could also return exception text.
- **Write endpoints:** Writes use explicitly named SQL columns. Extra fields are ignored and cannot replace server-controlled identities, prices or internal state. Registration accepts only the intended farmer, buyer and supplier roles. We found no mass-assignment issue in the reviewed writes.
- **Keys in the wrong place:** Historical commit `55f066dc664b` contains a tracked `server/.env` with a nonempty `JWT_SECRET`. The code also had a predictable fallback signing secret. The pattern scan found no recognizable API-key, private-key or token strings, but this does not prove arbitrary secrets were never committed. Current environment files are ignored, and tracked examples use placeholders.

## What we fixed and what is still open

- **API key protection:** All `/api` routes now require `X-API-Key`, except `GET`/`HEAD /api/health` and CORS `OPTIONS` preflight. Missing or incorrect keys return the same generic 401 before body parsing. `API_KEYS` must be supplied through the server environment. User-protected routes still require a JWT and enforce ownership.
- **Response fields:** SkillBridge responses now return only explicitly allowed fields for experts, skills, reviews, availability and booking acknowledgements. A regression test checks that unexpected upstream fields are removed.
- **Errors and logs:** Unexpected API errors now log a fixed event and status instead of the full exception. Unexpected SkillBridge router errors return a generic message. Expected upstream errors do not echo upstream response bodies.
- **Secret handling:** Removed the default JWT signing secret. A private `JWT_SECRET` is required in every environment. API keys are compared as fixed-size hashes and are not logged. Keyed responses use `Cache-Control: no-store`. The local Vite proxy attaches the key server-side, and Render configuration requests it privately.
- **Documentation and verification:** Updated README examples with `<your-api-key>`, the required header, and 401/429 responses. OpenAPI declares API key security together with JWT security where required. All eight tests passed, along with lint and the frontend build. Checks cover ownership, transactions, consultation persistence, response fields, key rejection, separate key allowances, cross-route counting, window reset and exemptions.

## Our rate limit and why we chose it

We allow **120 requests per API key per 60-second fixed window**, shared across all protected routes. This covers the product catalogue and inventory reads we expect to be called most often, as well as more expensive SkillBridge calls.

We chose this as an initial project threshold: it allows about two requests per second on average and short bursts when a page loads several resources. It gives ordinary browsing room while limiting repeated calls. We have not measured production traffic yet, so we should adjust it after observing legitimate usage.

The window starts with the first accepted request. Requests that later fail validation or JWT checks still count. Request 121 returns **429 Too Many Requests** with a generic message and a `Retry-After` header showing the seconds until reset. Different keys have separate allowances. Invalid keys do not create counters, so the map holds at most one entry per configured key.

The limiter is in memory. Restarting clears its counters, and each server process has its own allowance. Fixed windows also allow bursts around window boundaries. A shared store would be needed for one limit across multiple replicas. This per-key limiter does not bound requests using invalid keys, and a key identifies a consumer rather than an individual user.
