# How to change the design

This is the single guide for changing StaticBlaze's visual layer, whether you are doing it
**by hand** or **through an agent**. It is written against the current codebase state; if a
path here no longer matches the tree, that is a bug in this doc, not your workflow.

## 1. Where the design actually lives

| Concern | File(s) | Notes |
|---|---|---|
| Design tokens (colour, type, radius, spacing) | `styles/_tokens.css` | The single source of truth. Everything else reads these as CSS custom properties. |
| Public stylesheet | `styles/site.css` | Tailwind v4 entrypoint; `@theme inline` maps tokens onto utility namespaces. No `tailwind.config.js`. |
| Admin stylesheet | `styles/admin.css` | Separate entrypoint, ships to the admin app. |
| UI behaviours (palette, filters, form) | `styles/static/site.js` | Framework-free. |
| Motion system | `styles/static/motion.js` | GSAP + ScrollTrigger only. No `addEventListener('scroll')`. |
| 3D background graph | `styles/static/scene.js` | The archive as a knowledge graph; loaded lazily from `motion.js`. |
| Related-posts graph (post page) | `styles/static/graph.js` | SVG, no WebGL; reads `#post-graph-data`. |
| Page transition | `styles/static/motion.js` (§4) + `[data-progress]` in `SitePage.razor` | The "focus pull" blur refocus. |
| Markup shell | `src/StaticBlaze.Site/Components/SitePage.razor` | The `<html>`/`<head>`/body shell every page renders through. |
| Page templates | `src/StaticBlaze.Site/Components/Pages/*.razor` | Landing, post, index, tags, archive, about, contact, 404. |
| Content (copy, nav, hero) | `content/site.json`, `content/authors/*.json`, `content/taxonomy/*.json` | Authored, not code. |

### The golden rule

`styles/_tokens.css` is read by **CSS, by `scene.js` and by `graph.js` at runtime**, so the
WebGL/SVG palettes cannot drift from the stylesheet as long as you only edit tokens. If you
hard-code a colour in a JS file, you break that guarantee. Don't.

## 2. The build loop (run this after every change)

```powershell
# always use the real SDK (the dotnet on PATH may be a runtime-only shim)
$env:PATH="C:\Program Files\dotnet;"+$env:PATH
$env:DOTNET_ROOT="C:\Program Files\dotnet"

# styles
npm ci --prefix tools/node-tools
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/site.css -o dist-assets/site.css --minify
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify

# tests (golden-file tests pin the markup contract)
dotnet test StaticBlaze.slnx

# generate
dotnet run --project src/StaticBlaze.Generator -c Release -- --content content --out dist --css dist-assets/site.css --static styles/static --vendor styles/vendor --fonts styles/fonts

# gates
node tools/audit-site.mjs dist
node tools/check-crossengine.mjs dist/assets/site.css

# serve on the real base path
node tools/serve.mjs   # http://localhost:8077/StaticBlaze/
```

`tools/audit-site.mjs` enforces things a purely visual pass would miss: description length,
canonicals, sitemap completeness, and zero residue from a previous design's tokens. If it
fails, read the message — it names the page and the reason.

## 3. Common changes, by hand

### 3.1 Change a colour, font or radius

Edit `styles/_tokens.css`, rebuild stylesheets, done. The accent (`--accent`) is used
sparingly on purpose (preset "Build": one accent, luxury whitespace). There is no theme
toggle — the site is dark-only by design; adding a light theme is a larger decision, not a
token edit.

### 3.2 Change the page transition

The transition lives in `styles/static/motion.js`, section **4. PAGE TRANSITION** (the
"focus pull"). It is deliberately minimal: a `[data-progress]` accent bar sweeps while the
article blurs, shrinks and fades out; the next page resolves in crisp. To tune it:

- **duration / easing** — the `gsap.timeline` and `gsap.fromTo` calls in that section.
- **the bar** — `[data-progress]` is rendered in `SitePage.razor`; restyle it in `site.css`.
- **reduced motion** — the module already exits early on `prefers-reduced-motion`; do not
  add animation that bypasses that gate.

The rejected alternative (a full-window wipe) is preserved at
`docs/prototypes/page-transition-prototypes.html` so the trade-off stays reviewable.

### 3.3 Change the 3D background graph

`styles/static/scene.js` builds the knowledge graph (force-relaxed, deterministic, seeded by
post slugs). The contract that must survive any rewrite:

- reads posts from `#scene-data`;
- palette from `getComputedStyle` tokens;
- `data-scene` state machine on `<html>`: `reduced-motion` / `save-data` / `no-webgl` /
  `small-viewport` / `context-lost` / `live`;
- the frame loop pauses when the tab is hidden;
- layout is deterministic (same seed → same graph), so it is reproducible in CI.

### 3.4 Change the related-posts graph (post page)

`styles/static/graph.js` draws the SVG graph (central node = this post, ring of linked-post
nodes). Its inputs and guarantees:

- reads `#post-graph-data` (written by the generator from the article's internal links);
- nodes are real `<a href>` elements, so middle-click / cmd-click / keyboard all work;
- a post with **no internal links** renders the empty note (already in the markup);
- the static `<ul>` fallback in `PostPage.razor` is the no-JS / crawlable path — keep it in
  sync with the graph if you change what "linked" means.

The link set is **derived from the article body** (`LinkedPostsOf` in the generator), so it
can never show a node the reader cannot also reach by clicking through the prose. If you want
a different node set (e.g. "related by tag" instead of "linked in body"), change the
extraction, not the graph renderer.

## 4. Changing the design through an agent

Give the agent **this guide** plus `docs/11-agent-ui-context.md` (the per-page feature
inventory) and `docs/05-design-system.md` (the token and motion spec). Then state the change
as a bounded instruction. A good prompt:

> "Change the accent colour and the page transition on StaticBlaze. Read
> docs/10-design-changes.md, docs/11-agent-ui-context.md and docs/05-design-system.md first.
> Edit only styles/_tokens.css and styles/static/motion.js. Run the full build loop, keep
> `data-scene` states intact, and leave `tools/audit-site.mjs` green."

What to tell the agent explicitly (it cannot infer these):

1. **The design direction.** The agent must not invent it. `docs/11-agent-ui-context.md`
   deliberately ends in an empty placeholder — fill that in yourself and pass it along.
2. **Boundaries.** Which files it may touch. "Only tokens and motion" is a very different
   job from "restyle every page".
3. **The verification contract.** `dotnet test` (golden files will fail if the shell markup
   changed — tell the agent to re-baseline *deliberately*, not silently), plus
   `tools/audit-site.mjs` and `tools/check-crossengine.mjs` green.
4. **The build loop** (section 2) — the agent must actually run it, not claim it.

## 5. Verification checklist (acceptance for any design change)

- [ ] `dotnet test StaticBlaze.slnx` — 27 passing; golden fixtures re-baselined only if the
      markup contract changed and you can justify it.
- [ ] `tools/audit-site.mjs dist` — PASS (descriptions, canonicals, sitemap, no residue).
- [ ] `tools/check-crossengine.mjs dist/assets/site.css` — PASS (prefixed + unprefixed both ship).
- [ ] Reduced motion: no animation runs under `prefers-reduced-motion`.
- [ ] No-JS: the static fallbacks (post links, graph fallback, nav) still render.
- [ ] The related-posts graph shows the correct node set for a linked, a lightly-linked and
      an unlinked post.
