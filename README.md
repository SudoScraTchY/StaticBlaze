# StaticBlaze

A Jekyll alternative built with .NET. The blog is a folder of markdown in a GitHub
repository; a generator turns it into a plain static site; GitHub Pages serves it for free.
A Blazor WebAssembly admin app at `/admin/` is the only .NET that ever runs client-side.

Visitors get pre-built HTML: no WASM download, no runtime rendering, full SEO.

## How it works

```
content/*.md ──push──▶ GitHub Actions
                         ├─ StaticBlaze.Generator (console)
                         │    validates content, renders Blazor components to HTML,
                         │    emits manifest.json / search index / RSS / Atom / sitemap
                         └─ StaticBlaze.Admin (WASM) → served at /admin/
                              ▼
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
| `styles/` | Tailwind v4 entrypoints, Persian palette tokens, `static/site.js` |
| `tools/node-tools` | pinned `tailwindcss` + `@tailwindcss/cli` for local and CI builds |

## Design

The palette is Persian, named and sourced from
[alijsh/persian-colors](https://github.com/alijsh/persian-colors) and the traditional
Persian canon: lajvard lapis `#1C39BB`, tile azure `#0067A5`, firouzeh turquoise
`#00A693`/`#57C5C6`, zafaran saffron `#F38400`, pomegranate `#CC3333`, on indigo night
`#0F1420` or miniature paper `#F6F1E7`. Typography is IBM Plex Sans + Plex Mono with
monospace title-block metadata and hairline rules, a drafting-sheet look. One gradient
exists (lajvard → firouzeh, the dome-tile transition), used sparingly. Default theme is
dark; the toggle persists per visitor. Mermaid and syntax highlighting are lazy,
progressive enhancements.

## Getting started

Requirements: .NET 10 SDK. Tailwind runs through the pinned CLI in `tools/node-tools`;
the repo-root `node_modules` junction makes it resolve without a global Node install
(CI uses `npm ci --prefix tools/node-tools`).

```bash
dotnet test
dotnet run --project src/StaticBlaze.Generator -- --content content --out dist
# serve locally (matches the /StaticBlaze/ project-pages base path):
node tools/serve.mjs
```

For the admin: `dotnet run --project src/StaticBlaze.Admin`, then open `/unlock`.

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
`styles/`. Enable **Settings → Pages → Source: GitHub Actions** once. Everything else
(tests, both CSS builds, generation, admin publish with base href `/StaticBlaze/admin/`,
artifact assembly, and deploy) is automated. No deploy branches, no PAT secrets in CI.

## Status

- [x] Static generation: posts, landing + pagination, tags, categories, authors, archive, about, 404
- [x] SEO: canonical, OpenGraph, Twitter, JSON-LD, sitemap, robots, RSS + Atom
- [x] Client-side search over a lazy-loaded index
- [x] Mermaid + highlight.js + copy buttons as progressive enhancement
- [x] Dark/light theme, no-flash, default dark
- [x] Admin: encrypted vault, SHA-aware GitHub client, Toast UI editor, SkiaSharp media pipeline
- [ ] Comments (GitHub Issues), theme customization, real analytics
