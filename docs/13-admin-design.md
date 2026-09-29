# Admin design system

The admin is a workspace, not the published site: it is optimised for long editing sessions.
This document is the reference for its theme layer, its editor, its layout rules and how to
verify a change. The visual half is `docs/prototypes/admin-style-harness.html` — the same
components, both themes, measurable.

## 1. Themes

**Light is the default. Dark stays available.** Both are defined once, in
`styles/_admin-tokens.css`, and consumed by every admin page. Switching happens at runtime on
`<html data-theme="…">`; nothing re-renders and the editor does not re-initialise.

| Piece | Where | What it does |
|---|---|---|
| Token layer | `styles/_admin-tokens.css` | Defines every colour, elevation and control size for both themes; also aliases the site's older token names (`--ground`, `--ink`, `--edge`, …) onto the admin ones, and maps the Tailwind `--color-*` keys. |
| Stylesheet | `styles/admin.css` | Imports the shared tokens (fonts, type scale, motion) then the admin layer; defines the shell, components, editor overrides and the preview typography. |
| Controller | `src/StaticBlaze.Admin/wwwroot/js/adminTheme.js` | `get()` / `set(theme)` / `toggle()`; writes `sb-theme` to `localStorage` and dispatches `sb:theme`. |
| Pre-paint | `wwwroot/index.html` | A one-line inline script reads `sb-theme` and sets `data-theme` before the first paint, which is what makes the choice survive a reload with no flash. |
| Switch | `Layout/MainLayout.razor` | A two-state segmented control in the header, always visible (also before sign-in), with `aria-pressed` state and a visible focus ring. |

The preference is a plain `localStorage` record under the key **`sb-theme`** with the value
`light` or `dark`. It survives reloads and the lock/unlock (sign-in) cycle because the vault
never touches `localStorage` beyond its own ciphertext key.

### Why this layer had to exist

The admin used to import the published site's token set directly. That set is dark-only by
design, **and** it never defined the utility names the admin markup actually asks for. So
Tailwind generated no rules for `bg-bg`, `text-fg`, `text-muted`, `border-line`, `text-gold` or
`text-pomegranate`; the shell fell back to inherited colours, and `data-theme` — which the old
`index.html` already set — had nothing behind it. The layer above fixes both problems at once.

### Token reference

Measured with the harness (WCAG 2.1 contrast, foreground composited over its effective
background). "AA" = ≥ 4.5:1 for body text, "≥3" = the threshold for large text and UI graphics.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#f6f7f9` | `#0b0d16` | app ground |
| `--surface` | `#ffffff` | `#12151f` | cards, fields, editor frame |
| `--surface-2` | `#eef0f4` | `#191d2a` | toolbar, insets, code blocks |
| `--fg` | `#15171c` | `#e9ecf3` | body ink |
| `--muted` | `#495063` | `#a8afc2` | secondary text |
| `--faint` | `#6b7284` | `#8b93a8` | placeholders, disabled affordances |
| `--line` / `--line-soft` | `#d3d7de` / `#e6e9ee` | 14% / 8% ink | hairlines, dividers |
| `--accent` | `#0c6e72` | `#6fd3d4` | active nav, links, primary button |
| `--gold` | `#8a5300` | `#f2b544` | indices, draft badge |
| `--pomegranate` | `#b3261e` | `#ff7d70` | errors |
| `--ok` | `#146c43` | `#5fd08a` | success |
| `--focus` | `#0c6e72` | `#6fd3d4` | 3px focus ring |

Control sizes live in the same file: `--spacing-ctl` (44px controls), `--spacing-ctl-sm` (32px
inline controls), `--spacing-gutter` (`clamp(1rem, 2.2vw, 2.5rem)`), and two reading measures —
`--spacing-read` (76ch, rendered prose) and a 140ch cap for the markdown source pane.

## 2. The editor

The editor is **Toast UI Editor, vendored** in `src/StaticBlaze.Admin/wwwroot/vendor/toastui/`
(editor 3.2.2, code-syntax-highlight plugin 3.0.0, both MIT). See that folder's README for
provenance and the update procedure.

Three findings drove this:

1. **The CDN has no dark theme.** `toastui-editor-dark.min.css` returns 404 at every path
   (`latest`, `3.2.2`, `v3.2.2`). The app passed `theme: 'dark'`, which silently did nothing —
   so a dark shell rendered the light editor, and its `#222` text landed on our `#06070d`
   ground: **1.26:1**, effectively invisible. That is the bug this redesign exists to fix.
2. **The CDN could drift.** The app loaded `/latest/`, so the editor could change under the
   app without a commit, and it could not work offline.
3. **The npm tarballs are not browser builds.** The editor's `dist` is an unminified UMD; the
   plugin's `-all.js` is CommonJS-only and throws `ReferenceError: module is not defined` in a
   browser. The vendored files are the CDN's browser builds, pinned by their banners.

The editor is now always initialised with `theme: 'light'` and **every** colour is overridden
from the admin tokens in `styles/admin.css` §5, so both app themes are correct and switching
themes needs no re-init. Also worth knowing: markdown mode is **ProseMirror**, not CodeMirror
(the source pane is `.toastui-editor-md-container .ProseMirror`), and the mode tabs live in
`.toastui-editor-md-tab-container` — both differ from what the class names suggest.

## 3. Layout rules

- **The shell is fluid.** `.admin-main` has no max-width; gutters come from
  `--spacing-gutter`. A page that needs a measure applies it to its own content, never to the
  shell.
- **The editor owns the width.** `PostEdit` uses `.editor-layout`: a working column
  (`minmax(0,1fr)`) plus a 22rem side panel that collapses under it below 1100px. Title spans
  the column; metadata and the parity preview live in the side panel so they never push the
  writing surface down.
- **Two measures, deliberately.** Source text is bounded at 140ch (only bites on ultrawide),
  rendered prose at 76ch. The editor frame always spans the workspace.
- **Controls:** 44px tall, `--r-2` radius, one focus treatment (`3px solid var(--focus)`,
  2px offset) everywhere.
- **State is never colour-only:** badges carry text, errors carry `role="alert"`, and the
  theme switch carries `aria-pressed`.

### Before → after, measured

| | Before | After |
|---|---|---|
| Editor source text (dark) | **1.26:1** — `#222` on `#06070d` | **15.4:1** |
| Editor toolbar (dark) | **1.12:1** | **14.2:1** |
| Rendered content (dark) | 1.26:1 | 15.4:1 |
| Body text (light / dark) | n/a (no light theme) | 16.7:1 / 16.4:1 |
| Dead utilities (`bg-bg`, `text-muted`, …) | generated nothing | generated from tokens |
| Shell width at 2560px | **1024px** (pinned) | **2560px** |
| Editor frame at 2560px | ~612px pane in a 1024 column | **2136px**, source capped at 1107px |
| Horizontal overflow at 200% zoom | — | none (measured at 640px) |

## 4. Verifying a change

```powershell
# rebuild the stylesheet
node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify

# publish and run the app-level checks (theme persistence, keyboard, widths, screenshots)
dotnet publish src/StaticBlaze.Admin -c Release -o <out>
node verify-admin-app.mjs <out>/wwwroot <shots-dir>       # scratch harness script

# component-level measurement, both themes, with the editor mounted
node measure-admin2.mjs <harness-dir> <shots-dir> after
```

Open `docs/prototypes/admin-style-harness.html` in a browser for a visual pass: it renders the
shell, the editor, and every component against the real built stylesheet. The first
`<link>`/script tag in it points at a local copy, the second at the repo path, so it works both
straight from the repository and from a copied folder.

### QA checklist

- [ ] Contrast: body ≥ 4.5:1, controls/headings ≥ 3:1, in **both** themes (measure, don't eyeball).
- [ ] Theme switch: applies instantly, persists across a reload, and is restored in a new session.
- [ ] Focus: tab through the header, the theme switch and a form — every stop shows the 3px ring.
- [ ] Widths: 1280 / 1440 / 1920 / 2560 / tablet 768 / 200% zoom — no horizontal overflow.
- [ ] Editor: source pane and rendered preview both readable; toolbar icons visible on dark.
- [ ] Empty and error states: `notice`, `notice-err`, `empty`, `badge-err` all legible.
- [ ] Reduced motion: transitions collapse (`prefers-reduced-motion`).

## 5. Known gaps, stated plainly

- **The authenticated pages were verified through the harness, not by signing in.** The admin
  needs the owner's PAT to leave the unlock screen, which is out of bounds for an automated
  pass. The unlock page is verified live in the browser; Dashboard/Posts/Media/Settings/editor
  are verified as components against the real stylesheet and the real editor build. A
  one-time manual pass with a PAT is the honest remainder — the checklist above is that pass.
- **Write-read round trip (create → save → publish)** requires the same PAT, so it was not
  exercised here. Nothing in this change touches `PostService`, `GitHubApiClient` or the media
  pipeline.
- **The plugin is 3.0.0**, older than the npm-latest 3.1.0, because the CDN never published
  3.1.0. The app has always been running 3.0.0, so this is not a downgrade.
