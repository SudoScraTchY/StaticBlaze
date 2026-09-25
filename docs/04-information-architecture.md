# 04 — Information Architecture (redesigned)

The redesign is a presentation and structure change. **No public URL changes and no content
changes.** Every route the current build emits still exists, still has the same path, and still
resolves after the redesign.

## 1. Route inventory — before and after

Machine and asset routes are omitted from the "after" column because they are unchanged byte-for-byte
in behaviour.

| Route | Emitted today | After redesign | Guarantee |
|---|---|---|---|
| `/` | yes | yes — landing, page 1 | unchanged path; restructured body |
| `/page/{n}/` | route exists, never exercised (3 posts, page size 10) | unchanged; **now exercised** in verification by rendering with a smaller page size | unchanged |
| `/posts/{slug}/` | yes ×3 | yes ×3 | unchanged |
| `/tags/` | yes — **orphaned** | yes — **linked from primary nav** | unchanged path, now reachable |
| `/tags/{slug}/` | yes ×5 | yes ×5 | unchanged |
| `/tags/{slug}/page/{n}/` | route exists, never exercised | unchanged | unchanged |
| `/categories/` | yes — **orphaned** | yes — **linked from primary nav** | unchanged path, now reachable |
| `/categories/{slug}/` | yes ×2 | yes ×2 | unchanged |
| `/categories/{slug}/page/{n}/` | route exists, never exercised | unchanged | unchanged |
| `/authors/{handle}/` | yes ×1 | yes ×1 | unchanged |
| `/about/` | yes | yes — richer, same route | unchanged |
| `/archive/` | yes — flat hairline year list | yes — **year × month density chart + list** | unchanged |
| `/404.html` | yes | yes | unchanged |
| `/admin/` | yes | yes (parity re-skin only) | unchanged |
| `/manifest.json` | yes | yes — extended additively with a `stats` block | **additive only**; existing keys untouched |
| `/search-index.json` | yes | yes | unchanged shape |
| `/rss.xml`, `/atom.xml`, `/sitemap.xml`, `/robots.txt` | yes | yes | unchanged |
| `/assets/site.css`, `/assets/site.js`, `/assets/fonts/*` | yes | yes — same paths, new content | unchanged paths |

Nothing is removed. Nothing is renamed. Two previously orphaned branches (`/tags/`,
`/categories/`) gain inbound links.

## 2. Page inventory (redesigned)

| Page | Primary job | Redesigned surface |
|---|---|---|
| **Landing** `/` | answer "what is this and what should I read" in one screen | Hero becomes a **measured masthead**: title, one-line description, then a three-number readout (posts · tags · years-writing) rendered from `manifest.stats`, each counting up once on first paint. Below it: *featured* as one wide editorial lead card + a supporting pair, then *latest* as an asymmetric two-column list where the newest post spans both columns. |
| **Post** `/posts/{slug}/` | read comfortably | Reading column capped at 65ch; sticky 2px progress rail at the top of the viewport; title-block metadata row kept (category · date · read time · updated) because it is the site's identity; author card and *related* move into a compact bar; tag pills unchanged in meaning. |
| **Archive** `/archive/` | see the shape of the archive | **New primary surface**: a year-by-month density chart (12 columns × N years) built from `published` dates already in the manifest, then the existing chronological list with counts. This is the "index surface as a live data surface" idea applied to the page that most needed it. |
| **Tag index** `/tags/`, `/categories/` | browse by subject | Term rows gain an inline proportional bar so term weight is visible at a glance; still a list, no longer a bare one. Counts keep their mono treatment. |
| **Term page** `/tags/{slug}/`, `/categories/{slug}/` | read one subject | Header keeps term title + description + count; grid uses the redesigned card; pagination unchanged. |
| **Author / About** `/authors/{handle}/`, `/about/` | who writes this | Avatar, handle, bio, links; post grid reused. About is the same component fed by `site.json.defaultAuthor`, exactly as today. |
| **404** `/404.html` | recover | Same route; adds a search affordance and a link to the archive in addition to "back to posts". |

## 3. Navigation model

```
┌─ Header (sticky, 1px hairline, blurred surface) ────────────────────────────┐
│  ◆ wordmark        posts · tags · categories · archive · about   [/] search  ☾ │
│  ───── lajvard → firouzeh 2px rule ────────────────────────────────────────  │
└────────────────────────────────────────────────────────────────────────────┘
   mobile (<640px):  wordmark · search icon · theme toggle
                     second row: horizontal scroll of the same nav items
```

Changes from today:

1. **`tags` and `categories` join the primary nav** (`content/site.json` `nav[]`), closing finding F7.
2. **Search gains a keyboard affordance**: `/` focuses search from anywhere; the panel is
   `role="listbox"` with arrow-key selection, `Escape` to close, and the input gets a real label.
3. **Footer** keeps `rss` / `sitemap` / `admin`, adds `atom` and the tag index.
4. **No new navigation layer is introduced.** Depth stays exactly: `landing → list → detail`, three
   levels, no breadcrumbs needed beyond the existing `section / parent` mono line.

## 4. Content hierarchy

```
Landing  (h1 = site title)
 ├─ featured        (h2)  ── lead card (h3 = post title)
 ├─ latest          (h2)  ── post cards (h3)
 └─ pagination      (nav)
Post     (h1 = post title)
 ├─ metadata row          (p.title-block)
 ├─ body                  (h2 / h3 from Markdown)
 ├─ tag pills
 └─ related        (h2)  ── cards (h3)
Archive  (h1 = "archive")
 └─ year groups    (h2)  ── rows (no heading; <a> inside <li>)
Tag index (h1 = "tags")
Term page (h1 = term title)
     └─ post cards (h3)
```

One `<h1>` per page, no skipped levels — this is already true of the current build and is
preserved. Visual size and heading level stay decoupled; the archive's year labels are `<h2>` at a
modest size, not `<div>`s.

## 5. Key user flows

**Arrive.** A reader lands on `/posts/{slug}/` from search or a feed before ever seeing the
landing page. The redesign therefore makes the *post header* self-sufficient: category link, date,
read time, author, and a wordmark link home — all above the fold, all with the same weight as the
landing page's masthead. A reader who only ever sees one page still learns what the site is.

**Browse.** From the landing page: `featured` → `latest` → `pagination`, or jump straight to a
subject via `tags` / `categories` in the nav. From the archive: pick a year, see its density, open
a row. Every browse path ends at a post. Two clicks maximum from `/` to any post.

**Read.** Post body max 65ch, `1.6`–`1.7` leading, progress rail pinned at the top, code blocks
with a copy affordance that confirms in place, working table and footnote styles inherited from the
existing `post-body` component.

**Return.** The three mechanisms, in order of frequency: RSS/Atom (subscribe link in the footer and
in `<head>`), the *related* bar at the end of a post (already computed at build time by
`ManifestBuilder`'s scoring), and the archive for someone who wants to read backwards. Session
continuity: theme choice and the fact that the reader has visited before are both persisted in
`localStorage` under the existing `sb-theme` key — no new keys are introduced that would surprise a
returning visitor.

## 6. What this IA deliberately does not do

- It does not add a new route, a new section, or a new content type.
- It does not introduce breadcrumbs, a sidebar, or a mega-menu — a three-level archive blog does
  not need them and they would add navigation chrome to every page.
- It does not move content between pages.
- It does not require any change to `content/**`; the only config change is adding two entries to
  `site.json`'s `nav[]`.
