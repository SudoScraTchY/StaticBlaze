# 08 — Task Ledger

**Persisted state for StaticBlaze.** One row per task, reconciled from every task source found in
the repository. Read this top-to-bottom and you know exactly where the project stands. Nothing is
deleted; superseded states are marked, not erased.

| Field | Meaning |
|---|---|
| **ID** | stable identifier; `T-###` for work items, `RP-#` for redesign work packages |
| **Status** | `done` · `in-progress` · `next` · `blocked` · `deferred` · `obsolete` |
| **Prio** | `P0` blocks a release · `P1` should ship · `P2` nice to have |
| **Dep** | what must be true first |
| **Evidence** | a path or a command whose result proves the status |
| **Next** | the literal next action, specific enough for someone else to run |

Repository: `M:\Users\SaintScraTchY\RiderProjects\StaticBlaze`
Last reconciliation: **2026-09-22 22:10 (+03:30)**
Test baseline at reconciliation: **27 passing, 0 failing** (`dotnet test`)

---

## 1. Task sources searched

| Source | What it contributes |
|---|---|
| `README.md` → Status | 8 checklist lines (7 done, 1 open line covering three features) |
| `StaticBlaze-V2-Plan.md` → §12 Implementing Phases, §Out of scope | 12 phase items, 4 deferred items |
| `.zcode/plans/plan-sess_d33cc8ed-….md` | **duplicate** of `StaticBlaze-V2-Plan.md` — merged into it, not tracked separately |
| `docs/02-task-assessment.md` | 15 findings `F1`–`F15` |
| `docs/03-next-step-ideas.md` | 15 ranked ideas + 3 explicit non-recommendations |
| `docs/06-analytics-feasibility.md` | the recommended first analytics implementation (metrics `M1`–`M5`, `M8`; gates `M5`/`M7`) |
| `docs/07-verification-and-handoff.md` | §9 seven unverified items, §12 five next actions |
| Session execution record (2026-09-21 → 2026-09-22) | what actually changed, with command output |

**Merge decisions recorded:**

1. `.zcode/plans/plan-sess_d33cc8ed-….md` is a byte-level restatement of `StaticBlaze-V2-Plan.md`.
   Merged; no separate rows.
2. `README.md`'s single open line ("Comments, theme customization, real analytics") covers three
   independent features with different owners and verdicts. **Split** into `T-016`, `T-017`, `T-018`
   rather than tracked as one row.
3. Findings `F3`/`F4` (toolchain and CI drift) are both symptoms of one stale document and are
   merged into `T-005` with the plan-retirement work.
4. Finding `F2` and idea 1 are the same defect; one row (`T-003`).
5. Finding `F5` and idea 2 are the same gap; one row (`T-006`).
6. The whole design system change is one deliverable described in three documents (`README.md`,
   `docs/04`, `docs/05`) and is tracked once, as `RP-1`.

---

## 2. Ledger

### 2.1 Redesign work packages — the restructured ReDesign task

The redesign was previously tracked as a single deliverable that depended on external tooling
(`zcode_run` for implementation, a vision model for review). Both dependencies failed in this
environment, which is why it appeared to idle. It is now **eight packages, seven of which run
natively in a normal session**, each with its own evidence.

| RP | Package | Status | Prio | Dep | Evidence | Next |
|---|---|---|---|---|---|---|
| **RP-1** | Design system + implementation (tokens, templates, RTL, motion, JS) | `done` | P0 | — | `styles/_tokens.css`, `styles/site.css`, `styles/admin.css`, `styles/static/site.js`, 10 `.razor` files; `dotnet build StaticBlaze.slnx -c Release` → 0 errors; `docs/05-design-system.md` | — |
| **RP-2** | Runtime verification of the core pages (overflow, RTL, computed styles) | `done` | P0 | RP-1 | 64 page×width probes, 0 overflows; matrix in `docs/07` §6 | — |
| **RP-3** | Pagination exercised at runtime | `done` | P1 | RP-1 | `postsPerPage: 2` fixture → `/page/2/index.html` (9 361 B) emitted; probe clean at 5 widths; `aria-current` misuse removed | — |
| **RP-4** | Golden-file HTML regression test for the template layer | `done` | P0 | RP-1 | `tests/StaticBlaze.Site.Tests/` (new project, 8 tests) + 4 reviewed fixtures; `dotnet test` → 27 passing | — |
| **RP-5** | Reduced-motion behavioural check | `next` | P1 | RP-1 | CSS rule present on 33/33 pages; the one forced-preference capture produced no record → **behaviour unverified** | Re-run the probe with `--force-prefers-reduced-motion` and assert `getComputedStyle('.reveal').animationName === 'none'`; if the flag is unsupported in this Chrome, assert it in the golden test instead |
| **RP-6** | Visual review of the 28 screenshots by a vision model | `blocked` | P1 | RP-1 | `image` tool returned HTTP 400 on 3 attempts; screenshots exist at `DELIVERY/shots/` but were never inspected by a model | **Needs a working vision capability.** Fallback already shipped: `DELIVERY/before-after.html` for a human review |
| **RP-7** | Admin app visual parity in a browser | `deferred` | P2 | RP-1 | Admin compiles (`dotnet build` 0 errors), stylesheet rebuilt (29 182 B); only 3 class renames landed; never rendered | Publish the admin, serve it, screenshot the five pages. Low risk: no logic changed |
| **RP-8** | Content-report / analytics implementation | `next` | P1 | — | Plan complete in `docs/06`; not implemented | Implement `docs/06` §6 schema as `artifacts/report.json` + `report.md`, outside `dist/` |

### 2.2 Work items

| ID | Task | Source | Status | Prio | Dep | Last action · when | Evidence | Next |
|---|---|---|---|---|---|---|---|---|
| T-001 | v2 rewrite, phases 1–4 (scaffold, Core, Site+Generator, Admin, CI) | `StaticBlaze-V2-Plan.md` §12 / git log | `done` | P0 | — | committed 2026-09-20 (`4e93884`→`22f5acb`) | 12 commits; `dist/` has every artefact in plan §6.3 | — |
| T-002 | Legacy v1 app + `DbGenerator` removal | plan §Carried/Deleted | `done` | P1 | T-001 | committed 2026-09-20 (`b1a5d13`) | absent from `src/` | — |
| T-003 | Local build must produce a **styled** preview | idea 1 / `F2` | `done` | P0 | — | added `--css` to `Program.cs`; 2026-09-22 21:xx | `Program.cs` copy block; generator log `Stylesheet copied: dist-assets/site.css -> dist\assets\site.css` | — |
| T-004 | `README.md` Getting started + Design + Docs | `F3`,`F4` | `done` | P1 | T-003 | rewritten 2026-09-22 | `README.md` | — |
| T-005 | Retire / reconcile the stale `StaticBlaze-V2-Plan.md` | idea 3 / `F1`,`F3`,`F4` | `done` | P1 | — | historical banner with a 4-row drift table prepended **2026-09-22 21:12** | `StaticBlaze-V2-Plan.md` (27 801 → 28 945 B; `git diff` +19 lines) | — |
| T-006 | Golden-file HTML regression test | idea 2 / `F5` | `done` | P0 | — | created `tests/StaticBlaze.Site.Tests` (8 tests, 4 fixtures) **2026-09-22 22:05** | `dotnet test` → `Passed! Failed 0, Passed 8, Total 8`; fixtures under `tests/StaticBlaze.Site.Tests/fixtures/` | — |
| T-007 | In-page refresh of `docs/` index | idea 3 | `next` | P2 | T-005 | not started | — | add a `docs/README.md` table pointing at `01`–`08` |
| T-008 | Link the orphaned `/tags/` and `/categories/` indexes | idea 5 / `F7` | `done` | P1 | — | `nav[]` extended; 2026-09-22 | `content/site.json`; built `index.html` header nav + footer | — |
| T-009 | Label the search input (WCAG 1.3.1 / 3.3.2) | idea 4 / `F8` | `done` | P0 | — | `.sr-only` label + `role="search"`; 2026-09-22 | probe: `inputs [{"type":"search","hasName":true}]` on all 12 probed pages | — |
| T-010 | Fix the three WCAG AA contrast failures | idea 4 / `F9` | `done` | P0 | — | palette re-derived; 2026-09-22 | `docs/07` §5 before/after table; all 14 shipped pairs ≥ gate | — |
| T-011 | Contrast regression guard in CI | idea 4 (extension) | `next` | P2 | T-010 | not started | `contrast.mjs` exists in session scratch only | move the measurement into a test so the ratios cannot silently regress |
| T-012 | RTL + Persian typography capability | idea 7 / `F11` | `done` | P1 | RP-1 | logical properties + `dir` from language + Vazirmatn; 2026-09-22 | `docs/07` §6 RTL table; `<html lang="fa" dir="rtl">` observed | — |
| T-013 | `tools/get-fonts.ps1` portability | `F6` | `done` | P2 | — | `$PSScriptRoot` + Vazirmatn downloads; 2026-09-22 | `tools/get-fonts.ps1` | **not executed** — would overwrite fonts in place; verify on a clean checkout |
| T-014 | `tools/serve.mjs` returns 200 for missing routes | `F13` | `next` | P2 | — | not started | `tools/serve.mjs` catch-all writes 200 | write 404 when `404.html` is served as a fallback |
| T-015 | Draft post has no author-facing signal | idea 6 / `F12` | `next` | P2 | — | not started; the generator correctly excludes it | `content/posts/2026-08-20-admin-behind-the-lock.md` (`draft: true`); `dist/posts/` has 3 dirs | add a draft count to the admin dashboard + a `draft` filter chip |
| T-016 | Comments via GitHub Issues | `README.md` status | `deferred` | P2 | decision | not started | `README.md`; plan §Out of scope | **Decision needed** — see §4 |
| T-017 | Theme customisation / "theme marketplace" | `README.md` status | `deferred` | P2 | decision | recommended against in `docs/03` non-recommendations | `docs/03` | **Decision needed** — see §4 |
| T-018 | Real analytics | `README.md` status | `in-progress` | P1 | — | plan delivered (`docs/06`); build-time route recommended; client-side route not approved | `docs/06` §8 verdict table | implement `RP-8`; the consent question stays open — see §4 |
| T-019 | Content report in CI (metrics `M1`–`M5`, `M8`, `M11`) | idea 15 / `docs/06` §5 | `next` | P1 | — | not started | `docs/06` §6 schema | same as `RP-8` |
| T-020 | Pagination never exercised | `F14` / `docs/07` §9.3 | `done` | P2 | — | minimal fixture generated **2026-09-22 21:5x** | `/page/2/index.html` emitted; pagination nav present with correct hrefs; probe clean at 320/375/414/768/1280 | — |
| T-021 | Two `<h1>` on `/posts/markdown-feature-tour/` | `docs/07` §9.2 | `deferred` | P2 | content change | observed; not changed | built page heading order `H1,H1,H2,…` | **Decision needed** — demote `# h1 Heading` in the fixture, or accept it |
| T-022 | Reduced-motion behaviour unverified | `docs/07` §9.5 | `next` | P1 | — | recorded as unverified | `docs/07` §9.5 | same as `RP-5` |
| T-023 | Admin never rendered in a browser | `docs/07` §9.4 | `deferred` | P2 | — | compiles, not rendered | `docs/07` §9.4 | same as `RP-7` |
| T-024 | Screenshot-based visual validation never performed | `docs/07` §9.1 | `blocked` | P1 | vision capability | `image` tool HTTP 400 ×3 | `docs/07` §9.1 | same as `RP-6` |
| T-025 | Unused 112.5 MB `tools/tailwindcss.exe` on disk | `F4` / `docs/03` §next-actions 2 | `blocked` | P2 | **user approval to delete** | observed; **not deleted** — a recursive delete was refused by the safety guard earlier in the session | `tools/tailwindcss.exe` (112 503 296 B), gitignored via `.gitignore:277 (*.exe)` | **Decision needed** — approve deletion of an untracked 112 MB binary |
| T-026 | Tailwind auto-source-detection leaks admin-only utilities into the public CSS | `docs/07` §4 residual | `deferred` | P2 | — | documented, not changed | `dist-assets/site.css` contains `.bg-pomegranate`, `.min-h-[28rem]`, `.lg:grid-cols-[1fr_20rem]`; also present pre-redesign | scope the site build with `source(none)` + an explicit `@source` list, then re-verify every utility |
| T-027 | Task ledger + status document | this ledger | `done` | P1 | — | created 2026-09-22 22:10 | `docs/08-task-ledger.md`; `DELIVERY/task-status.html` | keep the ledger updated as tasks move |

### 2.3 Per-idea disposition (from `docs/03`)

All 15 ideas are accounted for. None was silently dropped.

| Idea | Disposition | Ledger row |
|---|---|---|
| 1 local build produces a styled site | done | T-003 |
| 2 golden-file HTML test | done | T-006 |
| 3 reconcile / retire the v2 plan | done | T-005 |
| 4 contrast failures + input label | done | T-009, T-010 |
| 5 wire the taxonomy indexes into nav | done | T-008 |
| 6 surface drafts in the admin | next | T-015 |
| 7 RTL + Persian typography | done | T-012 |
| 8 analytics for a static site | in-progress (plan done) | T-018, T-019 |
| 9 density on index surfaces | done | within RP-1 |
| 10 reading progress + TOC | partial — progress rail shipped; TOC not | new: **T-028** |
| 11 comments via GitHub Issues | deferred | T-016 |
| 12 RSS/Atom discovery | done — `atom` link added to footer and `<head>` | within RP-1 |
| 13 theme customisation | deferred, recommended against | T-017 |
| 14 search quality upgrade | partial — keyboard nav + `/` shipped; tag facets / prefix matching not | new: **T-029** |
| 15 content-health report in CI | next | T-019 |

Two rows are new here because the ideas list bundled more than one deliverable:

| ID | Task | Source | Status | Prio | Evidence | Next |
|---|---|---|---|---|---|---|
| T-028 | Auto-generated table of contents for long posts | idea 10 (residual) | `next` | P2 | progress rail shipped; no TOC | build a TOC from the `h2`s Markdig already emits with `auto-identifiers` |
| T-029 | Search: tag facets + prefix matching | idea 14 (residual) | `next` | P2 | `styles/static/site.js` scores title/tags/description only | add prefix matching and a tag filter chip row to the search panel |

---

## 3. Status roll-up

| Status | Count | Rows |
|---|---|---|
| `done` | 14 | T-001, T-002, T-003, T-004, T-005, T-006, T-008, T-009, T-010, T-012, T-013, T-020, T-027 + RP-1, RP-2, RP-3, RP-4 (RP rows counted separately) |
| `in-progress` | 1 | T-018 |
| `next` | 7 | T-007, T-011, T-014, T-015, T-019, T-022, T-028, T-029 (8 with RP-5, RP-8) |
| `deferred` | 5 | T-016, T-017, T-021, T-023, T-026 |
| `blocked` | 2 | T-024 (=RP-6), T-025 |
| `obsolete` | 0 | — |

Every `next` row above states its own next action. No row is `pending` without a reason.

---

## 4. Blocked and deferred — the decision requests

| ID | Classification | One-line reason | Exact input needed |
|---|---|---|---|
| T-024 / RP-6 | **blocked** | the vision model returns HTTP 400, so the 28 screenshots cannot be reviewed by a model | either (a) enable a working vision model, or (b) accept `DELIVERY/before-after.html` as a human review and close the row |
| T-025 | **blocked** | deleting `tools/tailwindcss.exe` (112.5 MB, untracked, gitignored) is a destructive file operation; a recursive delete was refused by the safety guard earlier this session | explicit approval to delete that one untracked binary — nothing else |
| T-016 | **deferred** | comments introduce a third-party runtime dependency and a moderation obligation | decide: ship `giscus`/`utterances`, self-host, or close as won't-do |
| T-017 | **deferred** | a theme switcher is high effort and low value for a personal blog, and doubles the contrast-verification surface | confirm `docs/03`'s recommendation to close it as won't-do, or scope it |
| T-021 | **deferred** | the double `<h1>` lives in a post's own Markdown, so fixing it edits content | approve demoting `# h1 Heading` in `content/posts/2026-08-01-markdown-feature-tour.md`, or accept it |
| T-023 / RP-7 | **deferred** | rendering the admin needs a publish + browser round trip; only three class names changed | schedule it, or close it — risk is low either way |
| T-026 | **deferred** | scoping the Tailwind build removes ~4 leaked admin utilities, but a wrong source list would silently drop classes from the live site | approve the change and its re-verification, or accept the leak |

**Nothing is blocked on missing credentials, paid accounts, or third-party access.**

---

## 5. What changed in this session (evidence trail)

| When (2026-09-22, +03:30) | Action | Verifiable result |
|---|---|---|
| 21:12 | Historical banner prepended to `StaticBlaze-V2-Plan.md` | 27 801 → 28 945 bytes; `git diff --stat` = `1 file changed, 19 insertions(+)` |
| 21:40 | `--css` flag added to the generator; site regenerated | generator log: `Stylesheet copied: dist-assets/site.css -> dist\assets\site.css`; `Site generated: 17 pages` |
| 21:52 | `aria-current="page"` removed from the pagination readout (it marked a non-link) | grep of `/page/2/` → `aria-current` present? **False** |
| 21:55 | Pagination exercised with a `postsPerPage: 2` fixture | `page/2/index.html` (9 361 B) emitted; `page/1/` correctly not emitted; nav hrefs `/StaticBlaze/` and `/StaticBlaze/page/3/` |
| 21:58 | Pagination pages probed at 5 widths | 0 overflow; `h1` = 1; search input labelled; 0 emoji |
| 22:00 | `tests/StaticBlaze.Site.Tests` created and added to `StaticBlaze.slnx` | new project restores and builds |
| 22:03 | First run established 4 baselines and failed by design | `Failed: 4, Passed: 4`; fixtures written: `PostCard.html` 1 538 B, `PostCard.no-tags.html` 622 B, `Pagination.page2of3.html` 1 005 B, `SitePage.shell.html` 5 691 B |
| 22:05 | Baselines reviewed, then re-run | `Passed! Failed 0, Passed 8, Total 8` |
| 22:08 | Full suite | `Passed! 19` (Core) + `Passed! 8` (Site) = **27 passing, 0 failing** |
| 22:09 | Fixture bytes verified as genuine UTF-8 | `SitePage.shell.html` U+00B7 ×2, U+FFFD ×0, no BOM |

**Environment blockers observed (not task defects):**

| Observation | Evidence | Consequence |
|---|---|---|
| `zcode_run` fails with HTTP 403 `pay-view` code `810002`, body "We're experiencing high demand right now… upgrade to a monthly subscription" | two failed dispatches on 2026-09-21; the same body is recorded on the stale `Veder` cron job (`consecutiveErrors: 2`, `lastErrorReason: "auth"`) | do not route work through ZCode; implement natively |
| `image` tool fails with HTTP 400 (no body) | 3 attempts on 2026-09-22 | screenshot review cannot be automated |
| `agents_list` returns `agents: []`, `allowAny: false` | called 2026-09-22 21:5x | **no subagent can be dispatched at all**, so "offload to a Design-Expert SubAgent" is not an available option |
| background preview servers die at turn boundaries | ports 8077–8091 all `DOWN` at 2026-09-22 21:0x | long capture runs must be restarted; this is what looked like "idling" |
| a stale, unrelated cron job exists for a different project | `cron list` → `Veder: retry ZCode build dispatch`, session `agent:auto-coder:fa138139`, `enabled: false`, `deleteAfterRun: true`, workspace `…\RiderProjects\Veder` | inert; left in place, not deleted |


---

## 6. Closing verification pass — 2026-09-22 22:18 (+03:30)

Re-read the inventory against this ledger, re-ran every piece of evidence it cites, and confirmed
the ledger and the handoff summary agree. **15 checks, 0 failures.**

| Check | Result | Detail |
|---|---|---|
| dotnet test | PASS | 27 passed / 27 total across 2 test projects (19 Core + 8 Site) |
| dotnet build StaticBlaze.slnx -c Release | PASS | 0 Error(s) |
| generator run | PASS | Site generated: 17 pages + feeds |
| stylesheet copied into dist/ | PASS | dist/assets/site.css = 33 491 bytes |
| 	ags + categories linked in the header nav | PASS | both hrefs present |
| stale plan marked historical | PASS | STATIC: HISTORICAL banner present; 28 945 bytes |
| pagination fixture emitted page/2 | PASS | 9 341 bytes |
| misused ria-current removed | PASS | absent from /page/2/ |
| golden fixtures present | PASS | 4 files: PostCard.html, PostCard.no-tags.html, Pagination.page2of3.html, SitePage.shell.html |
| site test project registered in the solution | PASS | present in StaticBlaze.slnx |
| docs/01–docs/08 present | PASS | 8 documents |
| this ledger's deliverable set present | PASS | staticblaze-redesign-report.html, efore-after.html, 	ask-status.html |
| screenshots present | PASS | 28 PNGs |
| ledger enumerates T-001–T-029 | PASS | 29 unique ids, no gaps |
| ledger enumerates RP-1–RP-8 | PASS | 8 packages |

**Nothing was silently dropped.** Every source listed in §1 maps to at least one row in §2, every row
in §2 maps back to a source, and the per-idea disposition table in §2.3 accounts for all 15 ideas
from docs/03 with no row missing.

**Known inconsistencies, stated rather than hidden:**

1. T-013 is marked done for the *source edit* only; the script itself was never executed (running
   it would overwrite fonts already in place). The row says so and the next step is a clean checkout.
2. RP-5, RP-6, RP-7, T-011, T-014, T-015, T-019, T-022, T-028, T-029 remain open
   by design — each has a stated next action. This ledger is a snapshot, not a claim of completion.

---

## 7. Deep Field rebuild - 2026-09-23

Mehrshad rejected the Naghsh pass as "simple but nothing else - no GSAP, no threeJs, no Innovative
UI". A from-scratch rebuild replaced it. **Naghsh is superseded, not erased:** rows `RP-1` to `RP-4`
above stand as the record of that pass, and their files no longer exist in the tree.

### 7.1 New work packages

| RP | Package | Status | Prio | Evidence |
|---|---|---|---|---|
| RP-9 | Deep Field design system from scratch (deliberately one dark theme) | `done` | P0 | `styles/_tokens.css` rewritten: `--ground #06070d`, one accent `#57c5c6`, one radius scale, `color-scheme: dark` |
| RP-10 | GSAP motion system | `done` | P0 | `styles/static/motion.js`, 9,868 B; verified live: `anim=on`, `gsap=true`, `scrollTrigger=true`, reveals GSAP-owned |
| RP-11 | Three.js scenes, real archive graph | `done` | P0 | `styles/static/scene.js`, 12,221 B; verified live: `scene=live`, canvas `1280x900` |
| RP-12 | Capability gate + fallbacks | `done` | P0 | reduced motion -> layer never loads, reveals opaque; WebGL off -> `scene=no-webgl`; 0 console errors in all conditions |
| RP-13 | Rebuild the component architecture and all pages | `done` | P0 | 9 page components + 3 shared, all rewritten; `dotnet build` 0 errors |
| RP-14 | New IA surfaces: filterable index and contact | `done` | P1 | `/posts/` 10,968 B, `/contact/` 10,447 B emitted; 19 pages total, up from 17 |
| RP-15 | Golden-file guard against the rebuild | `done` | P0 | guard caught the change, 4 baselines reviewed then accepted; 27 tests passing |
| RP-16 | Requested references: taste-skill applied, motionsites MCP blocked | `done` | P1 | `docs/09` sections 1, 2 and 2.2; motionsites is a paid product, fallback documented |
| RP-17 | Motion spec, decision log, failure matrix, handoff | `done` | P1 | `docs/09-deep-field-handoff.md`, 20,317 B, 12 sections |

### 7.2 New open items

| ID | Task | Status | Prio | Reason / decision needed |
|---|---|---|---|---|
| T-030 | Persist contact form submissions | `blocked` | P1 | A static site has no datastore and new infrastructure needs approval. The form validates and then states plainly that nothing was stored. **Decision needed:** pick a serverless endpoint or a self-hosted collector, then set `data-endpoint` on the form (one attribute, no other code change). |
| T-031 | Staging deploy and a rehearsed rollback | `blocked` | P1 | **Rollback mechanism rehearsed:** `git worktree add HEAD --detach` materialised `22f5acb`, which builds and generates 17 pages, and the documented distinguisher (`cockpit` class, 17 vs 19 pages) discriminates cleanly. Still blocked on the **deploy** half: no host is configured and DNS changes need confirmation. |
| T-032 | Field performance pass (LCP/CLS/INP) | `done` | P1 | All three measured on a **throttled mid-range mobile profile** (390x844@3x, 4x CPU, 1.6 Mbps/750 kbps/150 ms) over CDP: LCP 1072 to 1244 ms, CLS 0.0001 to 0.0005, **INP max 40 ms across 16 to 20 real interactions per page**. All inside target (LCP < 2500, CLS < 0.1, INP < 200). |
| T-033 | Cross-browser pass, iOS Safari first | `blocked` | P1 | **Environment gap, not effort:** no second engine is installed (checked `firefox.exe`, `Safari.exe`: absent). A **feature audit ran instead** and found two real defects, both fixed (see T-039). Still needs a device or a remote browser service for the engine run itself. |
| T-034 | Re-measure contrast for the new token pairs | `done` | P2 | In-browser sweep of 119 text styles across 7 routes against their effective background: **first pass found 3 real AA failures** in `--ink-faint` (3.27:1 on `--panel`, 3.51:1 on `--ground`) at 11px; lightened `#5d6584` to `#7d86a7`; re-verified **0 failures**, 5.22 / 5.59 / 4.85:1 |
| T-035 | Rehearse WebGL context loss | `done` | P2 | Fired `WEBGL_lose_context` deliberately: `data-scene` becomes `context-lost`, canvas retained, body text still rendered, 0 errors, on all 7 routes |
| T-036 | Tailwind auto-source detection still leaks 4 admin utilities into the public CSS | `deferred` | P2 | Pre-existing; unchanged from `T-026`. |
| T-038 | Submission store, schema, admin review and export | `done` | P1 | **Built and demonstrated end to end.** `tools/submissions.mjs` is the store (JSONL under `var/`), `tools/submissions-server.mjs` is the receiver implementing the endpoint contract. Live run: valid POST -> **201** with id `sub_20260923045519_doz5`; invalid email -> **400**; honeypot filled -> **400**; `list` shows records with status; `set-status` moved one to `read`; `export` wrote `artifacts/submissions/{submissions.json, submissions.csv, review.html}` (761 / 446 / 2634 B). Health after traffic: `accepted 1, rejected 2, stored 2`. **Privacy verified: no ip, userAgent, cookie, session or fingerprint field is stored**, and `var/` and `artifacts/` are gitignored because the repository is public. Only the *host* for the receiver remains a decision. |
| T-039 | Cross-engine hardening from the feature audit | `done` | P1 | `tools/harden-css.mjs` applied both fixes: **4** `-webkit-backdrop-filter` twins (Safari requires the prefix) and **3** opaque `color-mix` fallbacks (an engine without `color-mix()` would otherwise render the sticky cockpit transparent over the 3D field). Verified present in the built bundle; build 0 errors, 27 tests passing. |
| T-040 | Crawlability and metadata audit, four defects fixed | `done` | P1 | `tools/audit-site.mjs` over the built output found: `/about/` borrowing the author's canonical (identical title, description **and** canonical as `/authors/mehrshad/`); `/tags/` and `/categories/` absent from `sitemap.xml` (17 urls); 13 pages with 20-to-37-character descriptions; and an apparent total absence of JSON-LD. All fixed except the last, which was a **false positive in the checker** (Razor emits `application/ld&#x2B;json`; instrumenting the component proved the value was passed at 240 and 528 chars). After: **0 problems across 19 pages**, sitemap **19 urls**, descriptions **77 to 163 chars**, 0 duplicate canonicals. |
| T-041 | Audit scripts committed as re-runnable gates | `done` | P2 | `tools/audit-site.mjs` and `tools/check-crossengine.mjs`, both exiting non-zero on failure. Re-run during this pass: `RESULT: PASS` and `passed=4 failed=0`. |
| T-051 | Verification gates wired into CI | `done` | P0 | `audit-site.mjs` and `check-crossengine.mjs` now run as a `Quality gates` step after artifact assembly, before `configure-pages`; both exit non-zero on failure so a stale route, broken link, duplicate canonical, thin description, previous-design token, or non-fallback `color-mix` surface fails the build. Workflow now has 14 steps. Verified locally against a freshly assembled `dist` including `dist/admin/`: audit PASS, crossengine `passed=4`, parity PASS, all exit 0. |
| T-052 | CI gate placement conflicted with the crawlability audit | `done` | P1 | Because the gate runs after assembly, `dist/admin/` exists; the audit would judge the Blazor SPA by content-page rules (no canonical, no og tags, no single `h1`) and fail spuriously. `audit-site.mjs` now skips the admin subtree explicitly with the reason recorded at the skip. Found by simulating the CI step locally rather than trusting the YAML. |
| T-048 | Route parity script against the previous revision | `done` | P0 | `tools/parity.mjs` comparing the HEAD worktree build against the current one: 17 previous routes, **17 preserved, 0 missing**, 2 added (`/contact/`, `/posts/`). Also checks internal link integrity (**636 links, 0 broken**) and sitemap reachability (18 urls, 0 unresolvable). |
| T-049 | Orphan tag page advertised a 404 | `done` | P1 | Found by the link checker: `/tags/` linked to `/tags/dotnet/` and `sitemap.xml` listed it, but no page was emitted because `dotnet` is declared in `taxonomy/tags.json` with **zero posts** and term pages are only generated for terms with a count. Both the index and the sitemap now list only emitted terms. The declaration is left in `content/` as an editorial observation for Mehrshad. |
| T-050 | Form failure path with the receiver down | `done` | P1 | Dead endpoint: status **`failed: Failed to fetch. Nothing was stored.`**, note explains that no record was written, fields preserved for retry, store unchanged. |
| T-043 | Browser-driven interaction verification: form, blocked assets, 404 | `done` | P0 | Contact form driven through the real UI over CDP: submit fired (`isTrusted`), status **`saved`**, fields cleared, store grew to 4 records (`sub_20260923180453_ilb9`), receiver `accepted: 2`. With every JS/3D/font asset blocked the home page still renders **1 844 characters** of readable text with reveals visible. Unknown slug renders the styled 404 with 2 recovery links and 0 errors. |
| T-044 | Form read its transport at load time | `done` | P1 | Found by driving the real UI, not by curl: `data-endpoint` was cached at load, so the receiver address could not be changed without regenerating the site. Now read at submit time. |
| T-045 | Receiver had no CORS headers | `done` | P1 | A cross-origin JSON POST from static hosting is preflighted; without `access-control-allow-origin` and an `OPTIONS` response the form could never have worked in production. Verified: `OPTIONS` → 204, `ACAO=*`. |
| T-046 | Transport note contradicted the outcome | `done` | P2 | The note still said "not configured" after a successful save. Now reports the stored outcome on success and the failure reason on error. |
| T-047 | STALE-SERVER TRAP: verify served bytes before trusting a browser result | `done` | P1 | Three verifications in this engagement were misled by a pre-change copy still bound to a reused port (an axe re-run, a contrast sweep, a form test). Source and build were correct each time. Procedural rule recorded in `docs/09` section 11a. |
| T-042 | Corrected three false positives in my own audit | `done` | P2 | JSON-LD regex (HTML-encoded plus), and two over-broad residue lists containing token and class names that belong to the **current** design or that Tailwind emits structurally. Recorded in `docs/09` section 10a because a checker that fails on non-issues is as damaging as one that passes on real ones. |
| T-037 | Automated accessibility audit on key templates | `done` | P0 | axe-core 4.10.2 injected over CDP on the throttled profile: **0 violations on index and article**, 0 critical and 0 serious everywhere, 37 to 39 passes per page. One moderate `landmark-complementary-is-top-level` was found and fixed (nested `<aside>` to `<div>` in PostPage and ContactPage) and re-audited on a fresh origin at 0 |

### 7.3 Superseded items, restated

| Old row | Now |
|---|---|
| `RP-1` Naghsh tokens and components | superseded by `RP-9` to `RP-13` |
| `RP-6` / `T-024` visual review by a vision model | still `blocked`: the image tool returned 400 again this session. Screenshots delivered for human review instead. |
| `RP-7` / `T-023` admin browser parity | still `deferred`; admin CSS rebuilt against the new tokens |
| `T-011` contrast regression guard, `T-028` table of contents | now partly addressed: the section index is generated into every article, and the golden test pins markup |

**Test baseline after this section: 27 passing, 0 failing.** Build: 0 errors.

### 7.4 Gap-closing pass - 2026-09-23 (later)

Three gaps from section 7.1 were closed with in-browser evidence, and one was reclassified.

| Item | Before | After |
|---|---|---|
| Contrast sweep | `next` | **done.** 119 text styles across 7 routes. Found 3 real AA failures in `--ink-faint`, fixed the token, re-verified 0 failures. Evidence: probe report `probe-report-8241.jsonl` |
| Context-loss rehearsal | `next` | **done.** `WEBGL_lose_context` fired: `scene=context-lost`, canvas present, body visible, 0 errors, all 7 routes |
| Field performance | `next` | `in-progress`. LCP/CLS/TTFB measured in-browser; INP still unmeasured. The 3D gate is measurable: 179 KB -> 45 KB initial weight at a 390 px viewport |
| Cross-browser | `next` | **blocked.** No second engine installed on this machine; needs a device or a remote browser service |

**Test baseline unchanged: 27 passing, 0 failing.** Build: 0 errors. Pages: 19.
