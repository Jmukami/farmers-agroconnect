# SkillBridge integration

Expert advice consumes SkillBridge through Express, independently of the marketplace. Maji is SkillBridge's upstream integration and is excluded.

## Configuration

`SKILLBRIDGE_BASE_URL` defaults to `https://skillbridge-api-p6s9.onrender.com/api`. Include `/api`, without `/health`. Supply overrides through the backend process environment or hosting dashboard; `.env` files are not loaded automatically. Public upstream GETs currently require no credentials. AgroConnect JWTs are never forwarded.

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

Send `{expertId, topic, date}` with a future timestamp containing seconds and `Z` or a numeric offset. The frontend asks for East Africa Time (UTC+03:00). It never auto-converts timezone-free availability. This is a request; the partner validates it and reservation is not guaranteed.

The backend derives `farmerName` from the account, normalizes the appointment to UTC, and persists an attempt before the partner POST. `(user, expert, UTC appointment)` is unique, including rejected/unknown attempts. Concurrent or repeated attempts return 409. No automatic POST retries occur.

Submission states are `submitting`, `submitted`, `unknown` and `rejected`. A timeout, invalid response or upstream server failure after submission becomes `unknown`: SkillBridge may have received it. A crash can leave `submitting`. Contact SkillBridge before trying another appointment in either case. My activity → Consultations shows local history; `partnerStatus` is the original returned string, not a live status. The supplied contract has no request retrieval or cancellation API.

## Evidence and operational failures

See [INTEGRATION_LOG.MD](../INTEGRATION_LOG.MD). Live bookings were not created during verification; mock tests cover writes. Runtime failures emit sanitized server events containing integration, method, endpoint without query/body, status and duration. Deployed processes do not modify source-controlled Markdown. Record confirmed incidents and resolutions in the integration log.

Run `npm test`, `npm run lint`, `npm run build`. Real HTTP tests validate responses against OpenAPI and simulate partner failures, duplicate requests and uncertain outcomes.
