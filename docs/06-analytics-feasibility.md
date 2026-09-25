# 06 — Analytics: Brainstorm, Feasibility and Verdict

**Question:** is analytics for StaticBlaze doable, and is it a good idea?

**Short answer:** *analytics* is two different products wearing one word. **Author-facing,
build-time analytics is a clear yes — it is cheap, it needs no visitor data, and it fits the
project's existing architecture exactly.** **Reader-facing traffic analytics is a maybe, and it is
not a technical question — it is a privacy and consent decision that this repository is not
currently set up to make.** Details and verdicts below.

---

## 1. The constraint that shapes everything

StaticBlaze publishes through GitHub Pages using the official artifact flow
(`.github/workflows/deploy.yml`: `actions/upload-pages-artifact` → `actions/deploy-pages`).
GitHub Pages serves files. There is no request handler, no middleware, no logfile the site owner can
read, and no place for server-side code to run.

Consequences:

- **No traffic metric can be derived from the hosting layer.** Web-search results on this point
  agree and the repository's own CI confirms the model: the only traffic signal available to a
  GitHub Pages site is produced on the client. ([CodeJam](https://www.codejam.info/): "The only way
  to get traffic insights on GitHub pages is through client-side analytics scripts"; a
  [Webmasters StackExchange thread](https://webmasters.stackexchange.com/) on the same problem notes
  the signal is further degraded because a technical audience is likely to run ad/script blockers.)
- Therefore every reader-facing metric requires **shipping JavaScript that talks to something that
  is not GitHub Pages** — a third-party endpoint or a separately deployed collector.
- Conversely, every metric about the *content and the build* requires only files that are already
  in the repository. **No network, no visitor, no consent.**

That split is the whole analysis.

## 2. Candidate metrics

Column "V" = needs visitor data? **N** = no (build-time only), **Y** = yes (client-side).

### 2.1 Author-facing — build-time (V = N)

| # | Metric | Why the author wants it | Data source already present |
|---|---|---|---|
| M1 | Posts per year × month ("the shape of the writing") | shows momentum and gaps | `published` in every post's frontmatter |
| M2 | Posts per tag / category, with zero-use terms flagged | taxonomy hygiene | `taxonomy/*.json` + post tags |
| M3 | Published / draft counts and a list of drafts | nothing surfaces drafts today (finding F12) | `draft:` flag |
| M4 | Words written, total and per post; reading time distribution | the only "growth" metric that is real and needs no visitor | Markdown bodies |
| M5 | Content health: missing `description`, no tags, `modified < published`, slug ≠ filename, unparsable frontmatter | the promise is "bad markdown fails the build" | validator already parses all of it |
| M6 | Broken internal links / routes referenced but not emitted | catches a real class of bug before readers do | generated route set vs links in rendered HTML |
| M7 | Missing assets: `thumbnail` or markdown image referencing a file not in `content/assets/` | avoids broken images | `content/assets/` listing |
| M8 | Search-index quality: entries with empty body, duplicate slugs, index size vs post count | the search is the only interactive feature | `search-index.json` |
| M9 | Bundle budget: `site.css`, `site.js`, font bytes, per-page HTML size | static sites rot silently | build output |
| M10 | Build duration and page count trend across runs | early warning when content grows | CI timing |
| M11 | Orphaned routes: generated pages with no inbound internal link | this is exactly finding F7 | rendered HTML graph |
| M12 | Reference-pigment drift: any hex outside `_tokens.css` | design-system hygiene | CSS source |

### 2.2 Reader-facing — needs client-side collection (V = Y)

| # | Metric | Honest assessment |
|---|---|---|
| M13 | Page views per URL | producible, but only by shipping a script; counts are systematically low for a technical audience |
| M14 | Referrers / traffic sources | producible from the `Referer` header at a collector; degrades badly because of referrer policies |
| M15 | Search terms arriving from external engines | **not producible.** Search engines no longer pass query terms, and no client-side method recovers them. Any tool claiming this is inferring, not measuring. |
| M16 | On-site search terms (what people type into `site.js`'s search box) | producible client-side, and the only genuinely useful reader-facing metric for this site — it tells the author what content is missing |
| M17 | Reading depth / scroll completion | producible client-side with scroll events, but it is behavioural profiling; needs a retention and purpose rationale |
| M18 | Unique visitors | **not honestly producible without persistent identifiers.** Cookie-free tools estimate it by hashing IP + user-agent + salt on the server, which is a personal-data processing decision, not a technical one. |
| M19 | Time on page, bounce rate | derivable, but they are modelling artefacts, not measurements, and they are the metrics most likely to be misread |
| M20 | RSS subscriber count | **not producible.** RSS is polled anonymously; feed readers do not phone home. Any subscriber number is a proxy at best. |
| M21 | Conversion metrics | not applicable — there is no conversion on this site |

**Metrics that cannot be produced without personal data:** M15, M18, M20 (and M21 by inapplicability).
M17 and M19 are producible but are profiling, not measurement. `docs/06` treats these as out of
scope for a first implementation regardless of approach.

## 3. Technical approaches

### Approach A — Build-time reports (no backend, no visitor data)

The generator already loads every post, the manifest and the search index into memory. Emit a
report as a second output.

- **Where it runs:** inside `StaticBlaze.Generator`, after `ManifestBuilder.Build` and before the
  static assets copy — it has every object it needs at that moment.
- **Where it goes:** `artifacts/report.json` and `artifacts/report.md`, **outside `dist/`**, plus a
  human-readable table written to the CI log. Not deployed — the report is for the author, not
  visitors. Uploaded with `actions/upload-artifact` so every run keeps a snapshot.
- **Query path:** none. The report *is* the artefact; there is no database and no query step.
- **Failure mode:** a report failure must never fail the site build — wrap it, log, continue, unless
  a metric is promoted to a hard gate (M5/M7 are the natural candidates).
- **Effort:** ~1 day for M1–M5, ~1.5 days more for M6/M7/M11 (those need the rendered HTML and a
  link graph, so they run after page rendering).
- **Maintenance:** near zero. It moves when the content model moves, and nothing external can break it.

### Approach B — Lightweight client-side collector, first-party

One small script plus one tiny endpoint you own.

- **Where it runs:** a handful of lines appended to `styles/static/site.js`, `navigator.sendBeacon`
  on page hide, strictly no cookies and no `localStorage` writes for analytics.
- **Where it is stored:** it cannot live on GitHub Pages. Requires either (B1) a serverless function
  on a different provider with a KV/D1 store — a new account, a new deploy target, a new bill — or
  (B2) a **self-hosted** collector on hardware the author already runs. B1 is the only route that
  keeps the site's "free and static" property, and it is still a second deployment.
- **Explicitly requires approval:** the engagement brief lists "adding a server, database or paid
  third-party analytics subscription" as out of scope and requiring confirmation.
- **Effort:** ~1 day collector + store + a `/stats` reader; plus ongoing ops.
- **Maintenance:** the collector is now a service that must stay up, be patched, and be paid for
  (or hosted). A static site that needed no maintenance acquires a maintenance obligation. That is
  the real cost, and it is larger than the implementation cost.
- **Honest accuracy note:** with a technical audience, script blockers will suppress a measurable
  fraction of hits. The absolute numbers will be wrong downward and there is no way to quantify by
  how much. Same-origin, first-party collection is the most robust variant available, which is the
  only reason to prefer B2 over a hosted tool.

### Approach C — Hosted cookieless analytics (Plausible / Umami / Matomo / PostHog / GoatCounter …)

A script tag pointing at a vendor. Vendors in this category position themselves as cookie-free and
GDPR-friendly, and a 2026 round-up lists Plausible, Matomo, PostHog and Umami as the common
shortlist ([faurya.com](https://www.faurya.com/)); several competitors publish "cookie-free" guides
with materially different accuracy claims ([humblytics.com](https://humblytics.com/),
[swetrix.com](https://swetrix.com/), [openpanel.dev](https://openpanel.dev/),
[wp-statistics.com](https://wp-statistics.com/)).

> Source note: the search returned vendor and aggregator listicles rather than primary
> documentation. The claims above are limited to "these vendors exist and position themselves as
> cookie-free"; **no accuracy, pricing or compliance figure is asserted here**, because none was
> verifiable from the sources actually retrieved. A real evaluation would read each vendor's own
> data-processing documentation.

- **Effort:** ~2 hours.
- **Cost:** a subscription or a self-hosted instance (which collapses back into Approach B).
- **Why it is not recommended here:** it introduces a third-party request on every page load of a
  site whose entire premise is "no runtime dependencies", and it puts the retention guarantee
  outside the author's control. It also adds a consent-surface question that the site cannot
  currently answer (see §4).

## 4. Privacy and consent stance

### 4.1 Approach A — no consent issue at all

No personal data is collected, no identifier is created, no request leaves the visitor's browser.
There is nothing to consent to, so no banner, no cookie notice and no jurisdiction analysis is
needed. This is the strongest argument for Approach A: it delivers most of what the author actually
wants and has **zero** legal surface.

### 4.2 Approach B — what it would require

If a collector is ever added, these are the decisions that must be made *before* the first request
is sent, not after:

| Decision | Options, and what each implies |
|---|---|
| **Identifier** | *None* (aggregate counters only — daily view counts per path, no session concept) **or** a salted rotating hash for uniques. The first is defensible; the second is personal-data processing under the GDPR/UK GDPR definition and drags in a lawful basis, a retention limit and a rights path. |
| **IP handling** | Discard at the edge before any logic runs; never log raw. Record only a coarse, non-reversible bucket if geography is genuinely needed — and note that for an author-facing blog, it usually is not. |
| **Consent model** | For a strictly-aggregate, no-identifier counter, some EU guidance permits an exemption from consent for purely statistical audience measurement; for anything with a persistent identifier, prior consent (or a documented legitimate-interest assessment) is required. **This engagement does not assert which applies** — it is a jurisdiction-specific legal question that should be answered by reading the relevant DPA guidance for the author's jurisdiction (Iran: the 2023 Personal Data Protection Act; EU/UK: ePrivacy + GDPR), not inferred from a vendor's marketing page. |
| **Retention** | Fixed and short — e.g. raw daily counters for 90 days, then rolled into monthly totals that are kept indefinitely because they are no longer attributable to anyone. |
| **Purpose limitation** | Traffic statistics only. No cross-site tracking, no advertising, no profiling, no fingerprinting, no data sold or shared. Written down and published. |
| **Transparency** | A one-paragraph `/privacy/` page stating exactly what is collected, for how long, and how to opt out. A new route — which is itself a change to the public route set and needs its own approval. |

### 4.3 The rule this repository should hold itself to

> If a metric cannot be produced without a persistent identifier, **do not ship the metric** — ship
> the build-time version instead if one exists. Of the reader-facing set, only M16 (on-site search
> terms) passes that test while also being worth having.

## 5. Data path, end to end

### Approach A (recommended) — complete

| Stage | Specification |
|---|---|
| **What is collected** | Nothing about visitors. Content and build facts only: the twelve metrics in §2.1. |
| **Where it is computed** | `StaticBlaze.Generator`, two passes: a pre-render pass (M1–M5, M8, M12) and a post-render pass over `dist/**/*.html` (M6, M7, M9, M11). |
| **Where it is stored** | `artifacts/report.json` + `artifacts/report.md` on the CI runner, **outside `dist/`** so it is never published. Uploaded as a workflow artefact (GitHub retains those for 90 days by default — configurable in repository settings). The `report.md` summary is additionally written to the CI log, which is the durable history. |
| **Schema** | See §6. |
| **Retention** | CI artefact: 90 days (GitHub default), changeable. CI log: repository retention. Nothing leaves the repository, nothing is attributable to a person. |
| **Query path** | None — open `report.md`, or diff two `report.json` files. If trends are ever wanted, commit `artifacts/report.json` on a schedule and diff it in Git; that is the database, and it is already versioned. |
| **Consent** | Not applicable. No personal data at any stage. |

### Approach B (deferred) — what would have to be specified before a go

| Stage | Would need to be |
|---|---|
| **What is collected** | `{path, timestamp-truncated-to-day, referrer-host-only, view-count, optional on-site-search-term}` and **nothing else** — no IP stored, no user-agent stored, no identifier beyond a per-day, per-path aggregate counter. |
| **Where it is stored** | A single first-party endpoint (B1 serverless + KV/D1, or B2 self-hosted) writing to one table. |
| **Schema** | `pageviews(day DATE, path TEXT, host TEXT, count INTEGER, PRIMARY KEY(day, path, host))` and, only if M16 is approved, `search_terms(day DATE, term TEXT, count INTEGER, PRIMARY KEY(day, term))` with the term lower-cased, trimmed and length-capped, and never stored with any session linkage. |
| **Retention** | Raw rows 90 days; then `pageviews_month(month, path, count)` rolled up and raw rows dropped. Roll-up is not attributable to any person. |
| **Query path** | A read-only `/stats` page (or a static report committed weekly) that renders the roll-up. Never exposed publicly without its own approval. |
| **Consent** | Unresolved — see §4.2. **This is the blocking open question, and it is a question for the user, not for the agent.** |

## 6. Proposed `report.json` schema (Approach A)

```jsonc
{
  "schema": "staticblaze.report/1",
  "generatedAt": "2026-09-21T18:00:00Z",
  "site": { "title": "mehrshad", "postsPublished": 3, "postsDraft": 1, "tags": 6, "categories": 2, "authors": 1 },
  "content": {
    "wordsTotal": 2481, "wordsMedian": 690,
    "readingMinutesTotal": 13,
    "perYear": [{ "year": 2026, "months": [0,0,0,0,0,0,0,1,3,0,0,0], "posts": 4 }]
  },
  "health": {
    "errors":   [{ "code": "missing-thumbnail", "path": "content/posts/x.md", "message": "…" }],
    "warnings": [{ "code": "no-tags",           "path": "content/posts/y.md", "message": "…" }],
    "passed":   ["frontmatter", "duplicate-slugs", "author-refs", "tag-refs"]
  },
  "routes": {
    "emitted": ["/", "/archive/", "/tags/blazor/", "…"],
    "orphaned": ["/tags/", "/categories/"],
    "brokenInternalLinks": [{ "from": "/posts/x/", "href": "/tags/nope/" }]
  },
  "assets": { "missing": [], "unreferenced": 0 },
  "bundle": { "siteCssBytes": 24657, "siteJsBytes": 6599, "fontBytes": 174459, "largestPageBytes": 17673 },
  "tokens": { "hexOutsideTokens": [] }
}
```

Every field above is computable from data the generator already holds or from files it already
writes. Nothing in this schema describes a person.

## 7. Risks

| Risk | Approach | Mitigation |
|---|---|---|
| Report computation slows the build | A | It runs on 3 posts today; cap it and skip the post-render pass above a page-count threshold if it ever matters. |
| A broken metric fails the deploy | A | Reports are advisory by default; only explicitly promoted metrics become gates. |
| Collector outage breaks the site | B | `sendBeacon` failure must be silently ignored; the script may never block rendering. |
| Scope creep into fingerprinting | B | The §4.3 rule, and a schema that has no field to put a fingerprint in. |
| Consent banner damages the reading experience | B | Not solvable by design — it is another reason Approach A wins for this site. |
| Third-party script becomes the site's supply chain | C | Rejected. |
| Numbers are misread as ground truth | B, C | Publish the collection method verbatim next to any number shown. |

## 8. Verdict

| Approach | Verdict | Reasoning |
|---|---|---|
| **A — build-time reports** | **GO. Implement first.** | Highest value per unit of effort, zero privacy surface, zero new infrastructure, uses data already in memory. It answers the author's real questions ("is the taxonomy healthy?", "is anything broken?", "what is the shape of this archive?", "is the bundle growing?") which traffic numbers do not answer at all. |
| **B — first-party client-side collector** | **CONDITIONAL / DEFER.** Not approved by this plan. | Technically straightforward; the cost is a permanently-hosted second service, plus an unresolved consent question (§4.2) that only the user can settle. Revisit only if a specific reader-facing question appears that Approach A provably cannot answer — the strongest candidate is **M16, on-site search terms**, which is the one metric that is both useful and implementable without an identifier. |
| **C — hosted analytics vendor** | **NO-GO as a first step.** | Introduces a third-party runtime dependency to a site whose premise is having none, and moves the retention guarantee off-site. If B is ever declined for effort reasons, C is the remaining option, but it should be a deliberate trade the user makes, not a default. |

**Recommended first implementation: Approach A metrics M1–M5 and M8, plus the M5/M7 hard gates.**
That is roughly one day of work, needs no approval of any kind, changes no public route, and closes
the fourth of the six "definition of done" items in `docs/02-task-assessment.md` at the same time as
it delivers M11 (orphaned routes), which is the automated form of finding F7.

**One precise question for the user, if Approach B is ever wanted:** *what reader-facing decision
would change if you knew your page-view numbers?* If the honest answer is "none, I just want to
know someone is reading", then Approach A plus the existing RSS feed already covers it, and no
visitor data should be collected at all.
