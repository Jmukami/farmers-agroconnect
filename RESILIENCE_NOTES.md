# SkillBridge resilience notes

The stand-in partner in `flaky-partner.cjs` was exercised through the SkillBridge client with a successful response cached first. The slow mode waits 10 seconds; the flaky mode returns two `503`s and then succeeds; the persistent-error mode returns `500` on every attempt. The stopped-partner case used a closed local port to simulate `ECONNREFUSED`.

| Failure tested | Attempts and measured elapsed time | What the farmer saw on Expert Advice | What the log recorded |
| --- | --- | --- | --- |
| Partner stopped / connection refused | 3 attempts; 621 ms | Saved expert data, marked stale, with its save time | Retry events for attempts 1 and 2: `status=503`, `reason=ECONNREFUSED`; final failure: `status=503`, `reason=ECONNREFUSED`. |
| Partner slow (10-second response) | 3 attempts; 5,150 ms | Saved expert data, marked stale, with its save time | Retry events for attempts 1 and 2: `status=503`, `reason=TimeoutError`; final failure: `status=503`, `reason=TimeoutError`. |
| Partner flaky (two `503`s, then `200`) | 3 attempts; 625 ms | Live expert data; `stale=false` | Two retry events: `status=503`, `upstreamStatus=503`; the third attempt succeeded, so there was no final failure event. |
| Partner persistently returns `500` | 3 attempts; 621 ms | Saved expert data, marked stale, with its save time | Retry events: `status=503`, `upstreamStatus=500`; final failure: `status=503`, `upstreamStatus=500`. |

The stale rows used a primed last-good response. If there is no saved response, the adapter returns a sanitized unavailable response (`503` for network, timeout, or partner server failures); the feature page shows its retryable error state instead of stale data. When stale data is returned, the page labels it: “Live data is unavailable. Showing saved SkillBridge data from [time].”

## Retry numbers

The configured values are **timeout = 1,500 ms**, **retries = 2** (three total attempts), and **base delay = 200 ms**. The timing inputs supplied for four SkillBridge endpoints, measured while the server was already warm, are `0.569217`, `0.612987`, `0.558967`, and `1.242121` seconds:

```text
(0.569217 + 0.612987 + 0.558967 + 1.242121) / 4 = 0.745823 seconds
```

The 1.5-second per-attempt timeout is about twice that warm average and leaves about 258 ms above the slowest measured warm response. The retry count covers the stand-in’s two consecutive `503`s, which recovered on attempt three. Exponential backoff waits 200 ms, then 400 ms, for 600 ms total delay. For timeouts or retryable server errors on that schedule, the worst-case wait is **(retries + 1) × timeout + delays = (2 + 1) × 1,500 + (200 + 400) = 5,100 ms**. The helper also honors `Retry-After` on `429`, capped at 5,000 ms per retry; if both retry waits use that cap, the rate-limit path can take up to 14,500 ms total.

These are warm-service measurements and local stand-in timings. They do not include SkillBridge’s Render cold-start delay, so the 1.5-second timeout may exhaust its attempts before a cold service is ready; the saved response is what keeps the Expert Advice page useful during that outage.

## Without the resilience handling

On the **Expert Advice** screen, opening the page requests the expert list and agricultural skills from SkillBridge. Before the short timeout and retry handling, an unresponsive partner could hold the loading skeleton for the prior 12-second timeout. If the request failed, the screen replaced the list with an error and offered a retry, without showing the last successful experts. The farmer would press **Try again** or reload and wait through another partner request. Opening an expert profile could similarly leave reviews or availability unavailable after the wait.

A circuit breaker is a switch that stops calling a partner that has kept failing and tests it occasionally; we are not implementing one, so retryable GETs still make up to three attempts (POSTs remain single-attempt), while a breaker would short-circuit those GETs during an outage until a probe succeeded.
