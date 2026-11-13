# RETROSPECTIVE REPORT - 210690 ABELLE EMMANUEL

## Which stage was hardest for your team (Plan, Design, Build, Test,Document, Secure, Integrate, Monitor, Version), and why? 

Integration was the hardest stage. I had to reconcile real partner responses with incomplete or changing contracts: SkillBridge's first live expert read returned 503 after about 12 seconds, its supplied expert schema omitted the `skills` array needed to identify agricultural experts, and the later Campus Hub clarification showed that our initial `/products` migration did not match the endpoints Campus Hub actually calls (`/produce` and `/farmers`). The first two examples are in [INTEGRATION_LOG.MD](INTEGRATION_LOG.MD); the scope correction is in [VERSIONING_NOTES.md](VERSIONING_NOTES.md).

Designing was also a bit hard because we had not finalised the scope of our project at the beginning of the course and were still actively adding features. We had to nail down a final version before we could start designing the API since the requirements were changing quite frequently.


## One real cross-team issue. Describe one bug or breakage caused by a partner's change, or one you caused for them. Say what happened, how you found out, who did what to fix it, and how long it took. 

During the integration audit on **22 October 2026**, our first live SkillBridge expert-discovery call returned **HTTP 503** after roughly **12 seconds**, so profile checks could not proceed. The log says the upstream request exceeded our timeout; a cold start or transient latency was considered possible, but was not confirmed. We kept bounded timeouts and added an explicit retry path in the UI. After SkillBridge recovered, I reran the read-only checks and all 10 passed without any known change from Skillbridge's end. Source: [INTEGRATION_LOG.MD, item 1](INTEGRATION_LOG.MD).



## What I would design differently. If you started the project over knowing what you know now, what would you change, and what would you keep? 

I would verify each consumer's actual routes and fields before selecting a breaking-change scope. We initially prepared a v2 change for `/products`, but on **12th November 2026** Campus Hub later confirmed it consumes `/produce` and `/farmers`, and that its produce proxy and `PartnerProduce.jsx` use `title` and `quantity`. That meant the product migration did not require Campus Hub action. I would also request the upstream partner's complete route and query-parameter matrix, plus a testable staging endpoint, before switching an integration; SkillBridge's notice did not clarify whether sorting, coordinates, reviews, availability, skills, and request routes changed. I would keep the parallel-version approach and preserve AgroConnect's existing consumer-facing shape where possible.

On another note, if possible I would change my teammates


## My contribution. Rate your own contribution honestly and explain it. What did you own? Where did you carry others, and where did others carry you? 

I would rate my contribution a 9/10 simply because I contributed 90% of the work done from documentation, building, testing, communication with both our partners, integration. Granted, my team mostly helped in the beginning when planning but after that it was all me and this can be backed up by the contribution graph on Github.