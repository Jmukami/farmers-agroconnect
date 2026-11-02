# Monitoring hypotheses for AgroConnect endpoints

These are educated guesses from our own API route implementations, excluding the `/api/skillbridge/*` integration routes. They are not measured rankings; we will revisit them after collecting production samples.

## Likely slowest: `POST /api/orders`

Order creation runs a database transaction and handles up to 25 distinct line items. It reads each listing in sequence, then performs several sequential writes per item to create seller and item records and decrement inventory. In production, where the database is remote, those repeated round trips make this the strongest candidate for the slowest ordinary AgroConnect endpoint, especially for a full cart. `GET /api/orders` is another candidate if a user's order history grows, because it loads item and seller details for every order after the initial query.

## Likely to produce the most errors: `POST /api/auth/login`

My guess for the largest raw error count is login: ordinary mistyped emails or passwords return `401`, and each login attempt reaches this route. Among marketplace writes, `POST /api/orders` may have the highest failure rate because invalid carts, stale inventory, insufficient stock, and ordering one's own listing can produce `422` or `409`. These are expected client/business errors rather than necessarily server faults, so the ranking depends on whether we count all non-2xx responses or only 5xx errors.

## What to check when we analyze the data

`server/monitoring.js` records method, path, final HTTP status, elapsed milliseconds, and a hashed caller label for AgroConnect routes; `/api/skillbridge/*` is excluded. Compare request counts and 4xx/5xx rates by endpoint, plus p50/p95/p99 latency. Check `POST /api/orders` latency against the number of distinct line items, and compare `GET /api/orders` latency against the number of returned orders. Split login `401`s from unexpected `5xx`s and order validation/conflict responses so expected user mistakes do not look like service failures. Do not include query strings or raw API keys in monitoring output.

## Part B: local traffic measurements

Measurements were collected on 2026-11-02 against two temporary local SQLite databases, with Turso configuration unset. The baseline database contained the six demo products. The loaded database contained those six plus 500 synthetic products (506 total; 504 matched `kind=input`). No production service or database was used. The traffic generator sends read-only GET requests. Each status row is the generator's own summary; all requests completed with an HTTP response.

| Run | Requests (`N`) | 200 | 401 | 404 | 429 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline, low | 30 | 17 | 5 | 8 | 0 |
| Baseline, medium | 100 | 52 | 10 | 38 | 0 |
| Baseline, high | 200 | 30 | 24 | 5 | 141 |
| 500-row load, medium | 90 | 52 | 10 | 28 | 0 |

The three baseline runs shared one 60-second API-key rate-limit window. The first two stayed under the limit; the high run crossed it and returned 141 `429`s. Reads of `/api/stats` using the same key were also rate-limited until the window reset, confirming that the limit is shared across protected routes. After the window reset, the cumulative baseline `/api/stats` response reported 336 requests, 234 client errors, 0 server errors, `errorRatePercent: 0`, and 1.1 ms average response time. The 336 total includes the 330 generated requests and six `/api/stats` read attempts; the statistics request itself is counted after its response. The zero error rate means there were no 5xx responses; expected 401, 404, and 429 responses are counted separately as client errors.

The cumulative route measurements were:

| Route | Count | Client errors | Server errors | Average | Maximum |
| --- | ---: | ---: | ---: | ---: | ---: |
| `GET /api/stats` | 23 | 0 | 0 | 1.0 ms | 6.3 ms |
| `GET /api/products` | 20 | 0 | 0 | 2.3 ms | 4.4 ms |
| `GET /api/produce` | 13 | 0 | 0 | 2.3 ms | 3.8 ms |
| `GET /api/farmers` | 13 | 0 | 0 | 1.6 ms | 1.8 ms |
| `GET /api/health` | 33 | 0 | 0 | 0.7 ms | 1.3 ms |
| `GET /api/products/:id` | 17 | 17 | 0 | 1.9 ms | 2.8 ms |
| `GET /api/produce/:id` | 17 | 17 | 0 | 1.9 ms | 3.2 ms |
| `GET /api/farmers/:id` | 17 | 17 | 0 | 1.8 ms | 3.0 ms |
| `GET (no route)` | 183 | 183 | 0 | 0.7 ms | 1.5 ms |

`GET (no route)` contains requests rejected by middleware before Express selected a route: missing-key 401s and rate-limit 429s. Its 183 client errors comprise 39 traffic-generator 401s, 141 traffic-generator 429s, and three `/api/stats` reads that were also rate-limited.

### Predictions compared with measurements

- Part A predicted `POST /api/orders` would be slowest because it performs sequential reads and writes inside a transaction. The generator only sends GET requests, so it did not measure order creation. Among the measured routes, baseline `GET /api/products` averaged 2.3 ms over 20 calls (4.4 ms max); this does not confirm or disprove the order prediction.
- Part A predicted `POST /api/auth/login` would produce the most errors due to invalid credentials. Login was also not exercised. This traffic intentionally produced missing-key `401`s, nonexistent-record `404`s, and rate-limit `429`s, so its error counts cannot establish the real login or order error ranking.

### Observed traffic pattern and follow-up

In the baseline run, each of the three item lookup routes—`GET /api/farmers/:id`, `GET /api/products/:id`, and `GET /api/produce/:id`—received 17 requests and all 17 returned 404. Their averages were 1.8 ms, 1.9 ms, and 1.9 ms respectively; the product lookup's maximum was 2.8 ms. This was expected: the generator deliberately requests ID `999999999`, which is absent from the demo database. For a real-user analysis, I would separate expected missing IDs from unexpected failures and inspect request IDs and database results before treating these 404s as a service problem.

The loaded-database traffic run's `/api/stats` snapshot reported 90 requests, 38 client errors, 0 server errors, `errorRatePercent: 0`, and 4.5 ms average response time. It recorded `GET /api/products` 17 times (17.3 ms average, 21.9 ms maximum), `GET /api/produce` 11 times (2.1 ms average, 2.6 ms maximum), `GET /api/farmers` 7 times (2.7 ms average, 8.8 ms maximum), and `GET /api/health` 11 times (0.7 ms average, 0.9 ms maximum). The 38 client errors were 10 missing-key 401s and 28 missing-record 404s; no rate limit was reached. A later direct catalogue read returned 504 `kind=input` products in a 200,861-byte response. The subsequent snapshot showed 93 requests, still 38 client errors and 0 server errors, with a 4.7 ms overall average; product-list latency was 17.2 ms average and 21.9 ms maximum over 19 calls.

A likely cause is that the endpoint returns the full matching catalogue and spends more time reading and serializing the larger result. To check, I would measure response size and database query time separately, inspect the query plan, then repeat with several row counts and on the production database; this local SQLite result does not predict Render/Turso latency by itself.

### Production alert to consider

Alert when the `serverErrors` count increases by at least 3 in a five-minute interval. Notify the service operator to inspect the affected routes and server logs, then check recent deployments and database connectivity. `/api/stats` exposes cumulative process-lifetime counters, so an external monitor must compare successive samples to calculate the five-minute increase; a restart resets the counters.
