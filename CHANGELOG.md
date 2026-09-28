# Changelog

Notable changes to StaticBlaze, newest first. Dates are the merge date on `main`.

## 2026-09-28 — Interaction and content pass

**Home**
- Hero no longer reserves 78 vh of empty space: `min-height` is clamped to `22rem–34rem` and the
  hero starts ~56 px below the header at 360 px, ~112 px at 1440 px (was several hundred).
- Section rhythm tightened: `.sec` padding went from `clamp(3.5rem, 8vw, 7rem)` to
  `clamp(2.25rem, 4.5vw, 4rem)`; measured inter-section gaps are now 0–128 px.
- Headline overlap fixed: `line-height` 0.96 → 1.06 with padding on each clipped line, so the
  44–96 px display type no longer collides or clips at any of 360 / 768 / 1440 px.
- New hero meta rail (desktop only): “since”, “last post”, “base”, “engine” — all computed from
  the manifest, giving the hero something to say beyond the headline.

**Related-posts graph** (`styles/static/graph.js`, rewritten)
- Zoom in/out buttons (`+` / `−`): transform-based, clamped to 0.7–1.8, buttons disable at the
  limits, keyboard operable, and click-safe while dragging or hovering.
- Nodes are draggable (pointer capture); dragging does not navigate, clicking still does.
- Hover fixed: per-anchor `pointerenter`/`pointerleave` replaced the bubbling `mouseover` handler
  that re-fired across child elements — this was the flicker near node edges.
- Root cause of the “buggy around the edges” report: the transparent hit disc was created but
  never positioned (left at the SVG origin), so hit-testing fell through to the background. The
  hit disc now follows the node in `paint()` and matches the visible radius.

**Archive**
- Grouped into named years and months with counts: e.g. `2026 — 5 posts`, `September` → `2`,
  `August` → `3`, plus total read-hours per year. The density field keeps its per-year count.

**About**
- Redesigned and the post list removed. Structure: identity header, at-a-glance stats, “who i am”
  with `how i work` / `what i build` / `outside the editor` sections, and a “reach me” panel
  (contact form, website, GitHub, RSS/Atom).
- The personal prose is a clearly marked placeholder (`data-placeholder="personality-rundown"`)
  until the author supplies the copy; nothing invents facts in the meantime.

**Contact**
- Now configurable end to end: `content/site.json` → `contact.endpoint` feeds
  `data-endpoint` on the form via the generator. Blank means the form validates and says plainly
  that nothing was stored.
- Receiver hardened: per-client rate limit (5 per 10 minutes, tracked against a per-process salted
  hash — the address is never stored or logged), optional webhook notification via
  `SB_WEBHOOK_URL`, existing honeypot/validation/export unchanged.
- Verified end to end against the real receiver: invalid input blocked client-side, honeypot
  rejected with 400, valid submission stored (201 + id), fields cleared, 429 rate limit engages.
- Deployment guide: `docs/12-contact-endpoint.md`.

## 2026-09-28 — StaticBlaze dashboard and Pages hardening
- GitHub Pages source moved to “GitHub Actions”; the legacy Jekyll build no longer publishes.
- Mermaid rendering wired client-side; `deployed-from-a-workflow` live pipeline test post.
- Docs cleanup with a ledger; design-change and agent-context guides added.

## Earlier
See `docs/09-deep-field-handoff.md` for the redesign delivery (Deep Field) and
`docs/07-verification-and-handoff.md` for the verification record.
