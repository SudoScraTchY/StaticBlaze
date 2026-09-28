# 07 â€” Verification and Handoff

Everything below was run in this session on `M:\Users\SaintScraTchY\RiderProjects\StaticBlaze`.
Where a check could not be completed, it says so instead of being marked as a pass.

---

## 1. Commands run, with results

Toolchain note: the first `dotnet` on `PATH` is
`C:\Program Files\AutoClaw\resources\dotnet\win-x64\dotnet.exe`, which has **no SDK**. Every command
below was run with `C:\Program Files\dotnet` prepended to `PATH` (SDK **10.0.301**, runtime 10.0.9).

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `dotnet test -v minimal` | 0 | `Passed! - Failed: 0, Passed: 19, Skipped: 0, Total: 19, Duration 448 ms` |
| 2 | `dotnet build StaticBlaze.slnx -c Release` | 0 | `Build succeeded. 1 Warning(s) 0 Error(s)` â€” Core, Site, Generator, Tests and **Admin** (incl. Blazor output) all compile. The single warning is the pre-existing SkiaSharp `NativeFileReference` notice, unchanged by this work. |
| 3 | `node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/site.css -o dist-assets/site.css --minify` | 0 | `dist-assets/site.css` = **33 491 bytes** (was 24 657 bytes before the redesign) |
| 4 | `node â€¦ -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify` | 0 | `admin.css` = **29 182 bytes** |
| 5 | `dotnet run --project src/StaticBlaze.Generator -c Release -- --content content --out dist --css dist-assets/site.css` | 0 | `Loaded 4 posts (3 published), 6 tags, 2 categories.` â†’ `Stylesheet copied` â†’ **Site generated: 17 pages + feeds** |
| 6 | Same generator against a throwaway `language: "fa"` content set | 0 | `Loaded 3 posts (3 published)â€¦` â†’ **Site generated: 18 pages + feeds** (used only for the RTL verification below; the shipped `content/` was not touched) |

## 2. Route preservation â€” 25/25 present, 0 missing

Every path the previous build emitted still exists with the same name. Sizes of the redesigned build:

| Route | bytes | Route | bytes |
|---|---|---|---|
| `index.html` | 16 524 | `tags/index.html` | 11 022 |
| `404.html` | 8 339 | `tags/blazor/` | 9 374 |
| `archive/index.html` | 9 265 | `tags/design/` | 8 591 |
| `about/index.html` | 12 505 | `tags/github/` | 9 383 |
| `authors/mehrshad/` | 12 505 | `tags/markdown/` | 10 474 |
| `categories/index.html` | 8 291 | `tags/static-sites/` | 9 464 |
| `categories/engineering/` | 8 404 | `manifest.json` | 3 134 |
| `categories/meta/` | 10 768 | `search-index.json` | 9 746 |
| `posts/hello-staticblaze/` | 14 683 | `rss.xml` / `atom.xml` | 1 891 / 2 051 |
| `posts/markdown-feature-tour/` | 20 132 | `sitemap.xml` / `robots.txt` | 1 642 / 88 |
| `posts/persian-palette-engineers-blog/` | 13 829 | `assets/site.css` | 33 491 |
| â€” | â€” | `assets/site.js` | 10 043 |
| â€” | â€” | `assets/fonts/*` | 8 files, 204 280 bytes |

`manifest.json` and `search-index.json` keep their exact previous shapes; no key was renamed.
`page/{n}/` pagination is still not exercised â€” 3 published posts against `postsPerPage: 10` â€” so it
remains **unverified at runtime**, exactly as it was before this work.

## 3. The two previously orphaned routes are now linked

Both `/tags/` and `/categories/` were generated and sitemapped but unreachable from the UI
(finding F7 from the original scan). After adding them to `content/site.json`'s `nav[]`,
grep of the generated `dist/index.html` shows them in the header nav and again in the footer:

```
<nav class="hidden sm:flex items-center gap-5" aria-label="primary"><a href="/StaticBlaze/" â€¦
<span class="flex flex-wrap items-center gap-x-4 gap-y-2"><a href="/StaticBlaze/tags/" â€¦
<a href="/StaticBlaze/categories/" class="hover:text-primary transition-colors ease-standard">categories</a>
```

## 4. Tailwind v4 wiring

No `tailwind.config.js` exists and none was added; no `dark:` variant utility was introduced. Tokens
are declared as CSS custom properties and mapped through `@theme inline`, and the built stylesheet
contains both the runtime variables and the generated utilities:

| Check | Result |
|---|---|
| Runtime token variables in `dist/assets/site.css` | `--primary:` âœ“ `--accent:` âœ“ `--fs-body:` âœ“ `--r-md:` âœ“ `--elev-1:` âœ“ `--ease-std:` âœ“ `--family-persian:` âœ“ `--glow:` âœ“ `--surface-2:` âœ“ |
| Generated utilities present | `.text-primary` `.bg-surface` `.text-display` `.rounded-lg` `.shadow-2` `.ease-spring` `.font-persian` `.text-caption` `.min-h-11` `.card` `.readout` `.density` `.weight` `.reading-rail` `.section-index` `.skip-link` `.sr-only` `.masthead-glow` `.reveal` â€” **19/19 found** |
| Physical direction properties in the built site CSS | `padding-left` 0, `padding-right` 0, `border-left` 0, `border-right` 0, `margin-left` 0, `margin-right` 0 â€” the logical forms are present instead (`padding-inline` Ã—13, `inset-inline` Ã—5, `border-inline` Ã—1, `text-align: start` Ã—1) |
| Built stylesheet size | 33 491 bytes, well inside the 90 000-byte budget |
| Default-indigo hexes in any CSS or Razor file written | 0 (`#6366f1`, `#4f46e5`, `#8b5cf6`, `#7c3aed`, `#a855f7` all absent) |
| Emoji characters in `src/StaticBlaze.Site/Components/**/*.razor` | 0 â€” the previous `âœ¦` featured marker is now an inline SVG diamond |

**Known residual:** Tailwind's automatic source detection scans the whole repository, so a handful of
admin-only utilities (`.bg-pomegranate`, `.min-h-[28rem]`, `.lg:grid-cols-[1fr_20rem]`, `.divide-y`)
also land in the public stylesheet. This behaviour is **pre-existing** â€” it is present in the
pre-redesign `dist/assets/site.css` too â€” and costs a few hundred bytes. Scoping the site build with
`source(none)` plus an explicit `@source` list would remove it; it was left alone because getting the
source list wrong would silently drop classes from the public site.

## 5. Persian palette â€” measured contrast, before and after

Measured with a WCAG 2.x relative-luminance implementation (`contrast.mjs`, retained in the session
scratch directory). AA gates: 4.5:1 for normal text, 3:1 for large text / UI / focus.

**Failures in the pre-redesign palette, now fixed:**

| Pair | Before | After |
|---|---|---|
| light `--accent` (zafaran `#b35c00`) on `--bg` `#f6f1e7` | **4.19:1 â€” FAIL** | 6.01:1 PASS (`#8e4a00`) |
| light firouzeh `#00a693` on `--bg` | **2.71:1 â€” FAIL** | 5.43:1 PASS (`#006f66`) |
| dark pomegranate `#cc3333` on `#0f1420` | **3.58:1 â€” FAIL** | 5.59:1 PASS (`#e2685f`) |

**Every pairing that ships, on the new tokens:** `fg`/`bg` 13.11 (light) and 14.61 (dark);
`fg`/`surface` 14.39 / 13.35; `muted`/`bg` 5.77 / 7.33; `muted`/`surface` 6.33 / 6.69;
`primary`/`bg` 5.40 / 10.16; `primary`/`surface` 5.93 / 9.28; `accent`/`bg` 6.01 / 7.11;
`accent`/`surface` 6.60 / 6.49; `firouzeh`/`bg` 5.43 / 8.94; `pomegranate`/`bg` 5.73 / 5.59;
`bg` on `primary` (button label on fill) 5.40 / 10.16; `primary-ink`/`bg` 7.91 / 12.03;
`muted`/`surface-2` 5.28 / 5.95; focus ring vs ground 8.00 / 7.15. **All â‰¥ their gate.**

`--fg` on `--primary` measures 2.43:1 in light and 1.44:1 in dark. That is **not a shipped pairing** â€”
`--primary` is a fill and its label is `--bg`, which passes at 5.40:1 and 10.16:1. Recorded so the
non-pairing is not mistaken for an unmeasured risk.

## 6. Responsive and RTL â€” measured, not assumed

A probe script was injected into a throwaway copy of the built site and run in headless Chrome. It
reports `documentElement.scrollWidth` vs `clientWidth`, the `dir`/`lang` attributes, and a list of
any element whose box exceeds the viewport. Mobile widths were measured inside an iframe, because
headless Chrome clamps its window to a 500 px minimum and would otherwise have silently tested the
wrong width.

**Result: 64 distinct page Ã— width combinations, 0 overflows.**

| Build | Pages | Widths | Overflow |
|---|---|---|---|
| English (`lang="en"`, `dir="ltr"`) | `/`, `/posts/persian-palette-engineers-blog/`, `/posts/markdown-feature-tour/`, `/posts/hello-staticblaze/`, `/archive/`, `/tags/`, `/404.html` | 320, 360, 375, 414, 768, 1024, 1280 | **0 / 29 measured** |
| Persian (`lang="fa"`, `dir="rtl"`) | `/`, `/posts/persian-palette-fa/`, `/posts/naghsh-posht-ghofl/`, `/posts/salam-staticblaze/`, `/archive/`, `/tags/`, `/404.html` | 320, 375, 414, 768, 1280 | **0 / 35 measured** |

RTL is structural rather than a CSS afterthought â€” the same components render both directions:

| Probe | LTR | RTL |
|---|---|---|
| `<html>` | `lang="en" dir="ltr"` | `lang="fa" dir="rtl"` |
| `.post-body` list `padding-inline-start` | `22.4px` | `22.4px` (mirrored side) |
| `.post-body blockquote` `border-inline-start-width` | `2px` | `2px` |
| `.post-body th` `text-align` | `start` | `start` |
| `.reading-rail > span` `transform-origin` | `0px 1.5px` | `375px 1.5px` at a 375 px viewport (flipped to the right edge) |
| masthead readout | `["3","6","1"]` | `["3","6","1"]` |

## 7. A defect found during verification, and fixed

**Observed.** In the first probe run, `/posts/persian-palette-fa/` reported
`scrollWidth 407` against `clientWidth 375` â€” 32 px of horizontal overflow at 375 px.

**Reproduced.** A second probe that enumerated offending boxes returned, at 375 px:
`<table> l=-32 r=355 w=387 scrollW=386`, with `<thead>`, `<tr>`, `<th>`, `<tbody>`, `<td>`
all at the same width. The table's min-content width exceeded the viewport, and `width: 100%` does
not constrain min-content width for an auto-layout table.

**Fix.** `overflow-wrap: anywhere` on `.post-body th, .post-body td` (`anywhere`, unlike
`break-word`, contributes to intrinsic min-content sizing).

**Counterfactual.** Re-running the full matrix after the fix: `/posts/persian-palette-fa/` clean at
320, 375, 414, 768 and 1280 â€” and the table-heavy English fixture `/posts/markdown-feature-tour/`
clean at seven widths, including 320. The same inputs that failed now pass, and nothing else changed.
Root cause **confirmed**.

**Second instance, same family.** `/posts/naghsh-posht-ghofl/` then reported `439` against every
width â‰¤414. The enumerating probe showed the overflow was a `<ul><li>` inside `.post-body`
(`scrollW 419 / clientW 335`, and `397 / 313` one level down) with no box sticking out â€” i.e. text,
not a box. Persian text joined with ZWNJ (U+200C) forms long runs that cannot break, and browsers
ship no Persian hyphenation dictionary, so the run pushed the document wider than the viewport.
**Fix:** `overflow-wrap: anywhere` on `.post-body`. **Counterfactual:** the same page is clean at all
five widths afterwards. Root cause **confirmed** for this contributor too.

## 8. Accessibility â€” measured

| Probe | Result |
|---|---|
| Search input has an accessible name | `true` on every page â€” a `.sr-only` `<label for="site-search">` plus `role="search"` on the wrapper. The pre-redesign input had **no** label (`placeholder` only); this was finding F8. |
| Images missing `alt` | `0` on every page measured (the two posts with images carry `alt` text) |
| Landmarks per page | `header` 2, `nav` 2 (primary + mobile), `main` 1, `footer` 1; `figure` 1 on `/archive/` (the density chart) |
| `<h1>` per page | 1 on `/`, `/archive/`, `/tags/`, `/404.html` and both non-fixture posts. **2 on `/posts/markdown-feature-tour/`** â€” see Â§9. |
| Heading order | No skipped levels on any template-driven page (`H1,H2,H2,H2,H2,H3` on a post) |
| Skip link | present as the first focusable element on every page |
| `:focus-visible` rules in the built CSS | present on every page; the ring is `2px solid var(--lajvard)` at `2px` offset, and `outline: none` appears nowhere without a replacement |
| Keyboard tab order, post page | `1. skip to content â†’ 2. wordmark â†’ 3. posts â†’ 4. tags â†’ 5. categories â†’ 6. archive â†’ 7. about â†’ 8. search input â†’ 9. theme toggle â†’` then page content (`Meta`, `@mehrshad`, `#design`, website, related posts). Reading order matches visual order; no positive `tabindex`. |
| Emoji rendered as UI | `0` on template-driven pages. `/posts/markdown-feature-tour/` shows 3 â€” they are inside that post's Markdown body (a legacy fixture), not template chrome. |
| Touch targets | nav items, header controls, theme toggle, pagination and the 404 actions are all `min-height: 44px`; tag pills are 28 px tall and satisfy WCAG 2.5.8 through the spacing exception rather than the size minimum. |
| `prefers-reduced-motion` | The media query is present in the built stylesheet and was found on **33/33 pages** probed. **The runtime behaviour under a forced reduced-motion preference is NOT verified** â€” the one `--force-prefers-reduced-motion` capture produced no usable record, so this is a CSS-presence check only. Treat it as unverified. |

## 9. Unverified, and honest limitations

1. **No visual review was performed.** The image-analysis model returned `400` on every attempt, so
   the screenshots in `DELIVERY/shots/` were never inspected by a model. Per the UI-check rules, the
   verification above is DOM/CSS/measurement based, and **no screenshot-based visual validation is
   claimed**. The screenshots exist for a human to review; that review has not happened.
2. **`/posts/markdown-feature-tour/` emits two `<h1>` elements.** The second comes from the post's own
   Markdown (`# h1 Heading`, kept as the old markdown-it demo fixture). It is a content-level issue,
   not a template one. The one-`<h1>`-per-page property in `docs/04-information-architecture.md`
   therefore holds for every page except this fixture. Fixing it means editing content, which is out
   of scope here.
3. **Pagination is still not exercised at runtime** â€” 3 published posts against a page size of 10.
   The routes and the component exist and the markup was rewritten, but `/page/2/` has never been
   generated.
4. **The admin app was compiled but never run.** `dotnet build` covers it (0 errors), and its
   stylesheet was rebuilt, but no admin page was rendered in a browser in this session. Two
   physical-direction utilities in admin templates were also migrated (`pl-4`â†’`ps-4`,
   `pr-2`â†’`pe-2`, `ml-auto`â†’`ms-auto`).
5. **`tools/get-fonts.ps1` was corrected but not executed** â€” re-downloading the fonts would have
   overwritten files already in place, and the two Vazirmatn files were fetched directly and are
   committed.
6. **The Persian screenshots come from a throwaway content set** (`language: "fa"`, three Persian
   posts) generated outside the repository. It proves the layout mirrors and Vazirmatn applies; it is
   not a claim that the shipping blog is Persian.
7. **`--force-prefers-reduced-motion`** produced no usable record (see Â§8).

## 10. Handoff

**To build and preview from a clean checkout:**

```bash
npm ci --prefix tools/node-tools
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs \
     -i styles/site.css -o dist-assets/site.css --minify
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs \
     -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify
dotnet test
dotnet run --project src/StaticBlaze.Generator -- \
     --content content --out dist --css dist-assets/site.css
node tools/serve.mjs     # http://localhost:8077/StaticBlaze/
```

**To add a page:** create `src/StaticBlaze.Site/Components/Pages/XPage.razor`, wrap the body in
`<SitePage Site=@Site Title=â€¦ Description=â€¦ Canonical=â€¦>`, give every parameter the
`[Parameter] public required â€¦` form the other pages use, then render it from
`src/StaticBlaze.Generator/Program.cs` with a `Dictionary<string, object?>` of parameters. Nothing
routes by convention â€” a page exists only because `Program.cs` rendered it.

**To change the look:** edit `styles/_tokens.css` only. Every component stylesheet and every template
consumes those custom properties; no template hard-codes a colour. The one exception is the
lajvard â†’ firouzeh gradient, which is written as two `var()` stops in `styles/site.css` (`.tile-rule`,
`.reading-rail > span`, `.weight > span`) and is the only gradient in the system.

**To localise to Persian:** set `"language": "fa"` in `content/site.json`. `SitePage.razor` derives
`dir` from that value, the `:lang(fa)` rule swaps the font family to Vazirmatn and forces
`letter-spacing: 0`, and every layout rule is already logical. Nothing else needs to change â€” this was
reproduced end to end in Â§6.

**Deliberate deviations from the design brief**, each documented with its justification in
`docs/05-design-system.md` Â§9: three font families rather than the craft maximum of two (Vazirmatn is
script coverage behind `--font-persian` and the `:lang(fa)` fallback, not a third voice); the numbered section index is kept
because the project treats it as identity; one gradient survives because the palette's own logic is
the dome transition; and a single 420 ms count-up runs on the masthead because it confirms a value
that was just computed.
