# Blind Test Report

## When our README was tested

- Tester team: Tester from Team 4 using an isolated sandbox environment. The tester had only our draft README.md: no prior context on the API, no walkthrough, and no contact with the team.
- Outside my ring? Yes. The tester was from Team 4 `Maji Platform` which is neither our upstream nor downstream partner.
- Result: Mostly succeeded. All 18 documented requests were reachable with some discrepancies in the error messages and other API bugs.
- Time taken: About 2 minutes from git clone to the first successful call (GET /api/health → 200 {"status":"ok"}). The full README walkthrough also finished within about 2 minutes.
- Where they got stuck: Section 1, the `npm ci step`. Installing `better-sqlite3` runs a native build that downloads Node headers from nodejs.org. The sandbox environment being used blocked that site, so npm ci failed. The tester managed to get past it, however. This was caused by the test environment, and it should not happen on Windows and macOS machines on a normal network. Still, the README gives no help if this step fails. Every later step worked exactly as written.

## When we tested their README

- Their API: Maji PLatform API
- Result: Succeeded!
- Time taken: ~ 5 minutes
- Where we got stuck: We did not get stuck. There was only some delay during the first request but that was expected and well documented.

## What I fixed and what is still open

- Fixed: 
    - Committed the new README
    - Renamed `Index.css` to `index.css` to avoid breaking the frontend build on Linux since ./index.css was used in imports.

-Gaps not closed today:
  - Docs (README)
    - The error table in `section 7` shows one message per status code, but the API returns others. For example: `Only farmer accounts can post produce listings.` (403), `This listing no longer exists.` (404), and `You cannot order your own listing.` (422). A 409 for a duplicate email also returns `fields.email`.
    - There is no `if npm ci fails` troubleshooting note.
    - It is not stated that timestamps are UTC (3 hours off for Nairobi), or that the county and category filters are case-sensitive.
    - The server prints `http://localhost:3000` instead of the /api base URL, so opening the printed link gives a 404.

  - API bugs found while testing
    - **High**: An order item with a wrong or missing type is treated as product. {"id":1,"type":"seed"} bought Hybrid maize seed (450) instead of tomatoes (85). It should return 422.
    - Medium: An order with items from two sellers has one shared status, so either seller can cancel or fulfil the whole order. Each seller also sees the other's items.
    - Medium: Some client mistakes return 500 instead of a 4xx code: no request body, a non-JSON content type, or the same listing on two lines adding up to more than the stock.
    - Low: server/.env is committed with the default JWT secret, and the server never reads it.
    - Low: Lenient input checks (string quantities and prices are accepted), and npm ci reports 10 dependency vulnerabilities to review before Week 9.

## Honest summary

Our README worked. A reader with no context went from a clean clone to a working response in about two minutes and reproduced every documented request exactly. The only hiccup was the native install step, which was caused by the sandboxed test environment. We do not expect our users to face said challenge. Even so, it showed the README had nothing to offer someone whose install fails.