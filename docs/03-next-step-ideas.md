# 03 — Next-Step Idea Backlog

15 candidate next steps for StaticBlaze, each scored on **Impact** (reader/author value),
**Effort** (engineering time at this codebase's scale) and **Risk** (chance of breaking existing
behaviour or public URLs). Scores are H / M / L.

Two branches are covered throughout, because the assessment in `docs/02-task-assessment.md` shows
the project sitting between them:

- **Branch A — "the current task is finished."** The v2 rewrite is done; what is left is deferred
  features, hardening and growth.
- **Branch B — "the current task is still open."** The rewrite is not signed off; what is left is
  closing the documented-but-missing items (F1–F5) and the defects (F2, F7, F8, F9).

Ideas tagged **A** or **B** are specific to a branch; untagged ideas help both.

---

## The backlog

### 1. Make the documented local build actually produce a runnable site — `B` · Impact **H** · Effort **L** · Risk **L**
Add the CSS step to the local flow: either have the generator accept `--css dist-assets/site.css`
and copy it into `dist/assets/`, or add a `tools/build.ps1`/`package.json` script that runs
Tailwind → generator → serve. Today `README.md`'s two commands produce HTML pointing at a stylesheet
that was never written (finding F2). This is the cheapest high-impact fix in the list: it unblocks
every future visual review, including the screenshots this engagement needs.

### 2. Golden-file HTML regression test — `B` · Impact **M** · Effort **L** · Risk **L**
Render one fixed post through `HtmlRenderer` in xUnit and compare against a checked-in `.html`
fixture (normalised for timestamps). The plan promised this (F5) and it does not exist. It is also
the only thing that will stop a future Tailwind/template refactor from silently breaking the
markup contract.

### 3. Reconcile or retire `StaticBlaze-V2-Plan.md` — `B` · Impact **M** · Effort **L** · Risk **L**
Mark it "historical — describes the v2 build, superseded by the implementation" and move the parts
that are still true (content model, URL structure, threat model) into `docs/`. F1/F3/F4 are all
symptoms of one stale document being read as current truth.

### 4. Close the WCAG AA contrast failures and label the search input — Impact **H** · Effort **L** · Risk **L**
Four measured failures (F9) plus one unlabelled input (F8). Replace `--gold #b35c00` with a darker
saffron for light-theme text, drop `#00a693` from text duty in light mode, lighten the dark-theme
pomegranate, and give the search input a real `<label>` (visually hidden is fine). Small diff, and
it is the difference between "pretty" and "shippable".

### 5. Wire the taxonomy indexes into navigation — Impact **M** · Effort **L** · Risk **L**
`/tags/` and `/categories/` are generated, sitemapped, and unreachable (F7). Add them to
`site.json` `nav`, or surface tags as a proper section on the landing page. Zero new routes needed.

### 6. Surface drafts in the admin — Impact **M** · Effort **L** · Risk **L**
There is already one draft in the repo (`2026-08-20-admin-behind-the-lock.md`, F12). The generator
correctly excludes it; nothing tells the author. Add a draft count to the admin dashboard and a
`draft: true` filter chip to the post list. The `PostService` already round-trips the flag.

### 7. Full RTL + Persian typography support — Impact **M** · Effort **M** · Risk **M**
Derive `dir` from `site.json`'s `language`, convert the physical CSS properties to logical ones,
keep the `tailwindcss-rtl` plugin out (v4 has `ms-*`/`me-*`/`ps-*`/`pe-*` in core), and add a
Persian-capable webfont so a `fa` deployment renders correctly. Blocks any Persian-language
deployment today (F11). Included in this engagement's redesign as a structural capability.

### 8. Analytics for a static site — Impact **M** · Effort **M–H** · Risk **M**
Fully costed in `docs/06-analytics-feasibility.md`; recommended shape is a build-time report over
first-party, cookie-free page-view counts plus a build-time "content health" report that needs no
visitor data at all. Explicitly *not* a go-ahead to instrument anything.

### 9. Tag/category density on index surfaces — Impact **M** · Effort **M** · Risk **L**
`manifest.json` already carries every count needed to draw a per-year/per-month bar chart on
`/archive/`, and per-term weights on the tag index. Today those pages are flat hairline lists even
though the data is sitting in memory. This is the single highest-leverage *content* upgrade
available and it needs no new data source. (Delivered as part of this engagement's redesign.)

### 10. Reading progress + in-post navigation — Impact **M** · Effort **L** · Risk **L**
Posts have `readTimeMinutes` already but nothing helps you navigate a long one. A scroll-linked
progress indicator plus an auto-generated table of contents from the `h2`s Markdig already emits
(with `auto-identifiers` already enabled) is a small, contained `site.js` addition.

### 11. Comments via GitHub Issues — Impact **M** · Effort **M** · Risk **M**
The plan's deferred item. `giscus`/`utterances` is a script tag and a repo toggle. The risk is not
technical: it is the third-party dependency and the moderation obligation it creates. Needs an
explicit decision before implementation.

### 12. RSS/Atom discovery from the page — Impact **L** · Effort **L** · Risk **L**
`<link rel="alternate" type="application/rss+xml">` exists in `<head>`; the visible footer has
`rss` but no `atom`, and no per-tag/per-category feeds exist. Cheap, and feed readers reward it.

### 13. Theme customisation (the plan's "theme marketplace") — Impact **L** · Effort **H** · Risk **M**
A user-facing palette switcher. High effort, low reader value for a personal engineering blog, and
it multiplies the contrast-verification surface. Recommend **declining** it and recording the
reason, rather than carrying it as permanent debt in the status list.

### 14. Search quality upgrade — Impact **M** · Effort **M** · Risk **L**
`search-index.json` carries title, description, tags, date and stripped body. The client scorer
boosts title/tags only. Adding prefix matching, tag-facet filtering and a keyboard-driven palette
(`/` to focus, arrows to select, Enter to open) is a contained enhancement to one file. Also the
natural home for the a11y fix in idea 4.

### 15. Content-health report in CI — Impact **M** · Effort **L** · Risk **L**
Fail the build (or warn) on: post without a `description`, post without tags, thumbnail referenced
but missing from `content/assets/`, `modified < published`, slug that does not match the filename,
and internal links pointing at a route that the generator did not emit. `ContentValidator` already
has the plumbing; today it checks far less. Zero visitor data required, so it fits the static
constraint perfectly.

---

## Top three, with reasoning

**1 — Fix the local build path (idea 1).** It is the precondition for everything else. Right now
"look at the site" is not a valid instruction, which makes every design review, screenshot and
regression check unreliable. Highest impact-to-effort ratio in the list, and it is a prerequisite
for this engagement's own before/after verification.

**2 — Contrast + accessible search (idea 4), together with the index-surface upgrade (idea 9).**
These are the two halves of "is this actually a good site". Idea 4 removes the four measured AA
failures and the one Level-A label failure; idea 9 turns three already-generated pages from flat
lists into the site's most distinctive surfaces using data the manifest already holds. Together
they change both *whether* the site is correct and *whether* it is memorable.

**3 — Content-health report in CI (idea 15), with the golden-file test (idea 2) as its companion.**
The project's stated promise is "bad markdown fails the build instead of shipping a broken page".
`ContentValidator` only enforces part of that, and there is no HTML regression guard at all.
Closing both is what makes it safe to keep shipping from a `content/`-as-CMS repository where the
only reviewer is CI.

## Explicit non-recommendations

- **Theme marketplace (idea 13)** — high effort, low value, expands the verification surface. Record
  the decision instead of carrying it as an open box.
- **Analytics instrumentation without a decision (idea 8)** — do not ship a script tag before the
  privacy/retention section of `docs/06-analytics-feasibility.md` is agreed; the current site has no
  consent surface, and adding one is a larger change than the analytics itself.
- **Migrating off the static model or the .NET stack** — out of scope by the engagement brief and
  unjustified by any finding above.
