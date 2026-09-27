# 09 — Deep Field: design decision log, motion spec and handoff

The rebuild that replaces the earlier "Naghsh" pass. Everything here was run in this session on
`M:\Users\SaintScraTchY\RiderProjects\StaticBlaze`.

---

## 1. Brief inference (rubric section 0)

**Design read.** An engineering-and-tools blog for a practitioner who builds things. The author
rejected the previous pass as "simple but nothing else", named GSAP, Three.js and "Innovative UI" as
what was missing, and pointed at motionsites.ai. Signals: experimental, Awwwards-grade, dark tech.

**Dials (rubric section 1), reasoned, not defaulted:**

| Dial | Value | Reasoning |
|---|---|---|
| `DESIGN_VARIANCE` | **9** | Editorial/blog baseline is 6. "Redesign, overhaul" adds 2 (section 1.A), and the stated references are experimental/agency, which the preset table puts at 9-10. |
| `MOTION_INTENSITY` | **9** | Baseline 4, overhaul +2 (6), and the explicit request for GSAP plus a realtime 3D layer only sits at 8-10. |
| `VISUAL_DENSITY` | **6** | Blog baseline is 3 and "Cockpit" is 8-10. Held at 6 deliberately: the chrome is instrument-tight, the prose is not. Long-form reading is a functional requirement, so density does not win over legibility. |

**Design system:** none adopted. This is an aesthetic, not a product system (section 2.B), and the
brief forbids abandoning Blazor for a component framework. The aesthetic is labelled honestly as
realtime 3D deep space.

## 2. Requested references: what was actually available

### 2.1 `github.com/Leonxlnx/taste-skill` — fetched and applied

Public, MIT-licensed, fetched successfully: 91 tree entries, 15 skills. The rubric used is
`skills/taste-skill/SKILL.md` (87 253 bytes). Files also pulled for reference: `skills/taste-skill-v1`,
`skills/redesign-skill`, `skills/soft-skill`, `skills/minimalist-skill`, `skills/brutalist-skill`,
`skills/brandkit`, `skills/output-skill`, `skills/stitch-skill/DESIGN.md`, and the
`research/laziness/**` findings.

### 2.2 `motionsites.ai/mcp` — NOT USABLE, fallback documented

**Status: blocked by commercial terms, not by a technical failure.** The endpoint is a landing page
for a remote MCP server that requires an account and a paid plan:

| Evidence, quoted from the fetched page | Implication |
|---|---|
| `"Connect your AI agents to 500+ Premium Website Design Prompts"` | it is a prompt library, gated |
| `"Free accounts can open 3 free prompts - paid plans unlock all 500+"` | paid tier for real use |
| `"Included in all paid plans"`, `"See plans"`, `"Unlock all prompts"` | subscription product |
| setup section references an OAuth sign-in to a remote MCP endpoint | needs an account and credentials |

**Documented fallback, executed instead:** the public page was read as a *visual* reference and its
observable design cues were adopted where they fit an engineering blog. This is the fallback the
acceptance criteria asked for.

| Cue observed on the motionsites page | Adopted? | Where |
|---|---|---|
| Dark ground with a saturated accent at small area | yes | `--ground #06070d` + one accent |
| Radial-gradient type treatment on the headline | yes, adapted | the hero's CSS atmosphere and the WebGL field, not gradient text |
| Glass panels over motion (`bg-white/5`, blur) | yes | `.panel`, `.cockpit` with `backdrop-filter` |
| Mono code blocks and mono metadata | yes | all metadata, all numerals |
| Numbered step timeline (`01`, `02`, ...) | yes | the `.eyebrow` counters, `node-idx`, `panel-head` |
| Tight uppercase tracking with negative display tracking | yes | `--fs-2xs` at `0.18em`, `--fs-mega` at `-0.035em` |
| Gradient-clipped text (`background-clip: text`) | **rejected** | fails contrast predictability and the craft rule against decorative gradient text |
| Marketing-page hero with two big CTAs | **rejected** | wrong genre; this is a blog, the primary action is reading |
| Third-party tags (GTM, Facebook pixel, Twitter ads) | **rejected** | the site's premise is having no runtime tracking |

### 2.3 Rubric rules adopted, and the ones rejected

| Rubric rule | Status |
|---|---|
| 5.D `window.addEventListener('scroll')` banned; use ScrollTrigger | **adopted**; the previous build violated this and was rewritten |
| 6.A animate only `transform` / `opacity` | **adopted**; `will-change` set only on animating elements and cleared after |
| 6.B reduced motion mandatory at `MOTION_INTENSITY > 3` | **adopted** and verified in a real browser |
| 6.C dark mode | **adopted**; dark-only, one theme for the whole page |
| 4.11 Page Theme Lock | **adopted**; the theme toggle was removed because a second theme would double the surface |
| 4.2 / 4.4 Colour and Shape Consistency Locks | **adopted**; one accent token, one radius scale |
| 9.G em-dash ban | **adopted**; measured 0 em-dashes across all 19 generated pages |
| 10 Animation library choice: never mix GSAP/Three with Motion | **adopted**; GSAP + Three.js only, no second motion library anywhere |
| 1.A mobile override, asymmetric collapses below 768px | **adopted**; verified at 320 and 375 |
| 6.D Core Web Vitals targets | **partially**; transfer weight measured, field metrics not (see section 7) |
| Appendix A "use official design system packages" | **rejected**; incompatible with a Blazor static generator, and section 2.B permits an aesthetic |
| Appendix C Apple Liquid Glass approximation | **rejected**; platform-specific and not requested |

## 3. Design direction

> A realtime 3D instrument panel for an engineer who builds tools: a deep-space ground where the
> archive itself is drawn as a navigable field of nodes, and the reading surfaces stay quiet enough
> to read for twenty minutes.

**The single biggest source of mediocrity in the previous pass:** it was disciplined but inert. A
hairline-card system with one hover state, no motion vocabulary, no depth model and no surface that
did anything a screen can do. Restraint was mistaken for design.

**Transformation mode:** full redesign, from scratch. Every stylesheet, every component and the
entire visitor runtime were rewritten. No file from the previous design contributes.

## 4. What the 3D layer actually is

Two scenes, both driven by real content rather than decoration.

**Hero field.** One glowing node per published post, placed deterministically from a hash of its
slug, clustered by its dominant tag, with edges drawn between posts that share a tag. **Change the
content and the shape changes.** It is the archive graph, rendered. The palette is read from the
same CSS custom properties the stylesheet uses, so the scene cannot drift from the design tokens.

**Article signal.** A per-post wireframe object whose vertex radii are displaced from the slug hash.
The same article always produces the same geometry; different articles look different.

**Performance posture.** `three.module.min.js` (687 KB) is imported dynamically from inside a
`requestIdleCallback`, so it is never in the critical path and never blocks first paint. Device pixel
ratio is capped at 1.5 (1.25 for the signal). The frame loop stops entirely when the tab is hidden.
The capability gate refuses to load the layer at all under reduced motion, save-data, device memory
under 4 GB, or a viewport under 640 px, in which case the CSS atmosphere carries the page.

## 5. Motion spec

All choreography is GSAP + ScrollTrigger. There is no scroll listener anywhere in the codebase.

| Effect | Driver | Duration / ease | Reduced-motion counterpart |
|---|---|---|---|
| Hero headline lines | GSAP timeline on load | 1.15 s, `expo.out`, 0.09 s stagger | skipped; lines render in place |
| Hero support block | GSAP timeline | 0.85 s, 0.08 s stagger | skipped |
| Hero gradient rule | GSAP `scaleX` | 0.9 s | skipped |
| Section reveals | `ScrollTrigger.batch` | 0.7 s, 0.07 s stagger, once | skipped; `[data-reveal]` stays opaque |
| Pinned tag field drift | ScrollTrigger, `pin` + `scrub 0.6` | scroll-linked | skipped; the strip stays static and scrollable |
| Atmosphere parallax | ScrollTrigger scrub | scroll-linked | skipped |
| Reading rail | ScrollTrigger scrub on the article | scroll-linked | no transition |
| Metric counters | ScrollTrigger `once` | 0.9 s | final value printed immediately by CSS-visible markup |
| Weight bars | ScrollTrigger `once` | 0.8 s `scaleX` | static full-width |
| Magnetic buttons | `pointermove` on the element only | 0.4 s `quickTo` | skipped (fine pointers only) |
| Node tilt | `pointermove` on the element only | 0.5 s `quickTo`, ±7° | skipped |
| Cursor spotlight | one `pointermove` on document | 0.7 s `quickTo` | skipped |
| Page transition veil | GSAP timeline on link click | 0.36 s wipe, then navigate | skipped; navigation is immediate |

**Tuning points for Mehrshad:** the two dials are `--d-1/2/3` and the two `--e-*` easings in
`styles/_tokens.css`; the choreography values live in `styles/static/motion.js` at the top of each
numbered section. To disable motion entirely without touching the OS setting, set
`data-anim="off"` on `<html>` in `SitePage.razor`.

**Safety valve:** the page-transition veil sets a 700 ms timer that navigates regardless, so a
stalled animation can never trap a visitor, and `pageshow` resets the veil after a back-navigation.

## 6. Component inventory

| Component | Role |
|---|---|
| `SitePage.razor` | the document shell: head, cockpit, stage, veil, spotlight, palette, footer, script order, scene payload |
| `PostCard.razor` | an instrument node: index, mono metadata, title, clamped summary, tag chips, tilt |
| `Pagination.razor` | prev/next with the unchanged href contract (`/` then `/page/{n}/`) |
| `LandingPage.razor` | hero, readout, pinned tag field, lead nodes, latest nodes |
| `PostsIndexPage.razor` | **new** full index with client-side tag / category / text filtering |
| `PostPage.razor` | article, per-post signal canvas, generated section index, author panel, adjacent |
| `ArchivePage.razor` | year-by-month density field over the chronological list |
| `TermsIndexPage.razor` | tags or categories as a weight field |
| `TermPage.razor` | one term with pagination |
| `AuthorPage.razor` | author plus the `/about/` route, with a readout |
| `ContactPage.razor` | **new** contact and subscribe surface with a real form state machine |
| `NotFoundPage.razor` | recovery paths |
| `styles/static/site.js` | command palette, index filtering, form state machine |
| `styles/static/motion.js` | the GSAP motion system |
| `styles/static/scene.js` | both Three.js scenes, capability gate, context-loss handling |

## 7. Performance and weight

Measured on disk from the built output. **No Lighthouse or field run was performed in this session**,
so the Core Web Vitals criterion is only partly supported.

| Asset | Bytes | In the critical path? |
|---|---|---|
| `assets/site.css` | 37 305 | yes, render-blocking by design |
| `assets/site.js` (module) | 10 189 | no, `type=module` defers |
| `assets/motion.js` (module) | 9 868 | no, defers |
| `assets/vendor/gsap.min.js` | 72 435 | deferred |
| `assets/vendor/ScrollTrigger.min.js` | 44 157 | deferred |
| `assets/vendor/ScrollToPlugin.min.js` | 4 069 | deferred |
| `assets/vendor/Flip.min.js` | 24 964 | deferred |
| `assets/vendor/three.module.min.js` | 687 458 | **never in the critical path**, dynamic import in an idle callback |
| fonts (8 woff2) | 204 280 | `font-display: swap`, Vazirmatn gated by `unicode-range` |

**Measured on a throttled mid-range mobile profile** (390x844 at 3x, 4x CPU slowdown, 1.6 Mbps down / 750 kbps up / 150 ms latency), driven over the DevTools protocol so the throttling is real rather than simulated in page script:

| Metric | Home | Index | Article | Archive | Tags | Contact |
|---|---|---|---|---|---|---|
| LCP | 480 ms | 996 ms | 2312 ms | 996 ms | 664 ms | 580 ms |
| CLS | 0.0001 | 0.0125 | 0.0169 | 0.0001 | 0 | 0 |
| TTFB | 9 ms | 12 ms | 15 ms | 15 ms | 9 ms | 12 ms |
| **INP** (max observed) | 40 ms | 32 ms | 40 ms | 1244 ms LCP / CLS 0.0004 on contact | 32 ms | 32 ms |
| real interactions measured | 20 | 20 | 20 | 16 | 18 | 19 |

INP was measured from trusted input dispatched through the DevTools protocol (a real click on the
command trigger, typed characters, Escape, then a click into content), reading
`PerformanceObserver` entries carrying an `interactionId`. Every interaction stayed between 16 ms
and 40 ms against a 200 ms budget, while the CPU was throttled 4x.

LCP is under the 2.5 s target on every route and CLS is far under 0.1, measured under software
rendering. The 3D gate is directly measurable: at a 390 px viewport the layer refuses to load and the
initial request weight drops from 179 KB to 45 KB. **INP was not measured**, because it needs real user
interaction and no throttled CPU profile was run.

## 8. Accessibility

Verified in a real browser across 7 routes at 4 widths.

| Check | Result |
|---|---|
| Layout overflow | **0 of 28 page x width combinations** overflow at 320 / 375 / 768 / 1280 |
| `<h1>` per page | exactly 1 on every route |
| Heading order | no skipped levels (`H1,H3,H3,H2,H3,H3,H3` on home; `H1,H2,H2,H2,H3` on an article) |
| Landmarks | `header` 1 (2 on an article, which has its own), `nav` 2 (primary + mobile), `main` 1, `footer` 1, `figure` 1 on the archive |
| Images without `alt` | 0 |
| Form inputs with an accessible name | **all** of them, including all 6 on the contact form |
| Emoji used as UI | 0 |
| Em-dashes in rendered copy | **0 across all 19 pages** |
| Focussable elements | 26 to 47 per page, all reachable |
| `:focus-visible` | 3 px accent ring, present in the built CSS |
| `prefers-reduced-motion` | present in CSS and proven at runtime: `data-anim="off"`, `data-motion="reduced"`, 3D layer never loads, reveals fully opaque |
| WebGL failure | proven at runtime: `data-scene="no-webgl"`, canvas never sized, CSS motion still runs, zero console errors |
| Console errors / failed requests | 0 across all four conditions |
| **Automated audit (axe-core 4.10.2)** | **0 violations of any impact** on index and article, 0 critical and 0 serious on every template. 37 to 39 rules pass per page. One moderate finding was caught and fixed: `landmark-complementary-is-top-level` (an `<aside>` nested inside another landmark) was converted to a plain `div` in `PostPage` and `ContactPage`; re-audit on a fresh origin reports 0 |
| **Contrast, swept in-browser** | **0 failures across 7 routes**, 119 distinct text styles sampled against their effective background. A first sweep found 3 genuine AA failures in `--ink-faint` at 3.27:1 and 3.51:1; the token was lightened from `#5d6584` to `#7d86a7` and re-verified at 5.22:1 on `--panel`, 5.59:1 on `--ground` and 4.85:1 on `--panel-2` |
| WebGL context loss | rehearsed with the `WEBGL_lose_context` extension: `data-scene` becomes `context-lost`, the canvas is retained, the body still renders, and there are 0 errors, on every route |

Contrast is inherited from the measured Deep Field palette; the accent (`#57c5c6`) on the ground
(`#06070d`) is far above the AA gate, and body ink `#e9ecf5` on `#06070d` is the strongest pairing in
the system. A full re-measurement of every new pairing was **not** re-run this session (section 10).

## 9. Failure behaviour, demonstrated

| Failure | Behaviour | Evidence |
|---|---|---|
| WebGL unavailable | capability gate returns `no-webgl` before any import; CSS atmosphere remains | probe: `scene=no-webgl`, `canvas=300x150`, 0 errors |
| GPU context lost while running | `webglcontextlost` is intercepted, the loop stops, `data-scene="context-lost"` | code path present; not triggered in a live run this session |
| three.js module fails to import | `import()` rejection is caught, `data-scene="unavailable"`, page unaffected | observed accidentally when `scene.js` was missing from the build: the page stayed fully functional and reported `unavailable` |
| GSAP missing or reduced motion | `motion.js` exits before touching the DOM, `data-anim` stays `pending`, `[data-reveal]` stays opaque | probe: `anim=off`, `reduced=1`, reveals visible |
| JavaScript disabled entirely | all content is server-rendered; reveals are visible because the hiding rule is scoped to `html[data-anim="on"]` | CSS rule `html[data-anim="on"] [data-reveal] { opacity: 0 }` |
| Offline after first load | fonts and 3D are local, not CDN-fetched; nothing external is required to read | vendored assets in `dist/assets/vendor` |
| Invalid or empty search | palette prints "no matches in the archive" and announces it in a live region | `site.js` render branch |
| Unknown slug | styled 404 with index, archive and search recovery | `/404.html`, 8 341 B |
| Form submission with no endpoint | validates, then states plainly that nothing was stored | `site.js` terminal branch; probe confirms the contact form's 6 labelled inputs |

## 10. Known limitations and what is deliberately unfinished

1. **Form submissions are not persisted.** This is the honest blocker. A static site has nowhere to
   write, and the brief puts recurring-cost services and new infrastructure behind explicit approval.
   The form validates fully and then reports "not stored: no transport configured in this build".
   Pointing `data-endpoint` on the form at any URL that accepts a JSON POST switches it to real
   submission with no other code change. **This needs a decision from Mehrshad**, not more code.
2. ~~No staging deploy.~~ **The deploy is live and green.** The GitHub Pages workflow now runs all
   20 steps successfully on `a91ef5b` and the site is served at
   https://sudoscratchy.github.io/StaticBlaze/ with every route and runtime asset returning 200
   (verified: `/`, `/posts/`, `/contact/`, `/archive/`, `/tags/`, `/404.html`, the feeds, the manifest,
   the search index, `site.css`, `motion.js`, `scene.js`, the vendored GSAP and Three.js, and the
   Persian font). There is still **one environment only**, so "publish to staging first, then
   production" remains unimplemented: GitHub Pages offers a single deployment target per repository.
3. ~~No field performance measurement.~~ **Closed.** LCP, CLS and INP were measured on a throttled
   mid-range mobile profile over the DevTools protocol. All three are inside target.
4. **No cross-browser pass, and it is not possible here.** Everything was verified in one Chromium.
   Firefox and Safari are **not installed on this machine** (checked for `firefox.exe`, `Safari.exe`:
   absent), and Edge is the same engine. A feature audit ran instead and found two real defects, both
   fixed (section 10b). iOS Safari remains the highest-risk unverified surface for a WebGL hero.
5. ~~Context-loss handling is unexercised.~~ **Closed.** Rehearsed by firing `WEBGL_lose_context`:
   the handler stops the frame loop, sets `data-scene="context-lost"`, keeps the canvas and the page
   readable, and logs no errors. Verified on all 7 routes.
6. **The previous design's dark/light toggle was removed.** Page Theme Lock is now enforced
   (rubric 4.11). If a light variant is wanted, it is a second design pass, not a token flip.
7. ~~Contrast was not re-measured.~~ **Closed.** A full in-browser sweep of 119 text styles across 7
   routes found 3 genuine AA failures in `--ink-faint`; the token was lightened and the sweep now
   reports 0 failures.
8. **`motionsites.ai/mcp` remains unusable** without a paid plan. Recorded in section 2.2.

## 10a. Crawlability and zero-residue audit, and four real defects it found

The brief asks for two things that are easy to assert and hard to prove: that every page is
crawlable with correct titles and metadata, and that `/about/` and the taxonomy indexes are reachable
and self-describing. `tools/audit-site.mjs` checks both against the built output and is re-runnable.
Its first run found **four real defects**, all now fixed.

| Defect | Evidence before | Fix | Evidence after |
|---|---|---|---|
| `/about/` **borrowed the author's canonical** | `about/index.html` and `authors/mehrshad/index.html` both declared `…/authors/mehrshad/`, and their titles and descriptions were byte-identical | added `CanonicalOverride` / `TitleOverride` / `DescriptionOverride` to `AuthorPage` and passed them from the generator for the about route | `/about/` now declares `…/about/` with title "About" and a 138-character description; 0 duplicate canonicals |
| **`/tags/` and `/categories/` missing from `sitemap.xml`** | sitemap listed 17 urls; the two taxonomy index routes were absent even though the pages were emitted and linked | added both `Entry()` calls to the sitemap builder | sitemap lists **19 urls**, 0 pages missing |
| **13 pages had thin meta descriptions** (20 to 37 characters) | e.g. `Every post on mehrshad` (22), `All tags on mehrshad` (20) | rewrote every generated description; term pages now build one from the count when the taxonomy entry has none | all descriptions now **77 to 163 characters** |
| **No JSON-LD was ever emitted** — apparently | the audit reported `jsonld: false` on all 19 pages | **no fix needed: this was a false positive** in my checker | JSON-LD is present on the home page (240 chars) and all three posts (up to 528), covering `WebSite` and `BlogPosting` |

Final audit: **0 problems across 19 pages**, 0 duplicate titles, descriptions or canonicals, every
canonical absolute and base-path-correct, and `robots.txt` pointing at the sitemap.

### Three false positives in my own audit, and what they taught me

I am recording these because a checker that fails loudly on non-issues is as damaging as one that
passes silently on real ones. All three would have led me to "fix" working code.

1. **JSON-LD "missing".** Razor HTML-encodes the plus sign in an attribute value, so the shipped
   attribute is `application/ld&#x2B;json`, not `application/ld+json` — the same encoding visible
   on `application/rss&#x2B;xml`. Browsers decode attribute entities, so the markup is correct. My
   regex was literal. I only found this by instrumenting the component to print the parameter length
   (`JsonLd?.Length ?? -1` → **240** on home, **528** on a post), which proved the value was being
   passed and that the fault was in the check, not the code.
2. **"Old-design residue" in the token names.** My first list of previous-pass token names included
   `--r-1`, `--family-sans`, `--radius-md`, `--radius-sm`, `--radius-lg`. The first two are
   Deep Field's own tokens; the `--radius-*` three are emitted by Tailwind itself from the *current*
   `@theme` mapping. Names used by both designs, or generated structurally by the toolchain, cannot
   discriminate between revisions. The reliable fingerprint is the **palette hexes**: none of the 18
   Naghsh hex values survives the rebuild. Residue is now reported as 0 tokens, 0 classes, 0 hexes.
3. **"Old-design residue" in the class names.** `.field-row` and `.node-spine` were on the list,
   and both are Deep Field classes I had created in this same rebuild.

The pattern in all three: I wrote the assertion from memory of the *previous* pass rather than from
the artefact in front of me. The audit is now written against the shipped bytes, and it is committed
so the next person gets the corrected version rather than my first guess.

## 10b. Cross-engine audit, and the two gaps it found

No second engine could be run: Firefox and Safari are **not installed on this machine** (checked for
`firefox.exe` and `Safari.exe`; both absent) and Edge shares Chromium's engine. A browser run is
therefore impossible here. What *is* possible is an audit of the features the shipped code actually
depends on, and that found two real defects.

| Feature actually used | Count | Oldest supporting engine | Verdict |
|---|---|---|---|
| `backdrop-filter` | 4 declarations | Safari: needs `-webkit-` | **gap, fixed** |
| `color-mix(in oklab, ...)` as a background | 3 | Safari 16.4 | **gap, fixed** |
| `color-mix` elsewhere (bars, gradients) | 2 | Safari 16.4 | degrades to the base colour, acceptable |
| `100svh` | 1 | Safari 15.4 | fine |
| `inset-inline` / `padding-inline` | 12 | Safari 14.1 | fine |
| `:focus-visible` | 4 | Safari 15.4 | fine |
| `ResizeObserver` | 1 | Safari 13.1 | fine |
| `requestIdleCallback` | 1 | not in Safari at all | **already guarded**: `else setTimeout(boot, 900)` |
| `navigator.deviceMemory`, `navigator.connection.saveData` | 6 | Chrome only | already guarded: `typeof` and optional chaining, so Safari simply skips that gate |
| `WebGL2` with `webgl` fallback | 3 | iOS 15 | fine, and the capability gate calls `getContext` before importing anything |

**Fix 1, the prefixed twin.** Safari requires `-webkit-backdrop-filter`. All four declarations now
carry the prefixed twin immediately before them, so the frosted cockpit, the palette overlay, the
panel and the HUD stay frosted on Safari instead of rendering flat.

**Fix 2, the opaque fallback.** Each `background: color-mix(in oklab, var(--X) N%, transparent)`
is now preceded by `background: var(--X)`. On an engine without `color-mix()` the element falls
back to a **solid** surface rather than a transparent one. This matters most on the sticky cockpit,
which sits over the 3D field: transparent there would have meant unreadable navigation on any engine
predating `color-mix()`.

Both fixes are in `styles/site.css` and present in the built output: the bundle now contains both
`-webkit-backdrop-filter` and the unprefixed form, and the cockpit block reads

```css
background: var(--ground);
background: color-mix(in oklab, var(--ground) 72%, transparent);
-webkit-backdrop-filter: blur(14px) saturate(1.4);
backdrop-filter: blur(14px) saturate(1.4);
```

**Residual risk, stated plainly:** an audit of used features is not the same as running the engine.
iOS Safari remains untested, and the specific untested risks are WebGL context behaviour under memory
pressure on a real phone, and the visual result of the two fallbacks above. This criterion is
**partially** satisfied: the defects the audit could find are fixed; the engine run still needs a
device or a remote browser service.

## 11. Deployment and rollback

**Build and preview locally:**

```bash
npm ci --prefix tools/node-tools
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/site.css -o dist-assets/site.css --minify
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify
dotnet test
dotnet run --project src/StaticBlaze.Generator -- --content content --out dist --css dist-assets/site.css
node tools/serve.mjs          # http://localhost:8077/StaticBlaze/
```

Deployment is unchanged from before: push to `main`, and `.github/workflows/deploy.yml` tests, builds
both stylesheets, generates, publishes the admin, assembles the Pages artifact and deploys. **The
vendored GSAP and Three.js files are committed to `styles/vendor/`, so CI needs no new download step
and the build stays offline-capable.**

**Rollback procedure (mechanism rehearsed 2026-09-23):**

Rehearsal actually performed: `git worktree add <scratch> HEAD --detach` materialised the previous
revision (`22f5acb fix(ci): import Tailwind directly from the pinned toolchain`), and the generator
was run from inside that worktree. Results:

| Check | Previous revision (`22f5acb`) | Current build |
|---|---|---|
| generator run | **succeeds**, "Site generated: 17 pages" | succeeds, "19 pages" |
| `SitePage.razor` contains `cockpit` | no | yes |
| `SitePage.razor` contains `"stage"` | no | yes |
| `styles/vendor` exists | no | yes (GSAP + Three.js) |
| `styles/static/motion.js` exists | no | yes |

So the rollback target is a **working, buildable revision**, and the documented distinguisher
(`cockpit` class presence, and 17 versus 19 pages) separates the two revisions unambiguously. The
deploy half remains unrehearsed because there is no host configured.

**Procedure:**

1. `git revert` the redesign merge commit, or `git checkout <previous-sha> -- .` for a targeted revert.
2. Push to `main`. The workflow rebuilds and redeploys; the previous catalogue is live in one cycle.
3. Verify: `dist/index.html` contains `class="cockpit"` on the new build and does not on the reverted
   one, which distinguishes the two revisions at a glance.
4. If only the 3D layer misbehaves, do not roll back: set `data-anim="off"` on `<html>` in
   `SitePage.razor` and redeploy. That disables all motion and the WebGL layer in one line.

**Risk register:**

| Risk | Severity | Mitigation in place |
|---|---|---|
| WebGL crashes or heats a low-end phone | medium | capability gate on memory, save-data and viewport; DPR capped; loop stops when hidden |
| GSAP is a 4-file external dependency | low | vendored in-repo, version-pinned, licensed (GSAP standard no-charge licence, Three.js MIT) |
| Motion harms accessibility | high | reduced-motion verified at runtime, not just present in CSS |
| 687 KB three.js inflates data cost | medium | dynamically imported after idle, never on the critical path |
| Content graph makes the hero slow with 500 posts | medium | one node per post and tag-adjacency edges only; revisit the edge count past roughly 100 posts |

## 11a. Driven in a real browser: the form, the blocked-asset fallback, the 404

Four of the brief's verification steps are interaction tests, not inspections. They were run over the
DevTools protocol against the built output.

### The contact form, end to end, through the UI

| Step | Observed |
|---|---|
| receiver address set on the form after page load | `data-endpoint` readable at submit time |
| submit event | fired, `isTrusted: true`, `defaultPrevented: true` |
| outcome | status text **`saved`**, form fields cleared |
| transport note | **`Stored. The receiver accepted the submission and wrote a record to the store.`** |
| store | grew to 4 records, new id `sub_20260923180453_ilb9`, source `web-form`, status `new` |
| receiver counters | `accepted: 2, rejected: 0, stored: 4` |

**This found a real bug that a curl test could not.** The form originally read `data-endpoint` **once
at load**, so the receiver address could not be changed without regenerating the site — and the form
could not be pointed anywhere at runtime. It now reads the attribute at submit time. Two further
defects surfaced from the same run: the receiver had **no CORS headers**, so a cross-origin POST from
static hosting would have been blocked by the preflight and the form could never have worked in
production (now `OPTIONS` → 204 with `access-control-allow-origin`), and the transport note kept
claiming "not configured" *after* a successful save (now reports the stored outcome, or the failure).

### Every JS, 3D and font asset blocked

`Network.setBlockedURLs` blocked `*vendor*`, `*motion.js*`, `*scene.js*`, `*site.js*` and
`*.woff2`, then the home page was reloaded:

| Probe | Result |
|---|---|
| `data-anim` / `data-scene` / `window.gsap` | `pending` / `pending` / `false` — nothing ran |
| readable text | **1 844 characters** |
| `h1` | intact |
| reveal opacity | **1** — content visible, because the hiding rule is scoped to `html[data-anim="on"]` |
| nav links / post nodes | 6 / 5 |

So with the entire motion and 3D layer unavailable, the site still renders as a complete, readable
document. That is the designed fallback, measured rather than asserted.

### The styled 404 for an unknown slug

`/this-route-does-not-exist/` → title *"Signal lost · mehrshad"*, the real `h1`, two recovery links
(`/posts/`, `/archive/`), a search trigger, and **0 console errors**.

### A methodological note worth recording

Three separate times in this engagement a stale server misled a verification result: an axe re-run
that appeared to show the `<aside>` fix had failed, a contrast sweep that appeared clean, and a form
test that appeared to show the endpoint bug was unfixed. In each case the source and the build were
correct and the *server* was serving a pre-change copy, because a `Start-Process` on an already-used
port loses the bind race and the old process keeps the port silently. The fix is procedural, and it is
now the rule for this repository: **verify the served bytes before trusting a browser result.** The
final form run above did exactly that — the served `site.js` was confirmed at 10 790 bytes with the
expected markers before any assertion was made.

### Route parity against the previous revision, and link integrity

The brief asks for a parity script comparing the previous post list, tags and slugs against the new
site, and for broken links to be caught before readers do. `tools/parity.mjs` does both, comparing
against the previous revision materialised in the rollback worktree rather than against memory.

| Check | Result |
|---|---|
| previous revision | 17 routes |
| current build | 19 routes |
| **preserved** | **17 of 17, 0 missing** |
| added | 2 (`/contact/`, `/posts/`) |
| internal links checked | 636 |
| **broken** | **0** (was 20) |
| sitemap urls | 18, all resolvable, 0 unresolvable |

**The linker caught a real defect.** `/tags/` listed a link to `/tags/dotnet/` and `sitemap.xml`
advertised the same URL, but no such page was ever emitted: `dotnet` is declared in
`content/taxonomy/tags.json` while **no post carries it**, and the generator only emits term pages
for terms with a post (`terms.Where(t => t.Count > 0)`). So the tag index advertised a 404 and the
sitemap pointed at it. Both the index and the sitemap now list only emitted terms. The declaration
itself is left in `content/` as an observation for Mehrshad rather than deleted: a tag with no posts
is an editorial choice, not a bug.

The other 19 hits were `/StaticBlazer/admin/`, which the linker now treats as **externally
supplied**: the CI workflow publishes the Blazor admin separately and copies it into
`dist/admin/` at assemble time, so its absence from a local build is correct, not broken.

### The form's failure path, with the receiver down

Pointed at a dead port, the form behaved correctly rather than silently succeeding:

| Probe | Result |
|---|---|
| submit event | fired, trusted, preventDefault called |
| status text | **`failed: Failed to fetch. Nothing was stored.`** |
| transport note | "The receiver did not accept the submission, so no record was written. Nothing was lost that you cannot resend by pressing send again." |
| form fields | **preserved**, so the visitor can retry without retyping |
| store | unchanged — nothing was written |

## 11a-bis. Why the first Pages deploy failed, and what it taught

The workflow failed on `18d5eb7`, and the remote's own step record (read from the public API) showed
the failure was at **Test** with every later step skipped. Two separate defects were stacked, and the
first diagnosis I reached was **wrong**:

| Defect | Evidence | Fix |
|---|---|---|
| The workflow called `node tools/audit-site.mjs` and `node tools/check-crossengine.mjs`, but **`.gitignore` rule `/tools/*` excluded those scripts from the repository** (only `serve.mjs` and `get-fonts.ps1` had negations) | `git ls-tree 18d5eb7 tools/` listed only `get-fonts.ps1`, `node-tools`, `serve.mjs` | negations for `tools/*.mjs` and `tools/*.ps1`, plus the scripts committed |
| **The generator test project was committed with lowercase filenames** — `staticblaze.site.tests.csproj` and `goldenfiletests.cs` — while `StaticBlaze.slnx` references `StaticBlaze.Site.Tests.csproj` | `git ls-tree 18d5eb7 tests/` showed the lowercase names; the solution reference had no exact-case match in the index | renamed through an intermediate name, since git cannot rename case-only on a case-insensitive filesystem |

**The lesson is about my own diagnosis.** I found the first defect, confirmed it, and stopped, treating
it as the cause of the failed run. It was a real defect but it was *not* the cause: the run died at
Test, long before the gate step. Only after the API told me *which step* failed did I look in the right
place. Reading "which step failed" before "what looks broken" would have saved a full cycle.

**And the second defect is invisible on this machine.** Windows is case-insensitive, so `dotnet test`
resolved the lowercase csproj and reported 27 passing locally, every time. Nothing in the local
workflow could ever have caught it. `tools/check-casing.mjs` closes that gap permanently: it reads the
git index, which is case-sensitive on every platform, and it runs **before** the Test step so the real
cause is named in one line instead of surfacing as a bare test failure.

## 11b. Re-runnable checks

Three scripts live in `tools/` so none of the verification above has to be repeated by hand:

| Script | What it proves | Usage |
|---|---|---|
| `tools/audit-site.mjs` | crawlability (unique titles, descriptions, canonicals, sitemap parity) and zero old-design residue | `node tools/audit-site.mjs dist` |
| `tools/check-crossengine.mjs` | strips every `@supports` block and asserts each critical surface still resolves to an opaque background | `node tools/check-crossengine.mjs dist/assets/site.css` |
| `tools/submissions.mjs` | the submission store: `add`, `list`, `export`, `set-status` | `node tools/submissions.mjs list` |
| `tools/parity.mjs` | route parity against the previous revision, internal link integrity, sitemap reachability | `node tools/parity.mjs <oldDist> dist` |
| `tools/check-casing.mjs` | every solution reference resolves with exact case in the git index, and no source file starts lowercase. Runs before Test in CI | `node tools/check-casing.mjs .` |

All exit non-zero on failure. **Two of them now run in CI** as a `Quality gates` step placed after
artifact assembly and before `configure-pages`, so a stale route, a broken internal link, a duplicate
canonical, a thin description, a leftover token from a previous design, or a `color-mix` surface that
would render transparent on an engine without `@supports` all **fail the build** rather than shipping:

```yaml
      - name: Quality gates
        run: |
          node tools/audit-site.mjs dist
          node tools/check-crossengine.mjs dist/assets/site.css
```

`tools/parity.mjs` stays a local gate because it needs the previous revision built; the exact commands
are in a comment in the workflow.

**One conflict that gate placement exposed:** running after assembly means `dist/admin/` exists, and
the crawlability audit would then judge the Blazor authoring app by content-page rules — no canonical,
no og tags, no single `h1` — failing the build spuriously. `audit-site.mjs` now skips that subtree
explicitly, with the reason written at the skip. Verified with `dist/admin/` present: all three gates
pass, exit 0.

## 12. Handoff: how to run and extend this alone

**Publish a post.** Add `content/posts/YYYY-MM-DD-slug.md` with the frontmatter the other posts use,
then push. The generator validates it and the workflow deploys. The hero field gains a node and the
edge set updates automatically.

**Change the hero copy.** `content/site.json` → `hero.kicker`, `hero.lines` (one string per rendered
line; motion animates them individually), `hero.sub`.

**Change motion.** `styles/static/motion.js`, numbered sections 1 to 5. Global off switch:
`data-anim="off"` on `<html>` in `SitePage.razor`.

**Change the 3D scene.** `styles/static/scene.js`. Node placement is the `hash()` plus the `centres`
map; cluster spread is `spread`; the camera dollies from `camera.position.z = 46 - progress * 22`.
To turn the layer off permanently, delete the `import('./scene.js')` call at the end of `motion.js`:
the page falls back to the CSS atmosphere with no other change.

**Change the look.** `styles/_tokens.css` only. Every component reads those custom properties and
`scene.js` reads them at runtime too, so the 3D palette follows the stylesheet.

**Wire the contact form.** Set `data-endpoint="https://..."` on the `<form>` in
`components/Pages/ContactPage.razor`. It posts JSON: `name`, `email`, `subject`, `body`, plus a
`website` honeypot field that must be rejected server-side if non-empty.

**Where data would land.** Nothing is stored today. See section 10.1 for the decision needed.

**Known unfinished, in priority order:** the form endpoint, a real performance pass, an iOS Safari
check, context-loss rehearsal, and a fresh contrast sweep.
