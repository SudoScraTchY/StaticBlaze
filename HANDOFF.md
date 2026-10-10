# StaticBlaze — handoff for a fresh chat

_This file is the entry point for any new conversation working on this repository. It is written
to be read cold: everything a new session needs is here or one hop away. Last updated **2026-10-10**
by the AutoClaw session; commit `c0072ba` on `main`._

---

## 1. What this project is

**StaticBlaze** is a static blog generator that uses GitHub as its CMS, built by Mehrshad
(GitHub: `SudoScraTchY`). It is **not** a web app in the normal sense: the published site is
pre-built HTML, and an admin app edits the blog by committing Markdown/JSON through the GitHub API.

- **Language/stack:** .NET 10 (generator + tests), Blazor WASM (admin), Tailwind CSS v4 (CSS-first
  config, no `tailwind.config.js`), vanilla JS for the site's motion/3D.
- **Design language:** "Deep Field" — dark-only public site, realtime 3D archive graph, one accent
  (firouzeh `#57c5c6`), IBM Plex + Vazirmatn fonts. The **admin** is a light-default workspace
  since 2026-09-29 (dark kept).
- **Two-repo topology (since 2026-10-08):** StaticBlaze is the SOURCE; the blog repo is the
  LIVE site that actually gets used. The blog shares git history with source (it is a copy with
  blog-only adaptations, not a GitHub fork).
  - Source: https://github.com/SudoScraTchY/StaticBlaze → project site
    https://sudoscratchy.github.io/StaticBlaze/ (admin under /StaticBlaze/admin/)
  - Blog: https://github.com/SudoScraTchY/sudoscratchy.github.io → the live site
    https://sudoscratchy.github.io/ (admin under /admin/, edits the blog repo itself)
  - Sync rule: after every source update run `powershell -File tools/sync-blog.ps1`
    (merge with conflict policy: code=source wins, taxonomy=union by slug, content=blog wins;
    re-applies protected blog-only files: author bio, AuthorPage.razor résumé section, the
    résumé pdf; verifies build+tests+gates; pushes both repos). `-WhatIf` for a dry run.
  - The deploy workflow is repo-aware: admin base path and SITE_URL derive from the repository
    name, so one tree deploys correctly to both sites with no per-repo patching.
- Remote auth uses the machine's stored credential helper — do **not** extract, print or move
  tokens. (gh CLI is installed but not logged in inside this shell; use the API + git.)
- **Local path (the bound workspace):** `M:\Users\SaintScraTchY\RiderProjects\StaticBlaze`

## 2. Repository map

| Path | What it is |
|---|---|
| `content/` | the blog: `site.json` (all copy/nav/config), `posts/*.md` (typed YAML frontmatter), `authors/`, `taxonomy/` (tags+categories must be declared before use), `assets/` |
| `src/StaticBlaze.Core` | models, YAML frontmatter, the single Markdig pipeline (+ mermaid preprocessor), manifest/search builders |
| `src/StaticBlaze.Site` | Razor components used as static templates |
| `src/StaticBlaze.Generator` | console app: validates content, emits the site into `dist/` |
| `src/StaticBlaze.Admin` | Blazor WASM admin: PAT vault (AES-GCM), GitHub API client, Toast UI editor (vendored), media pipeline |
| `styles/` | `_tokens.css` (site, dark-only), `_admin-tokens.css` (admin, light-default + dark), `site.css` / `admin.css` entrypoints, `static/*.js` (site.js, motion.js, scene.js, graph.js), `vendor/` (GSAP, Three.js, mermaid), `fonts/` |
| `tools/` | build/verify scripts: `serve.mjs`, `audit-site.mjs`, `check-crossengine.mjs`, `check-casing.mjs`, `submissions.mjs`, `submissions-server.mjs`, `node-tools/` (pinned Tailwind CLI) |
| `tests/` | Core unit tests + Site golden-file tests (pin the HTML template contract) |
| `docs/` | 01 scan · 04 IA · 05 design system · 06 analytics · 07 verification · 09 Deep Field handoff · 00 documentation map · 10 design-changes guide · 11 agent UI context · 12 contact endpoint · 13 admin design · `prototypes/` (transition prototypes, admin style harness) |
| `CHANGELOG.md` | notable changes, newest first |

## 3. Commands that matter

```powershell
# PATH trap on this machine: the first dotnet on PATH is a runtime-only shim
$env:PATH="C:\Program Files\dotnet;"+$env:PATH; $env:DOTNET_ROOT="C:\Program Files\dotnet"

dotnet build StaticBlaze.slnx -c Release          # 0 errors expected
dotnet test  StaticBlaze.slnx -c Release          # 27 passing (19 core + 8 golden-file)

npm ci --prefix tools/node-tools                  # pinned Tailwind toolchain
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/site.css  -o dist-assets/site.css --minify
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify

dotnet run --project src/StaticBlaze.Generator -c Release -- --content content --out dist --css dist-assets/site.css --static styles/static --vendor styles/vendor --fonts styles/fonts

node tools/serve.mjs                              # http://localhost:8077/StaticBlaze/
node tools/audit-site.mjs dist                    # quality gate (links, canonicals, sitemap, residue)
node tools/check-crossengine.mjs dist/assets/site.css
node tools/check-casing.mjs                       # reads the git index; CI runs it before Test
```

Deployment is automatic: `.github/workflows/deploy.yml` runs on every push to `main`
(quality gates → generate → upload artifact → deploy-pages → verify the live URL). Pages Source is
"GitHub Actions" (do not set it back to branch mode — the legacy Jekyll build will race it).
CI status: `https://api.github.com/repos/SudoScraTchY/StaticBlaze/actions/runs?per_page=3`
(api.github.com has intermittent outages; the live URL is the fallback check).

## 4. State of the world (what is shipped and verified)

All of the below is on the live site and was verified with captured evidence:

- Deep Field redesign (public site), 3D archive graph (Obsidian-style, deterministic layout),
  related-posts graph on post pages (zoom/drag/hover), layered page transition, mermaid rendered
  client-side (vendored), search, comments plumbing (giscus, config-driven, **off** until
  Discussions + ids are set), contact form + hardened receiver (`docs/12`), About page filled from
  the author's personality rundown, Archive grouped by year/month with counts, admin redesign
  (light/dark themes, vendored editor, fluid workspace) — see `CHANGELOG.md`.
- Tests 27/27 · audit/cross-engine/casing gates PASS · CI green.
- Live verification was done with Playwright (headless Chromium) against the deployed URLs.

## 5. Open items (start here)

1. **Admin authenticated flow, one manual pass.** The admin needs the owner's PAT to get past the
   unlock screen, so Dashboard/Posts/PostEdit/Media/Settings were verified as components (harness
   + real stylesheet) and not by signing in. The QA checklist is in `docs/13-admin-design.md` §4.
   The create → save → publish round trip has never been exercised by this agent (needs the PAT).
2. **Giscus comments are built but off.** Needs: enable Discussions, install the giscus app, put
   `repoId`/`categoryId` into `content/site.json` → `comments` (steps in README).
3. **Contact endpoint is blank by design.** The form validates and says nothing was stored until
   `contact.endpoint` in `content/site.json` points at a deployed receiver
   (`tools/submissions-server.mjs`; deployment in `docs/12`).
4. **Admin media page 404s on `content/assets`** (the folder does not exist in the repo yet).
   Pre-existing behaviour, cosmetic; the receiver of the error should treat it as "no assets".
5. **Custom domain / real analytics** — deliberately deferred (`docs/06`).

## 6. Conventions and hard-won pitfalls (read before touching anything)

**Environment / tooling**
- `C:\Program Files\dotnet` must be first on PATH (the first `dotnet` is a runtime-only shim with
  no SDK — child processes fail in confusing ways, e.g. the Aspire dashboard).
- Shell is PowerShell 5.1: no `&&`, no `<<<`, no `??`; here-string terminators must start a line;
  `$args` is reserved. Long multi-line commit messages: write to a file, `git commit -F <file>`.
- The `write` tool lowercases filenames and is sandboxed to the AutoCoder workspace — repo files
  are written via scripts/`Copy-Item` with explicit casing (NTFS is case-insensitive; the git
  index is not, and `tools/check-casing.mjs` will catch mistakes).
- Node scripts that import Playwright must live next to `node_modules` (the scratch
  `…\.openclaw\tmp\pw\` folder has it installed).
- Background servers die at turn boundaries; always verify the served bytes before trusting a
  browser result (the STALE-SERVER trap has bitten twice).
- `api.github.com` has intermittent outages (connection `000`); the live site URL is the fallback.
- The `image` tool fails (HTTP 400) in this environment: never claim visual verification from a
  screenshot — measure computed styles / geometry instead.
- Console output can **redact** strings that look like tokens: `localStorage.getItem('sb-theme')`
  once displayed as `'***'` and cost a false-alarm investigation. Verify suspicious strings with
  char codes before believing them.

**Project-specific**
- The editor is Toast UI **vendored** in `src/StaticBlaze.Admin/wwwroot/vendor/toastui/` (CDN has
  no dark theme at any version; `theme:'dark'` is a silent no-op; npm tarballs are not browser
  builds). Markdown mode is **ProseMirror** — theme it via `.toastui-editor-md-container
  .ProseMirror` and the `toastui-editor-md-*` span classes.
- Admin themes live in `styles/_admin-tokens.css` (light default). If a new admin page uses a
  Tailwind class with a custom colour name, the matching `--color-*` key must exist there.
- Blazor gotcha worth remembering: `#app` (or any root) must not keep loading-placeholder layout
  classes — they shrank the whole admin to a centred column once.
- Public-site tokens are dark-only by design (`_tokens.css`); do not "fix" that as a drive-by.
- ElementReference pitfall: a rewritten Razor block that drops `@ref` passes an empty reference to
  JSInterop — the PostEdit editor crash on 2026-09-29 was exactly this.

## 7. Where evidence lives

- `CHANGELOG.md` — per-date changes.
- `DELIVERY/` (AutoCoder control workspace, **not** the repo) — HTML reports, screenshots,
  measurement packs: Deep Field delivery, transition prototypes, `admin-redesign/` (21 files:
  self-contained style harness, before/after screenshots, contrast measurements).
- `docs/07`, `docs/09`, `docs/13` — verification records with commands and exit status.
- Scratch tooling (Playwright + scripts) lives in the AutoCoder workspace under
  `.openclaw\tmp\` and may have been cleaned between sessions; everything needed to re-derive
  evidence is documented above.

## 8. Working agreement

- Reply in English (the user's language in this project).
- Commit in meaningful batches with explanatory messages; push to `main`; CI deploys.
- The user signs off on anything credential-shaped, domain-shaped, or production-shaped.
- Do not add features the user did not ask for; do not invent personal facts — the About copy came
  from the user's own rundown and must not be paraphrased into new claims.
