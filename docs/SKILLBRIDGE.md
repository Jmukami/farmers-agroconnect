# SkillBridge integration

Expert advice consumes SkillBridge through Express, independently of the marketplace. Maji is SkillBridge's upstream integration and is excluded.

## Configuration

`SKILLBRIDGE_BASE_URL` defaults to `https://skillbridge-api-p6s9.onrender.com/api`. Include `/api`, without `/health`. SkillBridge now requires its issued key in `X-API-Key`. Configure `SKILLBRIDGE_API_KEY` in the Express backend environment; the shared adapter sends it on all upstream GET and POST requests. AgroConnect JWTs and incoming consumer keys are never forwarded.

`API_KEYS` controls access **to AgroConnect**; `SKILLBRIDGE_API_KEY` authenticates **AgroConnect to SkillBridge**. They are separate credentials. Never use a `VITE_` prefix for the partner key or add it to frontend code, URLs, logs or source control. Existing consumer authentication and API response schemas remain unchanged.

For local development, copy `server/.env.example` to Git-ignored `server/.env`, fill in the backend settings privately, then run `node --env-file=server/.env server/index.js` (Node 22). Plain `npm start` does not load environment files automatically. Setting the key only in the root Vite `.env.local` does not configure Express. If Vite proxies to the hosted API, configure the key on the hosted backend instead.

On Render, add `SKILLBRIDGE_API_KEY` under the existing service's Environment settings and deploy the updated backend. The Blueprint declares it as a secret supplied outside Git. Restart/redeploy after setting or rotating the key. Missing credentials return 503 without making an upstream request; upstream 401/403 are reported as a sanitized integration-credential failure (503), rather than asking the farmer to sign in again. Other marketplace functionality remains available.

After configuration, verify expert discovery and a profile read through AgroConnect using your existing consumer `X-API-Key`. No live consultation is needed to verify authentication. Do not use the older log-appending check script when preserving historical snapshots is required.

## Routes

| AgroConnect route | Upstream consumption | Response |
| --- | --- | --- |
| `GET /api/skillbridge/experts` | Experts plus Agriculture skills | `{experts, skills, estates}` |
| `GET /api/skillbridge/experts/:id` | Profile, Agriculture skills, reviews, availability | `{expert, reviews, availability}` |
| `GET /api/skillbridge/experts/:id/reviews` | Validate agricultural expert, then reviews | `{reviews}` |
| `GET /api/skillbridge/experts/:id/availability` | Validate agricultural expert, then availability | `{availability}` |
| `GET /api/skillbridge/skills?tag=...` | Categorized skills (tag optional) | `{skills}` |
| `POST /api/skillbridge/requests` | Validate agricultural expert, then create request | `{consultation}`; sign-in required |
| `GET /api/skillbridge/requests` | Local database only | `{consultations}` for the signed-in user |

Discovery forwards `estate`, `sort=rating|proximity`, and `lat`/`lng`. Both coordinates are required for proximity and must be in geographic ranges; zero is valid. Additional `search` and agricultural `skill` matching happen locally. Expert skill names must match the Agriculture catalogue. Results sort by rating or upstream `distanceKm`. API estate options reflect the returned upstream set; the UI retains its initial estate options while filtering.

Optional profile sections return `null` on failure; empty availability is distinct from unavailable availability. Standalone section routes return failure statuses directly. The UI supports retries. Invalid responses become 502; network/timeouts and partner server errors become 503. Partner 400/404/409/422/429 responses retain their status with AgroConnect messages. Upstream requests time out after 12 seconds without automatic retries; cold services may require another safe GET attempt.

## Consultations

Send `{expertId, topic, date}` with a future timestamp containing seconds and `Z` or a numeric offset. SkillBridge confirmed on 23 October 2026 that both parties use East Africa Time (EAT, UTC+03:00; Africa/Nairobi). Availability date/startTime values are EAT wall-clock values. The frontend displays them in EAT and interprets requested appointments in the same zone, converting to UTC for storage and submission. No viewer-local timezone conversion is used. This is a request; the partner validates it and reservation is not guaranteed.

The backend derives `farmerName` from the account, normalizes the appointment to UTC, and persists an attempt before the partner POST. `(user, expert, UTC appointment)` is unique, including rejected/unknown attempts. Concurrent or repeated attempts return 409. No automatic POST retries occur.

Submission states are `submitting`, `submitted`, `unknown` and `rejected`. A timeout, invalid response or upstream server failure after submission becomes `unknown`: SkillBridge may have received it. A crash can leave `submitting`. Contact SkillBridge before trying another appointment in either case. My activity → Consultations shows local history; `partnerStatus` is the original returned string, not a live status. The supplied contract has no request retrieval or cancellation API.

## Evidence and operational failures

See [INTEGRATION_LOG.MD](../INTEGRATION_LOG.MD). Live bookings were not created during verification; mock tests cover writes. Runtime failures emit sanitized server events containing integration, method, endpoint without query/body, status and duration. Deployed processes do not modify source-controlled Markdown. Record confirmed incidents and resolutions in the integration log.

Run `npm test`, `npm run lint`, `npm run build`. Real HTTP tests validate responses against OpenAPI and simulate partner failures, duplicate requests and uncertain outcomes.
