# StaticBlaze

A Jekyll alternative built with .NET. The blog is a folder of markdown in a GitHub
repository; a generator turns it into a plain static site; GitHub Pages serves it for free.
A Blazor WebAssembly admin app at `/admin/` is the only .NET that ever runs client-side.

Visitors get pre-built HTML: no WASM download, no runtime rendering, full SEO.

## How it works

```
content/*.md  ->  push  ->  GitHub Actions
                            |
                            +- StaticBlaze.Generator (console)
                            |    validates content, renders Blazor components to HTML,
                            |    emits manifest.json / search index / RSS / Atom / sitemap
                            +- StaticBlaze.Admin (WASM) -> served at /admin/
                            |
                        GitHub Pages artifact (official actions)
```

- **Markdown is the only canonical content.** HTML is always derived at build time through
  the same Markdig pipeline the admin preview uses, so what you preview is what ships.
- **No database.** A generated `manifest.json` is the index (fetch-once, cacheable).
  Related posts, tag counts, and pagination are computed at build time and cannot drift.
- **GitHub is the CMS.** The admin writes markdown/JSON through the contents API with
  proper SHA handling (creates without sha, updates with sha, 409 refetch-and-retry).

## Repository layout

| Path | What it is |
|---|---|
| `content/` | the blog: `site.json`, `posts/*.md` (typed YAML frontmatter), `authors/*.json`, `taxonomy/*.json`, `assets/` |
| `src/StaticBlaze.Core` | models, frontmatter (YamlDotNet), the one Markdig pipeline, manifest/search builders |
| `src/StaticBlaze.Site` | Razor components used as static templates |
| `src/StaticBlaze.Generator` | console app that validates content and emits the whole site |
| `src/StaticBlaze.Admin` | Blazor WASM editor (Toast UI) with an encrypted PAT vault |
| `styles/` | Tailwind v4 entrypoints, the Naghsh token layer, `static/site.js` |
| `tools/node-tools` | pinned `tailwindcss` + `@tailwindcss/cli` for local and CI builds |
| `tests/` | `StaticBlaze.Core.Tests` (19 unit tests) and `StaticBlaze.Site.Tests` (golden-file HTML tests for the template layer) |
| `docs/` | repository scan, task assessment, next-step backlog, information architecture, design system, analytics plan |

## Design

The visual system is **Deep Field**: realtime 3D deep space, built for an engineer who makes tools.

**The archive is the scene.** The hero renders one glowing node per published post, placed
deterministically from a hash of its slug, clustered by its dominant tag, with edges drawn between
posts that share a tag. Change the content and the shape changes. It is not decoration: it is the
archive graph in 3D. Article pages get a second, smaller scene whose geometry is seeded from the slug,
so every article has its own signal and the same article always looks the same.

**Three.js never blocks the page.** `three.module.min.js` (687 KB) is imported dynamically from inside
a `requestIdleCallback`, so it is not in the critical path. Device pixel ratio is capped at 1.5, the
frame loop stops when the tab is hidden, and the layer refuses to load at all under reduced motion,
save-data, low device memory or a viewport under 640px. In every one of those cases a CSS radial
atmosphere carries the page instead, so there is always depth and never a blank rectangle.

**Motion is choreographed, not sprinkled.** GSAP 3.13 with ScrollTrigger drives a hero timeline, one
batched scroll-reveal system, a pinned horizontal tag field, a scroll-linked reading rail and
pointer-driven magnetism and tilt. There is no `window.addEventListener('scroll')` anywhere: every
scroll-linked effect is a ScrollTrigger. Each effect has a reduced-motion counterpart that is verified
active when the OS setting is on.

**One accent, one radius scale, one theme.** Firouzeh `#57c5c6` is the only accent, used identically
everywhere. The ground is surmaj indigo `#06070d`, never black; ink is warm `#e9ecf5`, never white.
Radius is a single small scale (2 / 6 / 12px). The site is dark-only: a second theme would roughly
double the verification surface for no reader benefit.

**No em-dashes, anywhere.** Measured at zero across all generated pages.

**Tailwind v4, CSS-first.** Every token is a CSS custom property in `styles/_tokens.css`, mapped onto
Tailwind namespaces through `@theme inline`. There is no `tailwind.config.js`. The 3D scene reads the
same custom properties at runtime, so the WebGL palette cannot drift from the stylesheet.

**GSAP and Three.js are vendored** into `styles/vendor/` and committed, so the build needs no extra
download step and stays offline-capable. Both are used under their standard free licences
(GSAP standard no-charge licence, Three.js MIT); licence files sit beside the builds.

Full detail, including every decision traced to a named rubric rule, the motion spec, the failure
matrix and the known limitations, is in `docs/09-deep-field-handoff.md`.
## Getting started

Requirements: .NET 10 SDK. Tailwind runs through the pinned CLI in `tools/node-tools`; the CSS
entrypoints import Tailwind directly from that folder, so local builds and CI resolve identically
without a global Node install (CI runs `npm ci --prefix tools/node-tools`).

```bash
dotnet test

# 1. build the stylesheets
npm ci --prefix tools/node-tools                                    # first time only
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs \
     -i styles/site.css -o dist-assets/site.css --minify
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs \
     -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify

# 2. generate the site, handing the generator the stylesheet it should ship
dotnet run --project src/StaticBlaze.Generator -- \
     --content content --out dist --css dist-assets/site.css

# 3. serve locally (matches the /StaticBlaze/ project-pages base path)
node tools/serve.mjs
```

The `--css` flag is what makes a clean local run produce a *styled* site. Without it the generator
still emits every page, but `dist/assets/site.css` is not written and the pages render unstyled —
that copy step used to live only in the CI workflow.

For the admin: `dotnet run --project src/StaticBlaze.Admin`, then open `/unlock`.

To regenerate the self-hosted webfonts (IBM Plex + Vazirmatn): `pwsh tools/get-fonts.ps1`.

## Publishing a post (author flow)

1. Open `/admin/`, paste a **fine-grained PAT** (Contents: Read and write, this repo only,
   short expiry) and choose a passphrase. The token is encrypted with AES-GCM-256
   (PBKDF2-SHA256, 310k iterations); the ciphertext sits in localStorage and the key only
   in memory, auto-locking after 15 idle minutes.
2. Write the post. The live preview renders through the same pipeline as the generator.
   Pasted images are compressed with SkiaSharp in the browser and uploaded under
   SHA-256 content-addressed filenames (identical bytes dedupe).
3. Save. This commits to `content/posts/`. The push triggers the deploy workflow.
4. A minute later the rebuilt static site is live.

Vault threat model, stated honestly: encryption protects the token **at rest**. It cannot
protect against live XSS on a compromised page, which is why the PAT should be
fine-grained and short-lived.

## Deploy

Push to `main` (`.github/workflows/deploy.yml`) with changes under `content/`, `src/`, or
`styles/`. Enable **Settings -> Pages -> Source: GitHub Actions** once. Everything else
(tests, both CSS builds, generation, admin publish with base href `/StaticBlaze/admin/`,
artifact assembly, and deploy) is automated. No deploy branches, no PAT secrets in CI.

## Docs

`docs/` holds the working documents for the redesign and what comes next:

| Document | What it covers |
|---|---|
| `docs/01-repository-scan.md` | folder structure, entry points, templating engine, content model, build pipeline, dependencies, output inventory |
| `docs/02-task-assessment.md` | what the outstanding task actually is, how complete it is, and 15 concrete findings with file paths |
| `docs/03-next-step-ideas.md` | 15 ranked next steps with impact/effort/risk, split across the "task finished" and "task still open" branches |
| `docs/04-information-architecture.md` | sitemap, page inventory, navigation model, content hierarchy, the four user flows |
| `docs/05-design-system.md` | the full specification: tokens, OKLCH values, measured contrast table, type scale, elevation, motion, interaction states, Tailwind mapping, and every decision traced to its source rule |
| `docs/06-analytics-feasibility.md` | candidate metrics, build-time vs client-side collection, privacy and retention, schema, effort, and the go/no-go verdict |
| `docs/07-verification-and-handoff.md` | every command run with its exit status and output, the route and token tables, the contrast measurements, the responsive matrix, the defect post-mortem, and a maintainer handoff |
| `docs/08-task-ledger.md` | the persisted task ledger: every task with its status, priority, dependency, last action, evidence pointer and next step, plus the blocked/deferred list with decision requests |

## Status

- [x] Static generation: posts, landing + pagination, tags, categories, authors, archive, about, 404
- [x] SEO: canonical, OpenGraph, Twitter, JSON-LD, sitemap, robots, RSS + Atom
- [x] Client-side search over a lazy-loaded index, with `/` to focus and arrow-key selection
- [x] Mermaid + highlight.js + copy buttons as progressive enhancement
- [x] Dark/light theme, no-flash, default dark
- [x] Admin: encrypted vault, SHA-aware GitHub client, Toast UI editor, SkiaSharp media pipeline
- [x] UI/UX redesign: Naghsh palette, logical-property RTL support, elevation, motion, data surfaces
- [x] Tests: 27 passing - Core unit tests plus golden-file HTML tests that pin the template markup contract
- [ ] Comments (GitHub Issues), theme customization, real analytics - all three are tracked with a decision request in `docs/08-task-ledger.md`