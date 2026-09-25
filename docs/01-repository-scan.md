# 01 — Repository Scan

**Workspace:** `M:\Users\SaintScraTchY\RiderProjects\StaticBlaze`
**Scan date:** 2026-09-21
**Method:** recursive file listing (excluding `node_modules`, `.git`, `bin`, `obj`, `.npm-cache`, bundled `tools/nodejs`), full read of `README.md`, `StaticBlaze-V2-Plan.md`, `.zcode/plans/*`, all four `csproj`, all `src/StaticBlaze.Site` + `src/StaticBlaze.Generator` sources, `styles/*.css`, `content/**`, `.github/workflows/deploy.yml`, `tools/*`, plus `git log` / `git status`.

---

## 1. What the project is

StaticBlaze is a **static site generator for a blog**, written in C#. Content is a folder of
Markdown committed to a GitHub repository; a console application validates and renders it into a
plain static site; GitHub Pages serves the result. A separate Blazor WebAssembly application at
`/admin/` is the authoring UI and writes Markdown back through the GitHub contents API.

The full intent document is `M:\Users\SaintScraTchY\RiderProjects\StaticBlaze\StaticBlaze-V2-Plan.md`
(27.8 KB, "StaticBlaze v2 — Complete Design & Implementation Plan").

## 2. Folder structure

| Path | Role |
|---|---|
| `content/` | **Canonical content store** — `site.json`, `posts/*.md`, `authors/*.json`, `taxonomy/*.json`, `assets/` |
| `src/StaticBlaze.Core/` | Class library: models, YAML frontmatter, Markdig pipeline, manifest/search/feed builders, content validation. No UI dependency. |
| `src/StaticBlaze.Site/` | Razor class library acting as the **template engine** (`Components/`, `Components/Pages/`, `wwwroot/`) |
| `src/StaticBlaze.Generator/` | Console app: the actual static site generator (`Program.cs`, 12.8 KB) |
| `src/StaticBlaze.Admin/` | Blazor WebAssembly app (authoring UI), published to `/admin/` |
| `tests/StaticBlaze.Core.Tests/` | xUnit tests (4 files) |
| `styles/` | Tailwind v4 CSS entrypoints (`site.css`, `admin.css`, `_tokens.css`), `fonts/`, `static/site.js` |
| `tools/` | `serve.mjs` (local preview server), `get-fonts.ps1`, `node-tools/` (pinned Tailwind CLI), `nodejs/` (bundled runtime), `tailwindcss.exe`, `.npm-cache/` |
| `dist/` + `dist-assets/` | Generated site output and the separately built CSS bundle |
| `.github/workflows/deploy.yml` | CI: test → build CSS → generate → publish admin → deploy to Pages |
| `.zcode/plans/` | A previous agent-plan artefact (`plan-sess_d33cc8ed-…md`) — a copy of the v2 plan |

Solution file: `StaticBlaze.slnx` — four projects under `/src/`, one under `/tests/`.

## 3. Entry points a maintainer actually touches

| Concern | File |
|---|---|
| Site-wide config (title, URL, nav, page size, default author) | `content/site.json` |
| Site-wide shells / header / footer / theme boot | `src/StaticBlaze.Site/Components/SitePage.razor` |
| Page templates | `src/StaticBlaze.Site/Components/Pages/{LandingPage,PostPage,TermPage,TermsIndexPage,ArchivePage,AuthorPage,NotFoundPage}.razor` |
| Repeating UI | `src/StaticBlaze.Site/Components/{PostCard,Pagination}.razor` |
| Generation orchestration + feeds + sitemap | `src/StaticBlaze.Generator/Program.cs` |
| Design tokens | `styles/_tokens.css` |
| Site / admin CSS layers | `styles/site.css`, `styles/admin.css` |
| Visitor JavaScript | `styles/static/site.js` |
| Build + deploy | `.github/workflows/deploy.yml` |

## 4. Templating engine

**Razor components rendered server-side at build time**, not Blazor WASM. `Program.cs` boots an
`HtmlRenderer` and calls `BeginRenderingComponent<TComponent>(ParameterView.FromDictionary(...))`,
then writes `root.ToHtmlString()` to disk. No router, no `NavigationManager`; every page receives
its data as plain parameters. This is the "Blazor as a template engine" trick and it is the single
most important architectural fact about the project.

## 5. Content model

- `content/site.json` → `title`, `description`, `url`, `language`, `postsPerPage`, `feedPostCount`,
  `wordmark`, `defaultAuthor`, `nav[]`.
- `content/posts/{yyyy-MM-dd}-{slug}.md` → typed YAML frontmatter (`title`, `slug`, `description`,
  `author`, `category`, `tags[]`, `published`, optional `modified`, `thumbnail`, `featured`, `draft`)
  plus a Markdown body. **4 files present; 1 is `draft: true`.**
- `content/authors/{handle}.json` → 1 file (`mehrshad.json`).
- `content/taxonomy/tags.json` (6 terms) and `categories.json` (2 terms).
- `content/assets/` → content-hashed media (currently empty).

## 6. Build pipeline

```
npm ci --prefix tools/node-tools          # pinned Tailwind v4 CLI (@tailwindcss/cli ^4.1.17)
node tools/node-tools/…/@tailwindcss/cli  # styles/site.css → dist-assets/site.css
                                          # styles/admin.css → src/StaticBlaze.Admin/wwwroot/assets/admin.css
dotnet test
dotnet run --project src/StaticBlaze.Generator -- --content content --out dist
dotnet publish src/StaticBlaze.Admin -c Release -o admin-published
cp dist-assets/site.css dist/assets/site.css ; cp -r admin-published/wwwroot/* dist/admin/
actions/configure-pages → upload-pages-artifact → deploy-pages
```

Locally (per `README.md`): `dotnet test`, then the generator, then `node tools/serve.mjs`
(serves `dist/` on `http://localhost:8077/StaticBlaze/`). Admin locally: `dotnet run --project
src/StaticBlaze.Admin`.

### Generated output inventory (verified against the committed `dist/`)

| Output | Present | Size |
|---|---|---|
| `index.html`, `posts/{slug}/index.html` ×3 | yes | 12.7 KB, 11.4–17.7 KB |
| `tags/index.html` + 5 term pages, `categories/index.html` + 2 term pages | yes | 6.0–8.2 KB |
| `authors/mehrshad/index.html`, `about/index.html`, `archive/index.html`, `404.html` | yes | 5.2–9.8 KB |
| `manifest.json`, `search-index.json` | yes | 3.1 KB, 9.7 KB |
| `rss.xml`, `atom.xml`, `sitemap.xml`, `robots.txt` | yes | 1.6–2.1 KB |
| `assets/site.js` (6.6 KB) + `assets/site.css` (24.7 KB) + 7 `woff2` fonts | yes | — |
| `page/{n}/index.html` pagination pages | **absent** | — (never exercised: 3 published posts < `postsPerPage` 10) |

## 7. Dependencies

| Project | Target | Packages |
|---|---|---|
| Core | `net10.0` | Markdig 0.40.0, YamlDotNet 16.2.0 |
| Site | `net10.0` | Microsoft.AspNetCore.Components.Web 10.0.9 |
| Generator | `net10.0` | `FrameworkReference Microsoft.AspNetCore.App` |
| Admin | `net10.0` | Components.WebAssembly 10.0.9 (+DevServer), Blazored.LocalStorage 4.5.0, Mime 3.7.0, SkiaSharp 3.116.1, SkiaSharp.NativeAssets.WebAssembly 3.116.1 |
| Tests | — | xUnit |
| CSS | — | `@tailwindcss/cli` + `tailwindcss` ^4.1.17 (pinned in `tools/node-tools/package.json`) |

Fonts: IBM Plex Sans 400/500/600/700 + IBM Plex Mono 400/500, self-hosted `.woff2`.

## 8. Design as currently implemented (before state)

- Palette in `styles/_tokens.css`: Persian pigments — lajvard `#1C39BB`, tile azure `#0067A5`,
  firouzeh `#00A693` / `#57C5C6`, zafaran `#F38400`, pomegranate `#CC3333`, night indigo `#0F1420`,
  miniature paper `#F6F1E7`.
- Visual language described by the project itself as a **"drafting sheet"**: monospace title-block
  metadata, hairline 1px rules, numbered sheet sections (`data-n="01"`), one permitted gradient
  (`lajvard → firouzeh`) used on the wordmark rule and focus ring only.
- Dark theme is the default; a no-flash inline script reads `sb-theme` from `localStorage`.
- Tailwind v4 is wired CSS-first: `@import "../tools/node-tools/node_modules/tailwindcss/index.css"`
  then `@import "./_tokens.css"`, with an `@theme inline` block mapping CSS custom properties to
  Tailwind colour/font utilities. **No `tailwind.config.js` exists** — correct for v4.

## 9. Git state

```
22f5acb fix(ci): import Tailwind directly from the pinned toolchain
49af536 docs: rewrite README for v2 and add the design/implementation plan
2d35ade ci: deploy to GitHub Pages via the official artifact flow
dc67826 feat(content): seed the blog
0765717 chore(build): pin Tailwind toolchain and local dev helpers
16ba8ad feat(design): Persian palette tokens, Tailwind v4 entrypoints, visitor JS
8f4fcac feat(admin): WASM admin with encrypted PAT vault and Toast UI editor
0a141d6 feat(generator): static site generator
ed162d5 feat(site): static page templates in the Persian drafting-sheet design
1390b21 feat(core): content model, frontmatter, markdown pipeline, indexing
4e93884 feat: scaffold v2 solution
b1a5d13 chore: remove legacy v1 WASM app and DbGenerator
```

`git status --porcelain` is empty — the working tree is clean, so every file observed above is
committed state.

## 10. Toolchain availability on this machine

| Tool | Status |
|---|---|
| Node | `v22.22.0` on PATH (plus a bundled `tools/nodejs/node.exe`) |
| .NET SDK | **10.0.301** at `C:\Program Files\dotnet` (9.0.300 also present). The **first** `dotnet` on PATH resolves to `C:\Program Files\AutoClaw\resources\dotnet\win-x64\dotnet.exe`, which has **no SDK installed** and fails with *"No .NET SDKs were found"*. Builds must use the absolute path or a PATH override. |
| Runtime | Microsoft.NETCore.App 10.0.9 / 9.0.5 / 8.0.17 / 6.0.33; AspNetCore.App 10.0.9 / 9.0.5 |
| Network | reachable (verified `cdn.jsdelivr.net` → HTTP 200) |
