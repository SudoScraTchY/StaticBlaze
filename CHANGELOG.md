# Changelog

Notable changes to StaticBlaze, newest first. Dates are the merge date on `main`.

## 2026-10-13 — Overdrive hero: kinetic typography redesign

**Hero (landing page)**
- Full redesign of the landing hero (the "Overdrive" direction): a staircase of uppercase Syne
  display lines whose weight breathes along the wght axis (GSAP intro + a pointer-proximity
  engine in `motion.js`), with the last line inked as an outline that fills as the cursor
  approaches. Screen-reader safe by construction: aria-label on the h1, aria-hidden lines.
- New hero-scoped WebGL plasma field (`styles/static/hero-scene.js`, Three.js): domain-warped
  fbm ribbons in lajvard/firouzeh floating over the stage, rendered at 55% resolution and
  CSS-upscaled. Capability gates mirror `scene.js` (reduced-motion, save-data, low memory,
  no WebGL, small viewports); the frame loop runs only while the hero is on screen and the tab
  is visible; the fx opacity (scroll fade + intro fade) is owned by the scene.
- New self-hosted display font: Syne variable (latin, wght 400-800, OFL license shipped) at
  `styles/fonts/syne-var.woff2`, exposed as `--family-display`; IBM Plex unchanged for
  body/mono, Vazirmatn unchanged for Persian script.
- New copy in `content/site.json`: kicker "systems · software · notes", headline
  "Systems, / software, / & the space / between.", new sub line. The fake build console is
  replaced by a real-facts ticker (`.ov-ticker`); CTAs rebuilt (`.btn-ov` gradient sweep,
  `.link-ov` underline arrow); the metrics readout is restyled as Syne numerals in zafaran
  over hairline-separated columns.
- Reduced motion or no motion runtime: static resting-weight headline, no plasma, the stage
  atmosphere carries the section.

**Hotfix (same day, from a headless-browser probe of the live page)**
- The GSAP intro tweened the `--wght` custom property with a `.from()` whose end value came
  off the computed style; the property had no computed value there, so the intro landed every
  glyph at weight 0 (clamped to Syne's minimum) and the kinetic typography read as static.
  The intro is now an explicit `fromTo` (430 to 700) and `.ov-char` defines `--wght: 700` as a
  baseline. Probe evidence: computed `font-variation-settings` was `"wght" 0` on the deployed
  page, `"wght" 700` after the fix.
- The plasma shader's output alpha sat below the visibility floor on a dark ground (canvas
  mean brightness ~0). Ribbons broadened, output raised ~5x, drift speed up, and the renderer
  now keeps its drawing buffer so the field is pixel-measurable (probe: 63% of the canvas
  emits light, mean brightness 46/255).

**Gates**
- dotnet build 0 errors; tests 27/27; tailwind, generation, `audit-site`, `check-crossengine`,
  `check-casing` all PASS; the served page verified byte-level (new markup, font, shader).

## 2026-10-08 — Two-repo sync: source → blog, one command

**Topology**
- The live blog lives at https://sudoscratchy.github.io (repo `sudoscratchy.github.io`), a copy
  of this project with blog-only adaptations: the real author bio, a résumé section + pdf on the
  author page, its own admin config. StaticBlaze is the source of truth for code; the blog is
  where publishing happens.
- `deploy.yml` is now repo-aware: the admin base path (`/StaticBlaze/admin/` vs `/admin/`) and
  the verification `SITE_URL` derive from the repository name, so one tree deploys correctly to
  both sites and syncs can never conflict on these lines.

**Sync**
- New `tools/sync-blog.ps1`: fetch blog remote → merge with a conflict policy (code: source
  wins; taxonomy: union by slug; content: blog wins) → re-apply the protected blog-only files
  (bio, résumé section, pdf) → verify build + tests + tailwind + generation + audit gates →
  push both repos. `-WhatIf` prints the plan without touching anything.
- The initial sync ran for real: yesterday's landing/hero/mermaid/media/taxonomy/theme fixes
  are live on the blog with the blog's adaptations intact, and both repos build green from the
  same commit.
- Cleanup the merge exposed: the source repo held a duplicate of `what-is-ai-really` (created
  through the old admin with .bin assets); the blog copy with .webp assets and absolute URLs is
  canonical, so the duplicate post and its 7 .bin assets were removed.

## 2026-10-07 — Landing fixes, hero console, admin media + taxonomy, mermaid theme, White Persian admin theme

**Landing page**
- The "latest" grid is now explicitly newest-first (re-stated at the selection point in the
  generator), capped by a new `landingPostCount` setting in `site.json` (default 6), and no
  longer repeats featured posts: the lead section owns them.
- Section padding tightened from `clamp(3.5rem, 8vw, 7rem)` to `clamp(2rem, 4vw, 3.5rem)` and
  the 3D stage height eased from 78vh to 62vh, so the first post card is reachable within about
  one scroll on desktop.

**Hero**
- Fixed the font overlap: line-height 0.96 clipped descenders under the reveal animation's
  `overflow: hidden` (now 1.05 with a descender-safe clip zone), and the headline gets a
  `max-width: 18ch` so the absolute right-rail readout can never collide with it.
- New build-console motif under the subline: `$ staticblaze generate --content content` with a
  blinking caret, a check status line and a deploy line — the blog describes itself the way its
  CI pipeline does. Copy in `site.json` unchanged; motion rides the existing hero hooks and
  respects `prefers-reduced-motion`.

**Admin media**
- `image/webp` (plus avif/gif/bmp/ico/svg fallbacks) no longer lands as `.bin`: the extension
  comes from the declared content type with a magic-byte sniff as the safety net.
- Filenames shortened from the full 64-char SHA-256 to its 16-char prefix (same dedup and
  immutability, readable markdown).
- Gentler compression: quality 85, and an already-compact JPEG/WebP inside the 1920px cap is
  uploaded as-is instead of being recompressed.

**Admin copy-MD + editor insert**
- The "copy md" button and the editor's image insert now emit absolute URLs against a new
  `SiteUrl` in `appsettings.json` (`https://sudoscratchy.github.io`), so snippets resolve from
  any page of the live site.
- `content/site.json` `url` aligned to the root-hosted live site (the generator's BasePath is
  derived from it, so canonicals/sitemap now match the deployment), and `tools/audit-site.mjs`
  reads the base path from `site.json` instead of the hardcoded `/StaticBlaze`.

**Admin taxonomy**
- New tags and categories are appended to `taxonomy/tags.json` / `categories.json` on save
  (slug + prettified title); the toast reports `taxonomy +N`. The category field is now free
  text with a datalist of known slugs instead of a closed select.

**Mermaid**
- Comprehensive `themeVariables`: every diagram family (sequence, gantt, pie, quadrant,
  journey, git graph, state/class/ER, mindmap, timeline, sankey, xychart) is pinned to site
  tokens, plus a CSS safety net for whatever the vendored build still hard-codes — no more
  black/gray text on the dark theme.

**Admin theme: White Persian**
- Third admin theme `data-theme="persian"`: warm tilework paper surfaces, lajvard-tinted ink,
  darkened firouzeh accent, saffron numerics — contrast measured AA in the token comments.
  Wired into the switch (three buttons), `adminTheme.js` and the no-flash bootstrap.


## 2026-09-29 — Admin redesign: light theme, readable editor, real workspace

**Theme layer**
- New `styles/_admin-tokens.css`: light (default) and dark defined once, aliased onto the site's
  older token names, with the eight Tailwind `--color-*` keys the admin markup used but the theme
  never defined (`bg-bg`, `text-fg`, `text-muted`, `border-line`, `text-gold`, `text-pomegranate`,
  `bg-surface`, `divide-line-soft`). Those utilities generated nothing before, which is why the
  shell rendered with inherited colours.
- Theme switch in the admin header (visible before sign-in too), persisted under `sb-theme`,
  restored before first paint, and unaffected by the lock/unlock cycle.

**Editor**
- Toast UI Editor vendored (editor 3.2.2, plugin 3.0.0, MIT). The CDN build has no dark theme
  stylesheet at any version, so `theme: 'dark'` did nothing and the light editor's `#222` text
  landed on a dark ground: 1.26:1. The editor is now always initialised light and fully
  re-coloured from the admin tokens for both themes; source text measures 15.4:1 in dark.
- Markdown mode is ProseMirror (not CodeMirror) — the overrides target the real class names.

**Layout**
- The shell is fluid: the editor workspace went from a 1024px cap to the full viewport
  (2136px editor frame at 2560px), with a 140ch source measure and a 76ch rendered measure.
- `PostEdit` rebuilt: title across the working column, editor below it, metadata and the parity
  preview in a side panel, and the save/delete actions in the page header.
- `#app` no longer carries the loading placeholder's flex/centering classes, which had been
  shrinking the entire admin to a centered column.

**Docs**
- `docs/13-admin-design.md`, `docs/prototypes/admin-style-harness.html`, vendor README with
  provenance, and this entry.
## 2026-09-28 — Interaction and content pass

**Home**
- Hero no longer reserves 78 vh of empty space: `min-height` is clamped to `22rem–34rem` and the
  hero starts ~56 px below the header at 360 px, ~112 px at 1440 px (was several hundred).
- Section rhythm tightened: `.sec` padding went from `clamp(3.5rem, 8vw, 7rem)` to
  `clamp(2.25rem, 4.5vw, 4rem)`; measured inter-section gaps are now 0–128 px.
- Headline overlap fixed: `line-height` 0.96 → 1.06 with padding on each clipped line, so the
  44–96 px display type no longer collides or clips at any of 360 / 768 / 1440 px.
- New hero meta rail (desktop only): “since”, “last post”, “base”, “engine” — all computed from
  the manifest, giving the hero something to say beyond the headline.

**Related-posts graph** (`styles/static/graph.js`, rewritten)
- Zoom in/out buttons (`+` / `−`): transform-based, clamped to 0.7–1.8, buttons disable at the
  limits, keyboard operable, and click-safe while dragging or hovering.
- Nodes are draggable (pointer capture); dragging does not navigate, clicking still does.
- Hover fixed: per-anchor `pointerenter`/`pointerleave` replaced the bubbling `mouseover` handler
  that re-fired across child elements — this was the flicker near node edges.
- Root cause of the “buggy around the edges” report: the transparent hit disc was created but
  never positioned (left at the SVG origin), so hit-testing fell through to the background. The
  hit disc now follows the node in `paint()` and matches the visible radius.

**Archive**
- Grouped into named years and months with counts: e.g. `2026 — 5 posts`, `September` → `2`,
  `August` → `3`, plus total read-hours per year. The density field keeps its per-year count.

**About**
- Redesigned and the post list removed. Structure: identity header, at-a-glance stats, “who i am”
  with `how i work` / `what i build` / `outside the editor` sections, and a “reach me” panel
  (contact form, website, GitHub, RSS/Atom).
- The personal prose is a clearly marked placeholder (`data-placeholder="personality-rundown"`)
  until the author supplies the copy; nothing invents facts in the meantime.

**Contact**
- Now configurable end to end: `content/site.json` → `contact.endpoint` feeds
  `data-endpoint` on the form via the generator. Blank means the form validates and says plainly
  that nothing was stored.
- Receiver hardened: per-client rate limit (5 per 10 minutes, tracked against a per-process salted
  hash — the address is never stored or logged), optional webhook notification via
  `SB_WEBHOOK_URL`, existing honeypot/validation/export unchanged.
- Verified end to end against the real receiver: invalid input blocked client-side, honeypot
  rejected with 400, valid submission stored (201 + id), fields cleared, 429 rate limit engages.
- Deployment guide: `docs/12-contact-endpoint.md`.

## 2026-09-28 — StaticBlaze dashboard and Pages hardening
- GitHub Pages source moved to “GitHub Actions”; the legacy Jekyll build no longer publishes.
- Mermaid rendering wired client-side; `deployed-from-a-workflow` live pipeline test post.
- Docs cleanup with a ledger; design-change and agent-context guides added.

## Earlier
See `docs/09-deep-field-handoff.md` for the redesign delivery (Deep Field) and
`docs/07-verification-and-handoff.md` for the verification record.
