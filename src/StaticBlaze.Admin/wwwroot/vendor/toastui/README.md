# Vendored: Toast UI Editor

Self-hosted so the admin works offline, loads instantly, and its styling cannot drift under us.

| Package | Version | File | License |
|---|---|---|---|
| `@toast-ui/editor` | 3.2.2 (2023-02-17) | `toastui-editor-all.min.js`, `toastui-editor.min.css` | MIT (NHN Cloud FE Development Lab) |
| `@toast-ui/editor-plugin-code-syntax-highlight` | 3.0.0 (2021-06-17) | `toastui-editor-plugin-code-syntax-highlight-all.min.js`, `toastui-editor-plugin-code-syntax-highlight.min.css` | MIT (NHN FE Development Lab) |

Both packages are MIT licensed. Copyright (c) NHN Cloud FE Development Lab / NHN FE Development Lab.

## Why vendored instead of the CDN

The admin previously loaded these from `uicdn.toast.com/editor/latest/`, which meant `latest`
could change the editor under the app and the editor could not load offline. It also caused the
bug that prompted this folder: **the CDN has no dark theme stylesheet** for the editor
(`toastui-editor-dark.min.css` returns 404 at `latest`, `3.2.2` and `v3.2.2`), so the app's
`theme: 'dark'` option silently did nothing and a dark shell rendered a light editor.

The editor is now always initialised with Toast UI's light baseline and its colours are
overridden by `styles/admin.css` for both themes, from the same tokens as the rest of the admin.
See `docs/13-admin-design.md`.

## Which build, and why not the npm tarball

These are the CDN's browser builds. The npm `dist` files are **not** usable as classic
`<script>` tags: `@toast-ui/editor` ships an unminified UMD bundle, and the plugin's
`-all.js` is a CommonJS-only bundle that ends in `module.exports = ...` and throws
`ReferenceError: module is not defined` in a browser.

Note the CDN's `latest` for the plugin is **3.0.0**; upstream npm has 3.1.0 that the CDN never
published. That means the app has always been running plugin 3.0.0, so this is not a downgrade.

## Updating

```powershell
# pin a new editor release
curl.exe -sL -o toastui-editor-all.min.js "https://uicdn.toast.com/editor/<version>/toastui-editor-all.min.js"
curl.exe -sL -o toastui-editor.min.css    "https://uicdn.toast.com/editor/<version>/toastui-editor.min.css"
# the plugin only exists at /latest on the CDN
curl.exe -sL -o toastui-editor-plugin-code-syntax-highlight-all.min.js "https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight-all.min.js"
curl.exe -sL -o toastui-editor-plugin-code-syntax-highlight.min.css   "https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight.min.css"
# then confirm the version banners, rebuild, and re-run the harness measurements
```

The version strings in this table are copied from the banner each file carries.