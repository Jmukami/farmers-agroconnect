# SkillBridge integration

Expert advice consumes SkillBridge through Express, independently of the marketplace. The SkillBridge team issued a v1 deprecation notice on 9 November 2026: expert v1 is scheduled to return `410 Gone` from **20 November 2026 00:00 UTC**. The migration below uses v2 by default. The v1 adapter remains available as a temporary rollback until that sunset.

## Configuration

`SKILLBRIDGE_BASE_URL` defaults to `https://skillbridge-api-p6s9.onrender.com/api`. Include `/api`, without `/health`. SkillBridge now requires its issued key in `X-API-Key`. Configure `SKILLBRIDGE_API_KEY` in the Express backend environment; the shared adapter sends it on all upstream GET and POST requests. AgroConnect JWTs and incoming consumer keys are never forwarded.

`SKILLBRIDGE_EXPERTS_VERSION` selects the upstream expert directory contract. It defaults to `v2`; set it to `v1` only for a temporary rollback before the stated sunset. On Render, keep it set to `v2` and deploy before 20 November. The setting changes only expert list/detail reads and consultation expert validation; SkillBridge's notice does not specify whether the other routes are versioned.

The browser's optional wake request targets SkillBridge `GET /health`, configured with `VITE_SKILLBRIDGE_HEALTH_URL` (default `https://skillbridge-api-p6s9.onrender.com/health`). It sends no API key or credentials. For the browser to read a successful response, SkillBridge must allow unauthenticated requests and the deployed AgroConnect frontend origin through CORS.

`API_KEYS` controls access **to AgroConnect**; `SKILLBRIDGE_API_KEY` authenticates **AgroConnect to SkillBridge**. They are separate credentials. Never use a `VITE_` prefix for the partner key or add it to frontend code, URLs, logs or source control. Existing consumer authentication and API response schemas remain unchanged.

For local development, copy `server/.env.example` to Git-ignored `server/.env`, fill in the backend settings privately, then run `node --env-file=server/.env server/index.js` (Node 22). Plain `npm start` does not load environment files automatically. Setting the key only in the root Vite `.env.local` does not configure Express. If Vite proxies to the hosted API, configure the key on the hosted backend instead.

On Render, add `SKILLBRIDGE_API_KEY` under the existing service's Environment settings and deploy the updated backend. The Blueprint declares it as a secret supplied outside Git. Restart/redeploy after setting or rotating the key. Missing credentials return 503 without making an upstream request; upstream 401/403 are reported as a sanitized integration-credential failure (503), rather than asking the farmer to sign in again. Other marketplace functionality remains available.

After configuration, verify expert discovery and a profile read through AgroConnect using your existing consumer `X-API-Key`. No live consultation is needed to verify authentication. Do not use the older log-appending check script when preserving historical snapshots is required.

## Routes

| AgroConnect route | Upstream consumption | Response |
| --- | --- | --- |
| `GET /api/skillbridge/experts` | SkillBridge `GET /api/v2/experts` plus Agriculture skills | `{experts, skills, estates}` |
| `GET /api/skillbridge/experts/:id` | SkillBridge `GET /api/v2/experts/:id`, Agriculture skills, reviews, availability | `{expert, reviews, availability}` |
| `GET /api/skillbridge/experts/:id/reviews` | Validate agricultural expert, then reviews | `{reviews}` |
| `GET /api/skillbridge/experts/:id/availability` | Validate agricultural expert, then availability | `{availability}` |
| `GET /api/skillbridge/skills?tag=...` | Categorized skills (tag optional) | `{skills}` |
| `POST /api/skillbridge/requests` | Validate agricultural expert, then create request | `{consultation}`; sign-in required |
| `GET /api/skillbridge/requests` | Local database only | `{consultations}` for the signed-in user |

SkillBridge v2 returns a `{data, count}` list envelope and uses `location`; detail is wrapped in `{data: expert}`. The adapter validates those shapes and maps `location` to AgroConnect's existing `estate` field, so Campus Hub and AgroConnect frontend responses do not change. Discovery sends its existing AgroConnect `estate` filter upstream as `location`; SkillBridge's notice says both `?location=` and `?estate=` are accepted. It also preserves `sort=rating|proximity` and `lat`/`lng`, but the notice did not confirm those filters on v2. Both coordinates are required for proximity and must be in geographic ranges; zero is valid. Additional `search` and agricultural `skill` matching happen locally. Expert skill names must match the Agriculture catalogue. Results sort by rating or upstream `distanceKm`. API estate options reflect the returned upstream set; the UI retains its initial estate options while filtering.

The notice covers expert list and detail only. Reviews, availability, skills, and consultation request paths remain on their current paths pending confirmation from SkillBridge that they are unchanged in v2. The same confirmation is needed for `sort`, `lat`, and `lng` support. Do not remove or rewrite those calls based on assumptions.

Optional profile sections return `null` on failure; empty availability is distinct from unavailable availability. Standalone section routes return failure statuses directly. The UI supports retries. Invalid responses become 502; network/timeouts and partner server errors become 503 when no saved response exists. Partner 400/404/409/422/429 responses retain their status when no saved response exists. Each upstream attempt times out after 1.5 seconds. Safe GET requests retry up to twice for network failures, timeouts, 429, and transient 5xx responses, using bounded backoff and `Retry-After` when supplied. Validated GET responses are kept in a bounded in-memory cache keyed by the upstream URL. If a later call fails, the adapter serves the saved response with `stale: true` and its save time in `asOf`; otherwise it returns a friendly unavailable error. The cache clears when the backend restarts. Retry and final failure events are logged without query strings or request bodies. Consultation POSTs are never retried or replaced with cached data because a lost response may follow a successful booking.

## Consultations

Send `{expertId, topic, date}` with a future timestamp containing seconds and `Z` or a numeric offset. SkillBridge confirmed on 23 October 2026 that both parties use East Africa Time (EAT, UTC+03:00; Africa/Nairobi). Availability date/startTime values are EAT wall-clock values. The frontend displays them in EAT and interprets requested appointments in the same zone, converting to UTC for storage and submission. No viewer-local timezone conversion is used. This is a request; the partner validates it and reservation is not guaranteed.

The backend derives `farmerName` from the account, normalizes the appointment to UTC, and persists an attempt before the partner POST. `(user, expert, UTC appointment)` is unique, including rejected/unknown attempts. Concurrent or repeated attempts return 409. No automatic POST retries occur.

Submission states are `submitting`, `submitted`, `unknown` and `rejected`. A timeout, invalid response or upstream server failure after submission becomes `unknown`: SkillBridge may have received it. A crash can leave `submitting`. Contact SkillBridge before trying another appointment in either case. My activity → Consultations shows local history; `partnerStatus` is the original returned string, not a live status. The supplied contract has no request retrieval or cancellation API.

## Evidence and operational failures

See [INTEGRATION_LOG.MD](../INTEGRATION_LOG.MD). Live bookings were not created during verification; mock tests cover writes. Runtime failures emit sanitized server events containing integration, method, endpoint without query/body, status and duration. Deployed processes do not modify source-controlled Markdown. Record confirmed incidents and resolutions in the integration log.

Run `npm test`, `npm run lint`, `npm run build`. Real HTTP tests validate responses against OpenAPI and simulate partner failures, duplicate requests and uncertain outcomes.
