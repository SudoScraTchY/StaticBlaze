# 02 — Task Assessment

**Question answered:** what is this project's outstanding task, how complete is it, and what is
concretely unfinished or inconsistent?

---

## 1. The task

The repository's own plan (`StaticBlaze-V2-Plan.md`) defines the task as a **complete v2 rewrite**:
drop the legacy Blazor WASM blog + `StaticBlaze.DbGenerator`, and replace them with

1. a `content/`-as-CMS Markdown store,
2. `StaticBlaze.Core` (models / frontmatter / Markdig / indexing),
3. `StaticBlaze.Site` (Razor templates rendered to static HTML),
4. `StaticBlaze.Generator` (the generator),
5. `StaticBlaze.Admin` (Blazor WASM authoring app at `/admin/`),
6. CI to GitHub Pages.

The plan closes with five implementation phases (§12) and one explicitly deferred list (§ "Out of
scope (documented as future)"): GitHub OAuth, comments via GitHub Issues, theme marketplace, real analytics.

## 2. How complete it is

**Phases 1–4 are done; Phase 5 is done except for three named items.** Evidence:

- All four projects exist, all twelve commits land in the order the plan describes, and the last
  commit is a CI fix rather than a feature — i.e. the feature set is closed.
- `README.md` § Status is a self-reported checklist. Five of six boxes are ticked. The single
  untickrd line reads:
  `- [ ] Comments (GitHub Issues), theme customization, real analytics`
- `dist/` contains every artefact the plan's §6.3 step 4 enumerates (see scan report §6), and the
  three published posts render, paginate and feed correctly.
- `git status` is clean, so the committed tree is the working tree.

**Estimate: the v2 rewrite is ~92 % complete by the plan's own phase list.** What remains is the
deferred trio above, plus documentation drift and a small set of concrete defects listed below.

## 3. Concrete findings

Each finding cites the file where it was observed.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| F1 | **`--migrate` is documented but not implemented.** The plan lists `--migrate` as generator step 5 ("ports legacy `Data/Docs/*.md` + `Tags.json` into `content/`"). `Program.cs` only parses `--content`, `--out`, `--fonts`, `--static`; there is no `--migrate` branch and no legacy import code anywhere in the repo. | `src/StaticBlaze.Generator/Program.cs` (arg parsing at top, 4 args) vs `StaticBlaze-V2-Plan.md` §6.3 | Medium — the legacy migration path is a documented no-op. |
| F2 | **The documented local preview flow produces an unstyled site.** `README.md` tells you to run the generator, then `node tools/serve.mjs`. `Program.cs` deletes `dist/` and copies only `content/assets`, `styles/fonts` and `styles/static` into it. `styles/static/` contains `site.js` only — there is **no** `styles/static/site.css`. The built stylesheet at `dist/assets/site.css` is produced by the CI-only step `cp dist-assets/site.css dist/assets/site.css` in `deploy.yml`. So a clean local run yields HTML with a `<link>` to a CSS file that does not exist. | `README.md` § Getting started; `src/StaticBlaze.Generator/Program.cs` (asset copy block); `.github/workflows/deploy.yml` § Assemble Pages artifact; file listing shows `styles/static/site.js` but no `styles/static/site.css` | **High** — every local reviewer hits an unstyled page. |
| F3 | **Toolchain target drift.** The plan states `net11.0` everywhere and "*CI pins the preview SDK until .NET 11 GA in Nov 2026*". All four `csproj` files target `net10.0`, `README.md` says "Requirements: .NET 10 SDK", and `deploy.yml` pins `dotnet-version: '10.x'`. | all four `src/*/*.csproj`; `README.md`; `.github/workflows/deploy.yml` vs `StaticBlaze-V2-Plan.md` § Core decisions | Low — code is coherent; the plan is stale. |
| F4 | **CI description drift.** The plan says "Tailwind via the standalone CLI executable (no Node.js required, locally or in CI)" and shows `curl … tailwindcss-linux-x64`. The implementation uses `npm ci --prefix tools/node-tools` + `@tailwindcss/cli` in both CI and local development, and also carries an unused `tools/tailwindcss.exe` (112.5 MB, gitignored). | `.github/workflows/deploy.yml`; `tools/node-tools/package.json`; `README.md` vs `StaticBlaze-V2-Plan.md` §8 | Low — the implementation is the better one; the plan and the stray 112 MB binary are the problem. |
| F5 | **Golden-file HTML tests are documented but absent.** The plan's test plan promises "golden-file HTML tests for a sample post". `tests/StaticBlaze.Core.Tests/` contains `FrontmatterTests.cs`, `ManifestBuilderTests.cs`, `MermaidTests.cs`, `ValidationAndSearchTests.cs` — no golden-file/HTML fixture test. | `tests/StaticBlaze.Core.Tests/` file listing vs `StaticBlaze-V2-Plan.md` § Testing | Medium — nothing guards the rendered HTML contract. |
| F6 | **`tools/get-fonts.ps1` hard-codes one machine's absolute path.** `$d = 'M:/Users/SaintScraTchY/RiderProjects/StaticBlaze/styles/fonts'`. | `tools/get-fonts.ps1` line 2 | Low — the font regeneration script is not portable. |
| F7 | **`--taxonomy` indexes are generated but unreachable from navigation.** `site.json` `nav` is only `posts`, `archive`, `about`. `dist/tags/index.html` and `dist/categories/index.html` exist and are listed in `sitemap.xml`, but nothing in the header, footer or page body links to them — you can only reach a tag page through a tag pill on a card or post, and you can reach the tag *index* at all only by typing the URL. | `content/site.json` `nav[]`; `src/StaticBlaze.Site/Components/SitePage.razor` nav render; `dist/tags/index.html` exists | Medium — real IA defect; three pages are orphaned. |
| F8 | **The header search box has no accessible name.** `SitePage.razor` renders `<input type="search" data-search-input placeholder="search…" autocomplete="off" …>` with no `<label>`, no `aria-label` and no `title`. Placeholder-as-label fails WCAG 1.3.1 / 3.3.2 and disappears on input. The theme-toggle `<button>` does have `aria-label`, so this is an isolated omission. | `src/StaticBlaze.Site/Components/SitePage.razor` header block | Medium — WCAG Level A failure on the only input on the site. |
| F9 | **Contrast failures in the shipped palette.** Measured with a WCAG 2.x implementation (script retained at `.openclaw/tmp/contrast.mjs`): light theme `--gold #b35c00` on `--bg #f6f1e7` = **4.19:1** (needs 4.5:1 for the 11 px mono section numbers it paints); light theme `--color-firouzeh #00a693` on `--bg` = **2.71:1**; dark theme `--color-pomegranate #cc3333` on `--bg #0f1420` = **3.58:1**. Also `#fff` on `#cc3333` = 3.85:1 — below AA for the small text it is used with. | `styles/_tokens.css`; measured output of `.openclaw/tmp/contrast.mjs` | **High for a public site** — the palette is a named design decision that does not currently meet WCAG AA everywhere it is used. |
| F10 | **The "one gradient" rule is enforced by a hard-coded hex pair, not by tokens.** `.tile-rule { background: linear-gradient(90deg, #1c39bb, #00a693) }` — the lajvard and firouzeh stops are literals, so the gradient cannot follow the theme. In dark mode it is the same two hexes as in light mode. | `styles/site.css` `.tile-rule`; also duplicated in `styles/admin.css` | Low — cosmetic, but it contradicts the file's own header comment about token discipline. |
| F11 | **RTL is impossible today.** `SitePage.razor` writes `<html lang="@Site.Language" data-theme="dark">` with no `dir`, and the CSS uses physical properties (`padding-left: 1.4rem`, `border-left: 2px solid`, `padding-right: 2rem`, `left: 0`, `right: 0.5rem`). `site.json` declares `"language": "en"`, so nothing is broken *today* — but a Persian-language deployment (which the project's own design rationale anticipates) would mirror incorrectly. | `src/StaticBlaze.Site/Components/SitePage.razor`; `styles/site.css`; `content/site.json` | Medium — blocks the stated Persian direction. |
| F12 | **The one draft post is unreachable and unsignalled.** `content/posts/2026-08-20-admin-behind-the-lock.md` has `draft: true` and a body that literally reads "Notes to self… Not published yet." It is correctly excluded from `dist/` (3 post directories, not 4) — but nothing in the repo or the admin UI surfaces that a draft is waiting. | `content/posts/2026-08-20-admin-behind-the-lock.md`; `dist/posts/` contains 3 directories | Low — working as designed, worth surfacing. |
| F13 | **`tools/serve.mjs` returns HTTP 200 for missing routes.** The catch-all `catch { data = await readFile(join(root, '404.html')) }` then unconditionally does `res.writeHead(200, …)`. A 404 page is therefore served as a success, which also means the not-found page cannot be smoke-tested honestly. | `tools/serve.mjs` | Low — dev-server only. |
| F14 | **Pagination is never exercised.** `postsPerPage: 10` with 3 published posts means `/page/2/…` is never generated, so the `Pagination.razor` component and the `page/{n}` route space are untested in the committed output. | `content/site.json`; `dist/` has no `page/` directory; `src/StaticBlaze.Site/Components/Pagination.razor` | Low today, **Medium** as soon as post #10 lands. |
| F15 | **Design language is print-derived, not screen-native.** The current system is a self-described "drafting sheet": hairline rules everywhere, monospace title-blocks, numbered sheet sections, flat bordered rectangles, and one `border-color` change as the only hover state. There is no elevation model, no motion vocabulary, no state differentiation beyond colour, and no data surface anywhere — `dist/archive/index.html` renders a year list as bare hairline rows even though `manifest.json` already contains everything needed to show density. | `styles/site.css` (`.section-label`, `.title-block`, `.tile-rule`); `styles/_tokens.css` header comment ("Structure: Swiss/blueprint discipline"); `src/StaticBlaze.Site/Components/Pages/ArchivePage.razor` | This is the design brief — see `docs/04-information-architecture.md` and `docs/05-design-system.md`. |

## 4. Blockers and inconsistencies, summarised

- **Real blockers: none.** The tree builds in principle, CI is coherent, and there is no missing
  secret, credential or external dependency. (Two environment notes: the first `dotnet` on PATH has
  no SDK — use `C:\Program Files\dotnet\dotnet.exe`; and F2 must be fixed before "run the build and
  look at the site" is a meaningful instruction.)
- **Documentation drift** (F3, F4, F5, F1) is the largest class of defect: `StaticBlaze-V2-Plan.md`
  describes a solution that has since moved. It should be marked superseded or reconciled.
- **Correctness defects worth fixing regardless of the redesign**: F2 (unstyled local preview),
  F8 (unlabelled search input), F9 (contrast), F7 (orphaned taxonomy index).
- **Deferred, still open by the project's own status list**: comments, theme customisation, real analytics.

## 5. What "finished" would mean

A defensible definition of done for this repository:

1. `dotnet test` green and a **golden-file HTML test** guarding one full rendered page (closes F5).
2. One documented command chain that produces a **styled, previewable** `dist/` locally (closes F2).
3. `StaticBlaze-V2-Plan.md` reconciled with the code, or explicitly marked historical (closes F1/F3/F4).
4. Every generated page reachable from navigation (closes F7).
5. Zero WCAG AA contrast failures across both themes, and the search input labelled (closes F8/F9).
6. A decision recorded for each of: comments, theme customisation, analytics.

Items 4, 5 and the analytics decision are addressed by this engagement; see
`docs/03-next-step-ideas.md` and `docs/06-analytics-feasibility.md`.
