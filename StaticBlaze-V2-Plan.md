> **STATUS: HISTORICAL - superseded by the implementation.**
>
> This document captured the v2 design intent before the code existed. The code is now the source of
> truth, and four of its statements have drifted:
>
> | This document says | The code does |
> |---|---|
> | `net11.0` everywhere; CI pins a preview SDK | every `csproj` targets `net10.0`; `deploy.yml` pins `dotnet-version: 10.x` |
> | Tailwind via the standalone CLI executable, "no Node.js required" | `npm ci --prefix tools/node-tools` + `@tailwindcss/cli` in both CI and local development |
> | the generator has a `--migrate` command | no `--migrate` argument exists; the legacy import was never implemented |
> | `StaticBlaze.Site` exposes `MainLayout` / `Head` | the shell is `SitePage.razor`; there is no `Head` component |
>
> Where this document and the code disagree, believe the code. The shipped visual system also replaces
> the "drafting sheet" described below - see `docs/05-design-system.md`.
>
> Kept for history. Not maintained. Do not delete: the reasoning behind the v2 decisions is still worth
> reading. Current state lives in `README.md` and `docs/`.

---
# StaticBlaze v2 — Complete Design & Implementation Plan

> A from-scratch rebuild of StaticBlaze as a **Jekyll alternative in .NET**: GitHub as headless CMS,
> GitHub Pages as the only host, Blazor for both the site templates and the admin app.
> This document is self-contained — it assumes an **empty repository** and no prior codebase.

---

## 1. Vision & Core Decisions

**What it is**: a blog platform where content lives as markdown + JSON in the repository itself.
The author edits through a Blazor WASM admin app that writes to the repo via the GitHub REST API.
Every push triggers GitHub Actions to regenerate the public site as plain static HTML and deploy
to GitHub Pages. Visitors never download .NET — they get pre-built HTML with a small vanilla-JS
enhancement layer (Mermaid, syntax highlighting, search, theme toggle).

**Locked-in decisions:**

| Topic | Decision |
|---|---|
| Public site | **Statically generated HTML** rendered at build time from Blazor components. Best SEO, instant loads, zero WASM for readers. |
| Admin | **Blazor WebAssembly** app served at `/admin/` on the same Pages site. The only place .NET runs client-side. |
| Canonical content | **Markdown only.** HTML is always *derived* at build time. "Preview = what ships" because admin preview uses the identical Markdig pipeline. Bad markdown fails the build instead of shipping a broken page. |
| Database | **None.** No SQLite: a static `.db` file must be fully downloaded before one query, is unmergeable and un-diffable. Replaced by a generated `manifest.json` (fetch-once, cacheable, tens of KB at blog scale). |
| GitHub auth | PAT stored in an **encrypted vault**: WebCrypto AES-GCM-256, key derived from a passphrase (PBKDF2-SHA256, ~310k iterations). Ciphertext in localStorage; derived key only in memory. |
| Target framework | **net10.0** (current installed SDK / LTS). Bumping to net11.0 later is a one-line `TargetFramework` change per project — nothing 11-specific is used. |
| Styling | **Tailwind CSS v4** via the **standalone CLI executable** (no Node.js required, locally or in CI). |
| Editor | **Toast UI Editor** loaded from CDN inside the admin only. Full markdown + Mermaid support. |
| Markdown engine | **Markdig** — one shared pipeline used by the generator (final HTML) and the admin (live preview). |
| Deployment | GitHub Actions → official Pages flow (`actions/configure-pages` / `upload-pages-artifact` / `actions/deploy-pages`). No deploy branches, no PAT secrets in CI. |

**Data flow:**

```
Author ──▶ /admin/ (Blazor WASM + Toast UI)
             │  GitHub REST API (PAT, contents API, SHA-aware)
             ▼
Repo: content/*.md + *.json ──push──▶ GitHub Actions
                                          │  StaticBlaze.Generator (console)
                                          │    • validates content
                                          │    • renders Blazor components → HTML
                                          │    • emits manifest.json, search index,
                                          │      RSS/Atom, sitemap
                                          │  StaticBlaze.Admin published → /admin/
                                          ▼
                                    GitHub Pages artifact
Visitor ──▶ pure HTML + site.js (lazy mermaid/highlight.js/search/theme)
```

---

## 2. Repository Layout

```
/
├── content/                          # canonical store — "GitHub as CMS"
│   ├── site.json                     # site-level config
│   ├── authors/{handle}.json         # one file per author (merge-friendly)
│   ├── taxonomy/tags.json            # shared tag metadata
│   ├── taxonomy/categories.json      # shared category metadata
│   ├── posts/{yyyy-MM-dd}-{slug}.md  # frontmatter + markdown body
│   └── assets/{sha256}.{ext}         # content-hashed media (auto-deduped)
├── src/
│   ├── StaticBlaze.Core/             # net10.0 class library — no UI deps
│   ├── StaticBlaze.Site/             # Razor class library — page templates
│   ├── StaticBlaze.Generator/        # net10.0 console — the static site generator
│   └── StaticBlaze.Admin/            # Blazor WASM — authoring app
├── tests/
│   └── StaticBlaze.Core.Tests/       # xUnit
├── tools/                            # tailwind standalone CLI (gitignored)
├── styles/                           # Tailwind v4 CSS entrypoints (@source directives)
├── StaticBlaze.sln
├── .gitignore
└── .github/workflows/deploy.yml
```

---

## 3. Content Model (the "GitHub as CMS" contract)

### 3.1 `content/site.json`

```json
{
  "title": "My Blog",
  "description": "Thoughts about .NET and the web",
  "url": "https://example.github.io/repo",
  "language": "en",
  "postsPerPage": 10,
  "feedPostCount": 20,
  "nav": [ { "label": "Archive", "href": "/archive/" }, { "label": "Tags", "href": "/tags/" } ],
  "defaultAuthor": "sudoscratchy"
}
```

- `url` must be the absolute public origin (custom domain or pages URL) — used for canonical
  URLs, sitemap, RSS, OG tags.
- `postsPerPage` drives landing pagination.

### 3.2 Post file: `content/posts/{yyyy-MM-dd}-{slug}.md`

- File name encodes the creation date; the slug is the frontmatter slug (filename slug is a
  fallback only). One file per post = clean diffs, clean merges, trivial API writes.
- **Typed YAML frontmatter** (YamlDotNet — real quoting/escaping, real lists):

```yaml
---
title: "Post: With Colons"        # safe — YamlDotNet quotes on write
slug: with-colons
description: short summary used in cards, meta description, search
author: sudoscratchy              # must match authors/{handle}.json
tags: [blazor, wasm]              # real YAML lists, never comma strings
category: dev                     # must match taxonomy/categories.json
thumbnail: assets/<sha256>.jpg    # relative to content root
published: 2026-08-21T10:00:00Z
modified: 2026-08-21T12:00:00Z
featured: true
draft: false
---
Body in **markdown**. ```mermaid fences, images, code, tables, footnotes all supported.
```

Rules:
- `draft: true` posts are excluded from generation entirely.
- `published` sorts listings; `modified` shows "updated" and feeds `lastmod`.
- `tags` entries must exist in `taxonomy/tags.json` (validation error otherwise).

### 3.3 `content/authors/{handle}.json`

```json
{
  "handle": "sudoscratchy",
  "name": "Mehrshad",
  "bio": "Some words.",
  "avatar": "assets/<sha256>.jpg",
  "website": "https://example.com",
  "social": { "github": "sudoscratchy", "x": "sudoscratchy" }
}
```

### 3.4 `content/taxonomy/tags.json` (categories.json same shape)

```json
[
  { "slug": "blazor", "title": "Blazor", "description": "All things Blazor." }
]
```

Taxonomies are metadata-only (display names, descriptions). Post counts and post lists per
tag/category are **computed at build time**, never stored — so they can never drift.

---

## 4. The Four Data Questions (answered by design)

**How posts are displayed** — visitor opens `/posts/{slug}/` which is a pre-built
`index.html` produced by rendering the markdown through the shared Markdig pipeline at build
time. Mermaid blocks and code fences are progressively enhanced by `site.js`.

**How posts are searched** — generator emits `search-index.json` (see §7.3). It is lazily
fetched **only when the visitor focuses the search box**; a small vanilla-JS scorer (title and
tags boosted over body text) shows a dropdown linking to static pages. Tag/category browsing
needs no JavaScript at all — those are pre-generated static pages.

**How recommended posts are chosen** — computed at build time in `ManifestBuilder`:
score = (shared tags × 2) + (same category × 1) + recency tiebreak; top 3 per post; baked
into the post page HTML and the manifest. Zero client cost.

**How landing page posts are shown** — `featured: true` posts in a hero section, then latest
posts sorted by `published` descending, paginated into static pages `/`, `/page/2/`, … with
`postsPerPage` from `site.json`.

---

## 5. URL Structure (all static files on Pages)

| URL | File |
|---|---|
| `/` | `index.html` (landing, page 1) |
| `/page/{n}/` | `page/{n}/index.html` |
| `/posts/{slug}/` | `posts/{slug}/index.html` |
| `/tags/` | `tags/index.html` |
| `/tags/{slug}/` | `tags/{slug}/index.html` |
| `/categories/{slug}/` | `categories/{slug}/index.html` |
| `/authors/{handle}/` | `authors/{handle}/index.html` |
| `/archive/` | `archive/index.html` (chronological list, year groups) |
| `/admin/` | published WASM app (base href `/admin/`) |
| 404 | `404.html` |
| assets | `assets/*`, `assets/site.css`, `assets/site.js` |
| feeds/SEO | `rss.xml`, `atom.xml`, `sitemap.xml`, `robots.txt` |

---

## 6. Project Specs

### 6.1 `StaticBlaze.Core` (class library — the contract, no UI deps)

**Packages**: `Markdig`, `YamlDotNet`.

- `Models/` — immutable records:
  - `SiteConfig` (mirrors site.json), `AuthorRecord`, `TaxonomyTerm` (slug/title/description)
  - `PostFrontmatter` (typed record matching §3.2), `Post` (frontmatter + body markdown +
    computed fields: `Html`, `ReadTimeMinutes`, `Url`, `WordCount`), `PostSummary` (manifest entry)
- `Frontmatter/FrontmatterSerializer` — YamlDotNet parse + write; round-trip safe
  (`Serialize(Parse(x)) == x` for quoting, colons, unicode, lists). Throws `ContentValidationException`
  with file path + line info on bad YAML.
- `Content/ContentStore` — loads the whole `content/` tree from disk into typed objects
  (used by Generator; Admin has an API-based equivalent).
- `Content/ContentValidator` — fails with a list of clear errors on:
  duplicate slugs · missing/unknown author · unknown tag or category · missing `published` ·
  thumbnail/asset reference that doesn't exist in `content/assets/` · unparsable frontmatter.
- `Markdown/MarkdownPipelineFactory` — **the single pipeline** (advanced extensions, pipe +
  grid tables, emoji, task lists, footnotes, citations, auto-identifiers, autolinks, generic
  attributes). Both Generator and Admin preview call this factory — never construct their own.
- `Markdown/MermaidPreprocessor` — rewrites ` ```mermaid ` (and legacy `graph`,
  `sequenceDiagram`, `gantt`, `classDiagram` fence names) into `<pre class="mermaid">` before
  Markdig runs, so diagrams survive as raw text for client-side mermaid.js.
- `Markdown/ReadTime` — words ÷ 200, min 1.
- `Indexing/ManifestBuilder` — builds:
  - post index sorted by `published` desc;
  - per-post related slugs (scoring above);
  - tag/category aggregates (term → post summaries);
  - pagination slices;
  - author → posts.
- `Indexing/SearchIndexBuilder` — emits one entry per post: slug, title, description, tags,
  category, date, and body text stripped of markdown (plain text via Markdig plain-text render).
- `GitHub/GitHubModels` — contents-API DTOs with source-generated `JsonSerializerContext`.

### 6.2 `StaticBlaze.Site` (Razor class library — the templates)

Components render **full HTML documents** (they're used by the generator, not a router):

- `SitePage` — shared document wrapper: `<!DOCTYPE html>`, head (meta, OG/Twitter/canonical,
  JSON-LD, CSS link), header nav, `<main>`, footer, `site.js` module tag, theme no-flash script.
- `PostPage` — full article: title, byline (author link, published/modified dates, read time),
  thumbnail, rendered HTML body, tag pills, related posts (3), author bio card.
- `LandingPage` — hero + featured posts + paginated latest grid.
- `ListPage` variants — `TagPage`, `CategoryPage`, `AuthorPage`, `ArchivePage` (year-grouped).
- `Components/` — `PostCard` (with loading-free static markup, gradient fallback when no
  thumbnail), `Pagination` (prev/next + numbers, links to real static URLs), `TagPills`,
  `AuthorBio`, `EmptyState`.
- **Constraints**: no `NavigationManager`, no JS interop, no `@page` routes — everything
  arrives as `[Parameter]`s (the generator supplies them). This keeps rendering pure and host-agnostic.
- Styling consumed from `/assets/site.css` (Tailwind v4 build output — see §8).
- Dark mode: `dark:` variants + `.dark` class on `<html>` (toggle in site.js, persisted).

### 6.3 `StaticBlaze.Generator` (console app — the static site generator)

**Packages**: `Microsoft.AspNetCore.Components.Web`, `Microsoft.Extensions.Logging`
(easiest via `<FrameworkReference Include="Microsoft.AspNetCore.App" />`).

`Program.cs` args: `--content <dir> --out <dir>` (defaults `content/`, `dist/`). Steps:

1. Load `ContentStore` → run `ContentValidator` → **non-zero exit with all errors listed** if invalid.
2. Build manifest, search index, related posts (`ManifestBuilder`).
3. Render every page through Blazor:

```csharp
var services = new ServiceCollection();
services.AddLogging();
await using var provider = services.BuildServiceProvider();
var loggerFactory = provider.GetRequiredService<ILoggerFactory>();
await using var renderer = new HtmlRenderer(provider, loggerFactory);

async Task<string> Render<T>(IDictionary<string, object?> parameters) where T : IComponent
    => await renderer.Dispatcher.InvokeAsync(async () =>
    {
        var output = await renderer.BeginRenderingComponent<T>(ParameterView.FromDictionary(parameters));
        return output.ToHtmlString();
    });
```

4. Emit (§5 table): every HTML page, copy `content/assets/` → `dist/assets/`, copy built
   `site.css` + `site.js` (+ search module) into `dist/assets/`, write `manifest.json`,
   `search-index.json`, `rss.xml`, `atom.xml` (full-content, latest N), `sitemap.xml`
   (all pages + `lastmod`), `robots.txt` (sitemap pointer), `404.html`.
5. Optionally emit `.gz` siblings for the JSON artifacts (fetched via `DecompressionStream`).
6. Deterministic output (stable ordering, no timestamps inside HTML) → clean git diffs.

XML for feeds/sitemap via `System.Xml.Linq` (correct escaping for free).

### 6.4 `StaticBlaze.Admin` (Blazor WASM — served at `/admin/`)

**Packages**: `Blazored.LocalStorage`, `SixLabors.ImageSharp`, `HeyRed.Mime`.

#### Auth — the PAT vault

- `wwwroot/js/patVault.js` (ESM, owns all WebCrypto):
  - `deriveKey(passphrase, salt)` → PBKDF2-SHA256, 310,000 iterations, 16-byte random salt,
    AES-GCM-256 key (extractable: false).
  - `saveToken(passphrase, token)` → `{ v: 1, salt, iv, ct }` (base64 fields) → localStorage key `sb.pat.vault`.
  - `unlock(passphrase)` → decrypt, keep **key in module memory only**, return token; `lock()` clears it.
  - Idle auto-lock (e.g. 15 min inactivity) + lock on `pagehide` best-effort.
- `PatVaultService` (C# wrapper over the JS module) + `AuthService`:
  - Unlock → verify via `GET /user`, then `GET /repos/{owner}/{repo}` (permissions check);
    require the token's login to be owner/collaborator.
  - README documents **fine-grained PATs**: single repository, Contents: Read and write,
    short expiry — limits blast radius if the ciphertext ever leaks.
- UI: first-run screen (paste PAT + choose passphrase), returning screen (passphrase only),
  lock screen. Config (`owner`, `repo`, `branch`) from `wwwroot/appsettings.json` — single
  source of truth, no duplicate config files.
- Honest threat model in docs: encryption protects the token **at rest**; it cannot protect
  against live XSS on a compromised page.

#### GitHub client (fixes the classic contents-API pitfalls)

`GitHubApiClient` (typed `HttpClient`, `User-Agent: StaticBlaze-Admin`, source-gen JSON):

- `GetFileAsync(path)` → `{ Content (base64→UTF8), Sha }`.
- `PutFileAsync(path, content, message, sha?)` — **PUT without `sha` only for creates; PUT
  with current `sha` for updates**; on 409, refetch SHA once and retry (this is the bug that
  silently breaks every second taxonomy save in naive implementations).
- `DeleteFileAsync(path, message, sha)`.
- `ListTreeAsync(prefix)` → Git **Trees API** (one call lists all posts/assets — not the
  contents API per-folder listing).
- `GetCommitsAsync(path, n)` → recent activity for the dashboard.

#### Services

- `PostService` — list posts (tree), load (frontmatter + body via Core), save (round-trip
  through `FrontmatterSerializer`), create (`{today}-{slug}.md`), delete; draft toggle.
- `MediaService` — upload with **SHA-256 content-addressed filenames** (`{hash}.{ext}`, ext
  from MIME via `HeyRed.Mime`); client-side ImageSharp compression before upload (PNG/JPEG/WebP,
  quality ~0.7, max dimension cap); identical bytes → identical name → automatic dedupe;
  returns raw GitHub URL for markdown insertion. List existing assets via tree.
- `TaxonomyService` — read/update `tags.json` / `categories.json` through the SHA-aware client.
- `PreviewRenderer` — renders body markdown through **Core's** pipeline for the editor preview.

#### UI pages (Tailwind, no component libraries — CSS animations instead)

`/unlock` · `/dashboard` (real stats: post/tag/category/asset counts from the tree + recent
commits — no fabricated analytics) · `/posts` (list + search/filter over tree + status) ·
`/posts/edit` (metadata form + **Toast UI Editor** from CDN with `addImageBlobHook` wired to
`MediaService`, live preview via `PreviewRenderer`, save → commit via API) · `/media` (grid,
upload, copy markdown snippet) · `/settings` (repo config, vault management, lock now).

Toast UI loading: small JS module (`admin-editor.js`) that lazily injects the Toast UI CDN
CSS/JS on first use, constructs the editor, marshals changes to .NET via
`DotNetObjectReference`, and pipes pasted images through the `[JSInvokable]` upload bridge
(compress in JS canvas or send bytes to C# for ImageSharp — pick one; C# keeps parity).

#### Base href handling

Dev uses `<base href="/" />`. CI publish passes `-p:AdminBaseHref=/admin/`; an MSBuild
`AfterPublish` target rewrites the base tag in `index.html` from the property (repo-relative
path if the site is at `user.github.io/repo/`). No external package needed.

---

## 7. Generated Artifacts (shapes)

### 7.1 `manifest.json` (fetch-once client index)

```json
{
  "generatedAt": "2026-08-21T00:00:00Z",
  "site": { "title": "…", "description": "…", "url": "…" },
  "posts": [
    {
      "slug": "with-colons", "url": "/posts/with-colons/",
      "title": "…", "description": "…",
      "author": { "handle": "sudoscratchy", "name": "Mehrshad", "avatar": "…" },
      "tags": ["blazor"], "category": "dev",
      "thumbnail": "assets/…jpg",
      "published": "…", "modified": "…",
      "readTimeMinutes": 4, "featured": true,
      "related": ["other-post", "…"]
    }
  ],
  "tags":       [ { "slug": "blazor", "title": "Blazor", "count": 7 } ],
  "categories": [ { "slug": "dev",  "title": "Dev",   "count": 12 } ]
}
```

### 7.2 Feeds / SEO

RSS 2.0 + Atom (full rendered content, latest `feedPostCount`), `sitemap.xml` with `lastmod`
from `modified`, `robots.txt` pointing at the sitemap, per-page canonical + OG + Twitter cards
+ JSON-LD (`BlogPosting`, `Person`) emitted by `SitePage`'s head.

### 7.3 `search-index.json`

```json
[ { "slug": "…", "title": "…", "description": "…", "tags": ["…"], "category": "…",
    "published": "…", "body": "plain text stripped of markdown" } ]
```

---

## 8. Tailwind v4 Without Node.js

- Download the official **Tailwind standalone CLI** (`tailwindcss-windows-x64.exe` from the
  tailwindcss GitHub releases; linux-x64 in CI) into `tools/` (gitignored; CI downloads pinned version).
- CSS entrypoints in `styles/`:

```css
/* styles/site.css */
@import "tailwindcss";
@source "../src/StaticBlaze.Site";
@source "../content";
@custom-variant dark (&:where(.dark, .dark *));
```

```css
/* styles/admin.css */
@import "tailwindcss";
@source "../src/StaticBlaze.Admin";
@custom-variant dark (&:where(.dark, .dark *));
```

- Build: `tools/tailwindcss -i styles/site.css -o dist/assets/site.css --minify`
  (admin output goes to the Admin `wwwroot/assets/admin.css`).
- Content sources: `.razor`, `.cs`, `.html`, and markdown (classes may appear in prose).

---

## 9. Visitor JavaScript — `site.js` (one small ESM file, no framework)

1. **Theme toggle**: respects `prefers-color-scheme` default; toggles `.dark` on `<html>`;
   persists choice in localStorage; inline no-flash snippet in `<head>` reads storage before paint.
2. **Mermaid**: lazily dynamic-`import()`s mermaid@11 ESM **only if the page contains
   `pre.mermaid`**; initializes dark-aware; `mermaid.run({ nodes })` with per-block error fallback.
3. **Syntax highlighting**: lazily loads highlight.js (common subset + languages actually used
   can be extended later) **only if the page has code blocks**; `hljs.highlightElement` per block.
4. **Copy buttons**: injected into every `<pre>`; clipboard API; success checkmark animation.
5. **Search**: nav search box; on first focus fetch `search-index.json` (+ optional `.gz`
   via `DecompressionStream`); scorer = title×5 + tags×3 + description×2 + body×1, prefix +
   substring, case-insensitive; top 8 results as a dropdown linking to static URLs; keyboard
   navigable; `<Esc>` closes. No external search library.

No markdown parsing happens client-side for visitors — the HTML is already built.

---

## 10. CI — `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main]
    paths: ['content/**', 'src/**', 'styles/**', '.github/workflows/deploy.yml']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.x'

      - name: Download Tailwind standalone CLI
        run: |
          curl -sL https://github.com/tailwindlabs/tailwindcss/releases/download/v4.1.17/tailwindcss-linux-x64 \
            -o tools/tailwindcss && chmod +x tools/tailwindcss

      - name: Test
        run: dotnet test

      - name: Build site CSS
        run: tools/tailwindcss -i styles/site.css -o dist-assets/site.css --minify

      - name: Generate static site
        run: dotnet run --project src/StaticBlaze.Generator -- --content content --out dist

      - name: Publish admin
        run: >
          dotnet publish src/StaticBlaze.Admin -c Release
          -o admin-published -p:AdminBaseHref=/admin/

      - name: Assemble Pages artifact
        run: |
          cp dist-assets/site.css dist/assets/site.css
          mkdir -p dist/admin
          cp -r admin-published/wwwroot/* dist/admin/
          echo > dist/.nojekyll
          # custom domain: echo "my.domain" > dist/CNAME

      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

Notes: official artifact-based Pages flow (enable "GitHub Pages → Source: GitHub Actions" in
repo settings once). No deploy branch, no `GHPAT` secret. Admin commits to `content/` re-trigger
the build automatically. Pin the Tailwind version to the latest v4 release at creation time.

---

## 11. Test Plan (`tests/StaticBlaze.Core.Tests`, xUnit)

- **Frontmatter**: parse → serialize round-trip (colons in titles, unicode, emoji, empty lists,
  quoted strings, multiline descriptions); missing required fields → validation errors.
- **Validation**: duplicate slugs, unknown author/tag/category, missing asset file, draft
  exclusion.
- **Markdown pipeline**: mermaid fence preprocessing (all fence names, content preserved),
  code fences untouched, tables/footnotes/tasks render, HTML output is stable (golden test).
- **Manifest**: published-desc ordering, pagination slices, related-posts scoring (tag overlap
  beats category, tiebreak by recency), tag/category counts.
- **Search index**: body text actually stripped of markdown syntax.
- **Generator golden test**: run against a fixture `content/` → assert key files exist and
  `posts/{slug}/index.html` contains expected markers (title, OG tag, mermaid pre, related section).

---

## 12. Implementation Phases (checklist)

**Phase 1 — Foundation**
- [ ] Empty repo, `.gitignore` (bin/obj/dist/tools/node_modules), scaffold 5 projects + sln
      (`Core`, `Site`, `Generator`, `Admin`, tests) with the references:
      Generator→Core+Site, Site→Core, Admin→Core, Tests→Core.
- [ ] Core models + `FrontmatterSerializer` + `ContentStore` + `ContentValidator` + tests.
- [ ] `MarkdownPipelineFactory` + `MermaidPreprocessor` + `ReadTime` + tests.
- [ ] `ManifestBuilder` + `SearchIndexBuilder` + tests.
- [ ] Seed `content/` (site.json, one author, tags/categories, 2–3 sample posts incl. one with
      mermaid + code + images, one draft).

**Phase 2 — Site + Generator**
- [ ] `Site` components (SitePage, PostPage, Landing, tag/category/author/archive, PostCard,
      Pagination) + head/SEO/JSON-LD.
- [ ] Tailwind standalone CLI + `styles/site.css` build.
- [ ] Generator end-to-end: validate → render → emit all artifacts (§5, §7).
- [ ] `site.js` (theme, mermaid, highlight, copy, search) + 404 page.
- [ ] Verify locally: generator output opens correctly from `dist/`, mermaid renders, search works.

**Phase 3 — Admin**
- [ ] `patVault.js` + `PatVaultService` + unlock/first-run/lock flows + GitHub identity check.
- [ ] `GitHubApiClient` with SHA-aware PUT/409-retry, trees, commits.
- [ ] `PostService`, `MediaService` (hash names + compression), `TaxonomyService`, `PreviewRenderer`.
- [ ] UI: dashboard (real stats), posts list, editor (Toast UI + preview), media, settings.
- [ ] Admin CSS build + base-href publish property.
- [ ] Verify locally against a real repo test branch.

**Phase 4 — Ship**
- [ ] `deploy.yml` (§10), enable Pages → GitHub Actions source.
- [ ] End-to-end: edit a post in `/admin/` → push → Actions rebuild → live page updated.
- [ ] README (setup, fine-grained PAT guidance, threat model for the vault, content authoring guide).

**Phase 5 — Polish (post-MVP)**
- [ ] Comments via GitHub Issues (utterances-style), theme customization tokens, real
      analytics (external service), GitHub OAuth (requires a tiny serverless token exchange —
      impossible on static hosting alone; document as optional Cloudflare Worker).

---

## 13. Threat Model & Honest Limitations

- **PAT in browser**: AES-GCM at rest protects localStorage dumps; a live XSS can capture the
  passphrase or in-memory token. Mitigations: fine-grained scoped PAT, short expiry, minimal
  third-party JS on `/admin/` (Toast UI is the only CDN dependency), CSP meta tag.
- **Static hosting**: no server secrets, but also no server-side anything — OAuth and private
  drafts-before-publish need external help (drafts are simply not deployed; "preview" for the
  author happens inside the admin editor).
- **Concurrency**: two admins editing the same file = last write wins after SHA re-fetch;
  acceptable for a single-author blog, documented.
