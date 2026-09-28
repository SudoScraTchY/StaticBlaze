# AI Agent UI Redesign — context helper

**What this document is.** A per-page inventory of the features an agent has to work with
when redesigning StaticBlaze's UI. It exists to give an agent *ground truth about what is
there*, so it does not hallucinate elements or invent capabilities.

**What this document is not.** It does **not** tell the agent how to design anything. It
contains no palette opinions, no layout prescriptions, no "should" statements about look and
feel. The design direction is supplied by the user, in the placeholder at the end.

## Shared infrastructure (every page)

- Single shell: `src/StaticBlaze.Site/Components/SitePage.razor` renders the whole document.
- Persistent fixed cockpit header: brand mark, wordmark, primary nav (home / index / tags /
  archive / about / contact), search trigger, and a "mobile" nav variant.
- A command-palette search (`site.js`) over a lazily fetched `search-index.json`, opened by
  clicking the search trigger or pressing `/`; arrow-key selection, `/`-focused input.
- A 3D background (`scene.js`) behind everything: a force-relaxed knowledge graph of the
  published posts. States surfaced as `data-scene` on `<html>`.
- GSAP + ScrollTrigger motion (`motion.js`): hero entrance, scroll reveals, a pinned tag
  field, a scroll-linked reading rail, counters, weight bars, pointer magnetism/tilt.
- Page transition (`motion.js` §4): the "focus pull" — article blurs/shrinks/fades out with
  an accent progress sweep, next page resolves in. Reduced-motion collapses it.
- Skip link, RSS/Atom feeds, sitemap, robots, JSON-LD, OpenGraph, canonical — all present.
- Dark-only theme; single accent token; no theme toggle.

## Page inventory

### Home `/`
- Hero: kicker, multi-line headline (each line animated individually), standfirst.
- The archive graph is the backdrop.
- Featured-post block (up to 4 featured posts).
- A pinned, horizontally scrolling tag field linking to tag pages.
- Post grid (paginated) with `PostCard` components: number, category, title, description,
  tags, read time, author.
- Pagination controls.

### Post index `/posts/`
- Filterable index: a search input and tag/category chips that filter the post list
  client-side with a live "N of M shown" count and an empty state.
- Same `PostCard` grid.

### Post detail `/posts/<slug>/`
- Article header: category eyebrow, title, description, author byline, date, read time.
- Optional cover image.
- **Related-posts graph**: SVG, central node = this post, ring of posts linked inside the
  article body; clicking a node navigates. Static `<ul>` fallback for no-JS; empty-state note
  when the post links to nothing.
- Reading rail (progress indicator) + `data-article` root.
- "In this file" section (heading index, word count).
- Author card (avatar, bio, social links).
- Tags as chips.
- "Adjacent" related-posts grid (same-tag/category recommendations).
- Comments section (giscus, rendered only when configured in `content/site.json`).

### Tags `/tags/` and term pages `/tags/<slug>/`
- Index of every tag with post counts.
- Term pages: a list/grid of the posts carrying that tag.

### Categories `/categories/` and `/categories/<slug>/`
- Same shape as tags, over categories.

### Archive `/archive/`
- A dated listing of all posts (timeline grouping).

### Author `/authors/<handle>` and `/about`
- Author profile: avatar, name, bio, website/social, their posts.

### Contact `/contact/`
- A form (name, email, body) with client-side validation, a send state machine
  (`idle → invalid/ready → sending → stored/failed`), and an honest failure message. The
  transport endpoint is read at submit time from `data-endpoint`.

### 404 `/not-found`
- Styled error page with recovery links and search.

## Components an agent can compose

- `SitePage` (shell), `PostCard`, `Pagination`, `PostPage`, `LandingPage`,
  `PostsIndexPage`, `TermPage`, `TermsIndexPage`, `ArchivePage`, `AuthorPage`,
  `ContactPage`, `NotFoundPage`, plus the shared UI chips (`ProvenanceChip`, `StateBlock` in
  the admin/feature set).
- All in `src/StaticBlaze.Site/Components/`.

## What an agent may NOT do

- Change the content pipeline, generator, or framework (out of scope for a UI redesign).
- Hard-code colours in JS — tokens only, via `styles/_tokens.css`.
- Add scroll listeners (ScrollTrigger only).
- Break the `data-scene`, reduced-motion, or no-JS fallback contracts.
- Prescribe the design direction itself.

---

## DESIGN DIRECTION — USER INPUT (fill this in)

<!--
The design direction goes here. Describe what the site should feel like, what to change,
what to keep, and any references (sites, screenshots, style names). The agent is not allowed
to invent this. Example shape (replace with your own words):

  - Feeling: ...
  - Keep: ...
  - Change: ...
  - References: ...
-->

_PLACEHOLDER — the user has not provided a design direction yet._
