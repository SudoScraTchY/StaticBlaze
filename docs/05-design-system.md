# 05 — Design System Specification

## 0. Which "Design Skill" this follows (and the assumption being made)

The brief says *"use Design Specific Skill.md"*. **No file with that name exists in the repository
or anywhere on this machine** (searched: repo tree, `M:\Users\SaintScraTchY\RiderProjects`, and the
AutoClaw skill tree). Stated assumption, and the substitutions actually used:

| Slot | File used |
|---|---|
| Project's own design contract | `README.md` § Design · `styles/_tokens.css` header comment · `StaticBlaze-V2-Plan.md` § Core decisions |
| Design-specific skill | AutoClaw `autoclaw-design-capability_noQA` → `DESIGN.md`, `REDESIGN.md`, `TASK_ROUTER.md`, `OUTPUT_RULES.md`, `UI-check.md` |
| Craft rules | `craft/typography.md`, `craft/color.md`, `craft/anti-ai-slop.md`, `craft/accessibility-baseline.md`, `craft/typography-hierarchy-editorial.md`, `craft/animation-discipline.md`, `craft/rtl-and-bidi.md` |
| Aesthetic anchor | `aesthetic-preset-library` → **preset 17 Takram** (soft digital precision) |

If a real `Design Specific Skill.md` exists outside this machine, the decisions below should be
re-checked against it; the traceability table in §9 makes that cheap.

## 1. Design thinking — the four questions (required before any code)

| | Answer |
|---|---|
| **Purpose** | A long-form, Markdown-first engineering blog. It exists so one author can publish and a stranger can read comfortably. The reader's job: find out whether this person is worth reading, then read. |
| **Tone** | *Soft digital precision* (preset 17 Takram). Not a Swiss drafting sheet, not a glossy SaaS template: a quiet instrument panel. Persian pigments at full saturation used as **signal**, not as background wash; softly glowing surfaces; charts and index rows treated as the artwork of the site. |
| **Constraints** | Static output (no server, no runtime data fetch for the page itself); Tailwind v4 CSS-first (`@theme`, no `tailwind.config.js`); Razor-at-build-time templates; must work with JavaScript absent; WCAG 2.2 AA across both themes; self-hosted fonts only; total CSS budget well under 100 KB; must not change a single public URL. |
| **Differentiation** | The *index surfaces are live instruments*. The archive draws the actual shape of the writing (a year × month density field derived from `published` dates), the masthead counts real totals, and term rows carry their own weight bar. Nothing on the page shows a number that was typed by hand. |

## 2. The single biggest source of mediocrity in the before state

The site borrows a **print** metaphor — a drafting sheet with hairline rules, monospaced title
blocks and numbered sheet sections — and applies it uniformly to an interactive medium. Every
surface is a flat 1 px rectangle; the only hover state is a border-colour swap; there is no
elevation model, no motion vocabulary, and no data surface anywhere. This is what makes it read as
*restrained but inert*.

**Transformation mode: `Full Redesign`.** `Refinement` cannot fix a metaphor, and `Layout
Restructure` explicitly preserves the visual style. The essential identity preserved is: the Persian
pigment set and where each pigment comes from, dark-by-default, Markdown-first, the IBM Plex core,
and the lajvard → firouzeh dome transition as the one permitted gradient.

## 3. Design direction, in one sentence

> Design this as a long-form engineering blog for readers who arrive from search or a feed, using a
> **soft digital precision** visual language in Persian pigments, centered on **turning the index
> surfaces into live data surfaces** — the archive, the tag index and the masthead become measured,
> animated, instrument-like readouts instead of flat hairline lists.

## 4. Palette — "Naghsh" (نقش)

Named after the Persian practice of *naqsh*, the pattern itself. Every colour keeps its Persian name
and its source; only the values are re-derived so they meet WCAG AA where they are actually used.

### 4.1 Pigment provenance (unchanged from the project's own rationale)

| Name | Canonical value | Source / meaning |
|---|---|---|
| **Lajvard** (لاجورد) | `#1C39BB` | lapis lazuli — the deep dome blue |
| **Tile azure** | `#0067A5` | glazed tile field |
| **Firouzeh** (فیروزه) | `#00A693` / `#57C5C6` | turquoise of Nishapur |
| **Zafaran** (زعفران) | `#F38400` | saffron |
| **Pomegranate** (انار) | `#CC3333` | anār |
| **Surmaj night** (سرمه) | `#0F1420` | indigo dye on cloth — the dark ground |
| **Miniature paper** | `#F6F1E7` | ground of a Persian miniature — the light ground |

The redesign **keeps every name and every canonical value** as a reference pigment token, and
introduces *role* tokens derived from them. Hue is never renamed away; the role is added.

### 4.2 Light theme — "miniature paper"

| Token | Hex | OKLCH | Role | Usage rule |
|---|---|---|---|---|
| `--bg` | `#F7F2E8` | `oklch(96.2% 0.014 84.6)` | page ground | miniature paper, one step cleaner than before |
| `--surface` | `#FFFDF9` | `oklch(99.4% 0.006 84.6)` | raised card / panel | cards, search panel, code blocks |
| `--surface-2` | `#EFE8DA` | `oklch(93.3% 0.020 84.6)` | inset / sunken | chart troughs, code gutters, skeleton |
| `--fg` | `#23283A` | `oklch(28.0% 0.034 272.1)` | body text | never pure black |
| `--muted` | `#585E73` | `oklch(48.5% 0.035 272.6)` | secondary text, metadata | 5.77:1 on `--bg` |
| `--border` | `rgba(35,40,58,0.14)` | — | hairline | 1 px structure, never a shadow substitute |
| `--border-soft` | `rgba(35,40,58,0.08)` | — | softer divider | inside cards |
| `--primary` | `#0067A5` | `oklch(49.7% 0.126 245.5)` | **tile azure** — links, active nav, primary button fill | max 2 visible uses per screen |
| `--primary-ink` | `#004E7C` | `oklch(40.8% 0.101 244.0)` | pressed / darker azure | hover on primary button |
| `--accent` | `#8E4A00` | `oklch(48.3% 0.117 57.3)` | **zafaran, darkened for text** — numerals, section indices, featured marker | 6.01:1 on `--bg` (was 4.19:1) |
| `--firouzeh` | `#006F66` | `oklch(48.7% 0.086 185.1)` | turquoise, text-safe | data bars, chart stroke |
| `--pomegranate` | `#B02F2A` | `oklch(50.5% 0.167 27.2)` | error / destructive | 5.73:1 on `--bg` |
| `--focus` | `#1C39BB` | `oklch(42.3% 0.205 266.5)` | **lajvard** — focus ring | 8.00:1 on `--bg`, ≥3:1 required |
| `--lajvard` | `#1C39BB` | `oklch(42.3% 0.205 266.5)` | gradient start | the one permitted gradient only |

### 4.3 Dark theme — "surmaj night" (default)

| Token | Hex | OKLCH | Role | Usage rule |
|---|---|---|---|---|
| `--bg` | `#0F1420` | `oklch(19.2% 0.026 266.6)` | page ground | surmaj indigo, not black |
| `--surface` | `#161D2E` | `oklch(23.3% 0.035 266.6)` | raised card | +1 step of lightness, never a border alone |
| `--surface-2` | `#1E2739` | `oklch(27.3% 0.036 263.7)` | inset | chart troughs |
| `--fg` | `#E9E5D9` | `oklch(92.2% 0.017 91.6)` | body text | warm off-white, not `#fff` |
| `--muted` | `#9CA3BA` | `oklch(71.7% 0.034 272.1)` | secondary | 7.33:1 on `--bg` (was 5.94:1) |
| `--border` | `rgba(233,229,217,0.14)` | — | hairline | semi-transparent light, not solid dark |
| `--border-soft` | `rgba(233,229,217,0.08)` | — | softer divider | |
| `--primary` | `#6FD0CF` | `oklch(79.8% 0.092 194.6)` | **firouzeh** — links, active nav | 10.16:1 on `--bg` |
| `--primary-ink` | `#93DEDD` | `oklch(85.2% 0.074 194.8)` | hover/bright | |
| `--accent` | `#F38400` | `oklch(72.2% 0.173 57.7)` | **zafaran at full strength** — safe on night ground | 7.11:1 on `--bg` |
| `--firouzeh` | `#57C5C6` | `oklch(76.1% 0.100 196.1)` | turquoise | 8.94:1 |
| `--pomegranate` | `#E2685F` | `oklch(66.3% 0.154 26.3)` | error | 5.59:1 on `--bg` (was 3.58:1) |
| `--focus` | `#8E9CF0` | `oklch(71.6% 0.123 275.6)` | lajvard lifted for the night ground | 7.15:1 on `--bg` |
| `--lajvard` | `#1C39BB` | `oklch(42.3% 0.205 266.5)` | gradient start | unchanged in both themes — it is the dome |

### 4.4 Measured contrast — every pairing that ships

Measured with a WCAG 2.x relative-luminance implementation (script kept at
`.openclaw/tmp/contrast.mjs`; reproduce with `node .openclaw/tmp/contrast.mjs` from the AutoCoder
workspace). AA gates: 4.5:1 normal text, 3:1 large text / UI / focus.

| Pair | Light | Dark | Gate | Result |
|---|---|---|---|---|
| `--fg` on `--bg` | 13.11:1 | 14.61:1 | 4.5 | PASS |
| `--fg` on `--surface` | 14.39:1 | 13.35:1 | 4.5 | PASS |
| `--muted` on `--bg` | 5.77:1 | 7.33:1 | 4.5 | PASS |
| `--muted` on `--surface` | 6.33:1 | 6.69:1 | 4.5 | PASS |
| `--primary` on `--bg` | 5.40:1 | 10.16:1 | 4.5 | PASS |
| `--primary` on `--surface` | 5.93:1 | 9.28:1 | 4.5 | PASS |
| `--accent` on `--bg` | 6.01:1 | 7.11:1 | 4.5 | PASS |
| `--accent` on `--surface` | 6.60:1 | 6.49:1 | 4.5 | PASS |
| `--firouzeh` on `--bg` | 5.43:1 | 8.94:1 | 4.5 | PASS |
| `--pomegranate` on `--bg` | 5.73:1 | 5.59:1 | 4.5 | PASS |
| `--bg` on `--primary` (button label on fill) | 5.40:1 | 10.16:1 | 4.5 | PASS |
| `--primary-ink` on `--bg` | 7.91:1 | 12.03:1 | 4.5 | PASS |
| `--muted` on `--surface-2` | 5.28:1 | 5.95:1 | 4.5 | PASS |
| `--focus` on `--bg` (ring) | 8.00:1 | 7.15:1 | 3.0 | PASS |

**Fixed in this redesign** (all three were failing before):

| Pair | Before | After |
|---|---|---|
| light `--accent` (zafaran) on `--bg` | **4.19:1 FAIL** | 6.01:1 PASS |
| light firouzeh `#00A693` on `--bg` | **2.71:1 FAIL** | 5.43:1 PASS |
| dark pomegranate `#CC3333` on `--bg` | **3.58:1 FAIL** | 5.59:1 PASS |

Note on `--fg` on `--primary`: 2.43:1 (light) / 1.44:1 (dark). This is **not a shipped pairing** —
primary is a *fill* and its label is `--bg`, which passes at 5.40:1 / 10.16:1. Recorded here so the
non-pairing is not mistaken for an unmeasured risk.

### 4.5 Accent discipline

Per `craft/color.md`, at most **two visible uses of the primary colour per screen**. Applied as:

- Landing: header wordmark glyph + one primary CTA (RSS subscribe in the masthead). Everything else
  is `--fg` / `--muted` / `--border`.
- Post: category link + the scroll progress rail. Body links use `--primary` but are demoted to
  `--fg` with a `--border`-coloured underline where the rail is also visible.
- Index pages: active nav item only.
- `--accent` (zafaran) is restricted to **numerals and section indices** — the site's signature — and
  never used as a link colour, so it never competes with `--primary`.

## 5. Typography

### 5.1 Families

| Token | Stack | Script role |
|---|---|---|
| `--font-sans` | `"IBM Plex Sans", "Vazirmatn", ui-sans-serif, system-ui, sans-serif` | Latin body + display, Persian fallback |
| `--font-mono` | `"IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace` | metadata, numerals, code, section indices |
| `--font-persian` | `"Vazirmatn", "IBM Plex Sans", ui-sans-serif, sans-serif` | explicit opt-in for `lang="fa"` subtrees |

IBM Plex is retained: it is an engineering-documentation family, it is already self-hosted at five
weights, and it is **not** on the `anti-ai-slop` default list (Inter / Roboto / Open Sans / Arial /
`system-ui` alone / Space Grotesk / Fraunces). Vazirmatn is added for Persian and Arabic script
coverage.

> **Declared deviation from `craft/typography.md` "maximum 2 typefaces".** Three families are
> declared. Justification: Vazirmatn is not a third *voice*, it is script coverage — `rtl-and-bidi.md`
> requires that the `lang` attribute drive font-stack selection, and IBM Plex has no Persian cut in
> this project's self-hosted set. Vazirmatn is reachable only through `--font-persian` and the
> `:lang(fa)` fallback chain, and is loaded with a separate `@font-face` so an English-only visitor
> never downloads it.

Tracking rule from `rtl-and-bidi.md`: **`letter-spacing` is forced to `0` on all `:lang(fa)` /
`:lang(ar)` subtrees** — negative or positive tracking breaks cursive joining.

### 5.2 Scale (1.25 ratio, 7 steps — within the 6–8 cap)

| Token | Size | Line height | Tracking | Weight | Role |
|---|---|---|---|---|---|
| `--text-display` | `clamp(2.25rem, 4vw + 1rem, 3.5rem)` | 1.08 | `-0.02em` | 600 | landing masthead, post title |
| `--text-h2` | `1.5rem` | 1.25 | `-0.01em` | 600 | section headings |
| `--text-h3` | `1.125rem` | 1.35 | `0` | 600 | card titles |
| `--text-body` | `1.0625rem` | 1.65 | `0` | 400 | post body (60–70ch measure) |
| `--text-ui` | `0.9375rem` | 1.5 | `0` | 500 | nav, buttons, form labels |
| `--text-small` | `0.8125rem` | 1.5 | `0.01em` | 400 | metadata rows |
| `--text-caption` | `0.6875rem` | 1.5 | `0.06em` + uppercase | 500 | section indices, tag pills |

Three weights only — 400 read, 500 emphasise, 600 announce. No 700; the before state's `font-bold`
headings are replaced by 600 at a larger size, which is the editorial correction
(`craft/typography-hierarchy-editorial.md` § "Restrained bold").

### 5.3 Editorial rules applied

- Display is **600, not 700**, and the hero is a scale event, not a weight event.
- Deck/standfirst below the hero is `--text-ui` at `--muted`, deliberately a large jump down.
- Body measure `max-width: 65ch` (in the 60–70ch editorial band).
- Post body leading `1.65` (in the `1.6`–`1.7` band).
- Section separators are allowed only where they carry publication identity — the 2 px
  lajvard → firouzeh dome rule stays, because it *is* the identity. Everything else uses space.
- `text-align: start`, never `justify`.
- No pull quotes are added: there is no real pull-quote content, and inventing one would be the
  "quote slop" the craft rules forbid.

## 6. Space, grid, radii, elevation

### 6.1 Spacing

4 px base (`--spacing: 0.25rem`, Tailwind v4 default) with a named rhythm:
`--space-2xs 0.25rem` · `--space-xs 0.5rem` · `--space-sm 0.75rem` · `--space-md 1rem` ·
`--space-lg 1.5rem` · `--space-xl 2.5rem` · `--space-2xl 4rem` · `--space-3xl 6rem`.

Section rhythm alternates deliberately (editorial pacing): masthead → featured uses `--space-3xl`,
featured → latest uses `--space-xl`. Uniform `--space-2xl` everywhere is explicitly rejected as the
"uniform section padding" anti-pattern.

### 6.2 Grid

- Reading column: `65ch` centred, `--space-lg` inline padding.
- Index/landing: 12-column fluid grid, `min(100% - 2.5rem, 68rem)` container.
  Asymmetric usage: the lead featured card spans 7 columns, the two supporting cards 5 (stacked);
  latest posts alternate 7/5 then 5/7.
- Breakpoints: 640 / 768 / 1024 (matching the existing Tailwind usage), plus a 1440 check.

### 6.3 Radii

`--radius-sm 4px` (pills, tags) · `--radius-md 8px` (buttons, inputs) · `--radius-lg 14px`
(cards, panels) · `--radius-full` (progress rail, bars). Uniform 4 px borders are replaced by a
two-step radius system; the "rounded card with a coloured left border" shape is banned
(`anti-ai-slop.md` P0 #5) and does not appear.

### 6.4 Elevation — 3 levels, never a drop-shadow pile

| Level | Treatment |
|---|---|
| **0 · ground** | `--bg`, no shadow |
| **1 · raised** | `--surface` + `1px solid --border` + `inset 0 1px 0 rgba(255,255,255,.04)` |
| **2 · lifted** | level 1 + `0 1px 2px rgba(0,0,0,.06), 0 8px 24px -12px rgba(15,20,32,.35)` + `--border` brightens one step |

Elevation is expressed as a **lightness step plus a hairline plus a soft ambient**, not as a heavy
shadow. `box-shadow: 0 10px 40px rgba(0,0,0,.3)` is on the banned list (`DESIGN.md` §4) and is not
used.

### 6.5 Ambient glow (the "soft tech" signature)

One radial wash per screen, painted with the Persian ground colours, at very low alpha:
`radial-gradient(60rem 30rem at 50% -10%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)`
on the masthead only. It is a **local** glow, not a full-bleed mesh gradient — a full-screen mesh
gradient is on the banned list.

## 7. Motion vocabulary

Grounded in `craft/animation-discipline.md`.

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | `90ms` | press feedback |
| `--dur-fast` | `150ms` | state confirmation (the cross-system default) |
| `--dur-base` | `240ms` | entering UI — search panel, cards lifting |
| `--dur-slow` | `420ms` | the one staggered first-paint reveal |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | opacity, colour, all value-to-value changes (Material 3 standard, not the M2 legacy curve) |
| `--ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | position/scale only — card lift, theme knob travel |

Rules enforced:

1. **Nothing exceeds 500 ms** except the single staggered first-paint sequence (4 steps × 90 ms,
   ≤ 420 ms total).
2. Motion is allowed **only** where the user is moving through space, time or state: first paint,
   navigation state, hover lift, progress. There is no scroll-triggered fade-in per section and no
   `scrollIntoView`.
3. Every transform-based animation is wrapped in
   `@media (prefers-reduced-motion: reduce)` which strips translate/scale/rotate and keeps the
   opacity crossfade as the substitute.
4. No looping/ambient motion except the skeleton shimmer, which stops when content lands. The
   count-up runs exactly once. No flashing, no particles, no confetti.
5. Animation never *performs* a state change — it confirms one that has already happened.

## 8. Interaction states

Every interactive element ships four states plus disabled. This is the correction to the before
state, where hover was the only state and focus was a 1 px outline.

| Element | default | hover | focus-visible | active | disabled |
|---|---|---|---|---|---|
| Nav link | `--muted` | `--primary` | 2 px `--focus` ring, 2 px offset | `--primary-ink` | `--muted` at 45 % |
| Card | level-1 elevation | level-2, translateY(-2px) via `--ease-spring` | ring on the card | level-1 | — |
| Primary button | `--primary` fill, `--bg` label | `--primary-ink` fill | ring | `--ease-spring` 1 px press | 45 % opacity, no pointer |
| Tag pill | `--border` | `--primary` border + text | ring | bg tint | — |
| Search input | level-1 field | border → `--primary` | 2 px ring **+ visible label** | — | 45 % |
| Theme toggle | `--muted` glyph | `--primary` glyph | ring | knob travels with `--ease-spring` | — |
| Copy-code | hidden (`opacity 0`) | visible | visible | swaps to "copied" for 1.2 s | — |

Focus is `:focus-visible` only, **never** `outline: none` without a replacement (a triple WCAG
failure: 1.4.11 / 2.4.7 / 2.4.13). The focus ring is a 2 px lajvard → firouzeh gradient, which is the
second of the two permitted uses of the dome gradient.

## 9. Traceability — every decision to its source rule

| # | Decision | Source rule |
|---|---|---|
| D1 | Persian pigments retained with names and provenance | `README.md` § Design; `styles/_tokens.css` header comment (project design contract) |
| D2 | One permitted gradient, lajvard → firouzeh, used on the wordmark/dome rule and the focus ring only | `README.md` § Design ("One gradient exists … used sparingly"); `styles/site.css` `.tile-rule` |
| D3 | Dark theme is the default | `README.md` § Design ("Default theme is dark") |
| D4 | Full Redesign chosen over Refinement | `REDESIGN.md` §1.4 — least intensive mode capable; the defect is the metaphor, not the spacing |
| D5 | Single solution, not three directions | `REDESIGN.md` §1.5 — the brief specifies goal, scope and visual preference |
| D6 | Soft digital precision tone; charts/diagrams treated as artwork | `aesthetic-preset-library` preset **17 Takram** |
| D7 | Index surfaces become data instruments | `DESIGN.md` §3 Differentiation answer + preset 17 ("charts and diagrams as art pieces") |
| D8 | Local ambient radial glow instead of a full-bleed mesh gradient | `DESIGN.md` §4 "Mesh gradient 铺满背景" risk pattern; `craft/color.md` "two-stop trust gradient" ban |
| D9 | Elevation as lightness + hairline + soft ambient; heavy shadows banned | `DESIGN.md` §4 "万物加重阴影" risk pattern; `craft/color.md` palette discipline |
| D10 | Radius system; no rounded card with a coloured left border | `craft/anti-ai-slop.md` P0 #5 |
| D11 | `--accent` restricted to numerals/indices; ≤2 primary uses per screen | `craft/color.md` § Accent discipline |
| D12 | No default-Tailwind indigo anywhere; `--primary` comes from the palette | `craft/anti-ai-slop.md` P0 #1; `craft/color.md` § Anti-defaults |
| D13 | No emoji as UI; monoline SVG at 1.6–1.8 px `currentColor` only | `craft/anti-ai-slop.md` P0 #3; `DESIGN.md` §4 |
| D14 | No invented metrics — every number on the page derives from `manifest.json` | `craft/anti-ai-slop.md` P0 #6; `DESIGN.md` §4 "Data slop" |
| D15 | No `lorem ipsum` / filler copy anywhere in the artefact | `craft/anti-ai-slop.md` P0 #7 |
| D16 | Display 600 not 700; 3 weights total; display tracking `-0.02em`; caps tracking `0.06em` | `craft/typography.md` (three-weight system, tracking table); `craft/typography-hierarchy-editorial.md` § Restrained bold |
| D17 | Body 65ch measure, `1.65` leading, never justified | `craft/typography-hierarchy-editorial.md` §6 |
| D18 | Alternating section rhythm — uniform padding is an anti-pattern | `craft/typography-hierarchy-editorial.md` §7 |
| D19 | Physical CSS properties replaced with logical ones; `dir` derived from `site.json.language` | `craft/rtl-and-bidi.md` § Logical properties first, § Base direction and language |
| D20 | `letter-spacing: 0` forced on `:lang(fa)` / `:lang(ar)` | `craft/rtl-and-bidi.md` § Typography rules (alreq cursive joining) |
| D21 | Vazirmatn added as a script-coverage family | `craft/rtl-and-bidi.md` § Base direction and language ("`lang` drives font-stack selection") |
| D22 | `:focus-visible` with a 2 px ring, contrast ≥ 3:1, never `outline: none` alone | `craft/accessibility-baseline.md` § Focus visibility |
| D23 | All four states + disabled specified for every control; touch targets ≥ 44 px | `OUTPUT_RULES.md` §九 Web; `craft/accessibility-baseline.md` § Touch targets |
| D24 | Search input gets a real label, not a placeholder | `craft/accessibility-baseline.md` § Form input labels |
| D25 | Motion ≤ 500 ms, 150 ms default, `prefers-reduced-motion` strips transforms | `craft/animation-discipline.md` § Duration thresholds, § Reduced motion |
| D26 | No scroll-triggered fade-in per section; no `scrollIntoView` | `DESIGN.md` §4 animation risks; `DESIGN.md` §8 |
| D27 | Contrast ≥ 4.5:1 for all text pairs, ≥ 3:1 for UI/focus; measured, not assumed | `craft/accessibility-baseline.md` § Color contrast; acceptance criterion "Persian palette tokens" |
| D28 | One `<h1>` per page, no skipped levels, landmarks, alt text | `craft/accessibility-baseline.md` § Keyboard operability and semantic structure |
| D29 | Tokens declared in Tailwind v4's CSS-first `@theme`; no `tailwind.config.js` | `README.md` § Design; `styles/_tokens.css` (`@theme inline`); Tailwind v4 CSS-first contract |
| D30 | No new routes, no content changes, no URL changes | `REDESIGN.md` § Non-Negotiable Rules; engagement brief |

**Intentional deviations, with justification:**

| Deviation | Justification |
|---|---|
| Three font families instead of the craft maximum of two | D21 — Vazirmatn is script coverage, isolated behind `--font-persian` / `:lang(fa)`, not a third display voice. |
| The section-index numerals keep a `0.06em`+ uppercase mono treatment *and* the `data-n` numbering | This is the project's stated identity (`README.md` § Design: "Sections are numbered 01, 02, 03 the way a drawing sheet numbers its views"). Removing it would be a content-identity change, which the brief forbids. It is re-rendered as an index chip rather than a hairline label. |
| One gradient survives rather than zero | The brief says Persian colours and style; the dome transition is the palette's own logic and the project calls it out by name. It is confined to two uses, per `craft/color.md`'s "<1 % effect" budget. |
| A count-up animation runs on the masthead numbers | Justified as state-confirmation on first paint (the numbers were just computed); runs once, ≤ 420 ms, skipped under reduced motion. It is not decorative looping motion. |

## 10. Tailwind v4 wiring — token name → utility class

Tokens live in `styles/_tokens.css` inside `@theme inline`, so Tailwind v4 generates real utilities
from them at build time. No `tailwind.config.js` exists and none is added (v4 CSS-first contract,
`README.md` § Design).

| CSS custom property | Tailwind namespace | Generated utility examples |
|---|---|---|
| `--bg`, `--surface`, `--surface-2` | `--color-*` | `bg-bg`, `bg-surface`, `bg-surface-2` |
| `--fg`, `--muted` | `--color-*` | `text-fg`, `text-muted` |
| `--border`, `--border-soft` | `--color-*` | `border-border`, `border-border-soft`, `divide-border-soft` |
| `--primary`, `--primary-ink` | `--color-*` | `text-primary`, `bg-primary`, `border-primary` |
| `--accent`, `--firouzeh`, `--pomegranate` | `--color-*` | `text-accent`, `bg-firouzeh`, `text-pomegranate` |
| `--focus` | `--color-*` | `outline-focus`, `ring-focus` |
| `--font-sans`, `--font-mono`, `--font-persian` | `--font-*` | `font-sans`, `font-mono`, `font-persian` |
| `--radius-sm/md/lg` | `--radius-*` | `rounded-sm`, `rounded-md`, `rounded-lg` |
| `--dur-fast/base/slow` | `--transition-duration` | `duration-fast`, `duration-base` |
| `--ease-standard`, `--ease-spring` | `--ease-*` | `ease-standard`, `ease-spring` |
| `--text-display … --text-caption` | `--text-*` | `text-display`, `text-ui`, `text-caption` |
| `--shadow-1`, `--shadow-2` | `--shadow-*` | `shadow-1`, `shadow-2` |

Theme switching uses the existing `[data-theme="dark"]` attribute on `<html>`, with light values in
`:root` and dark values overriding. `--color-*` entries in `@theme inline` reference the
theme-varying custom properties, so **one utility class follows both themes** — no `dark:` variant
is needed and none is added.

## 11. Acceptance gates this specification is checked against

1. Every token in §4–§7 appears in `styles/_tokens.css` and generates a utility used in a template.
2. Every contrast pair in §4.4 re-measured on the built CSS, not on this document.
3. `:lang(fa)` renders with `letter-spacing: 0` and mirrors correctly.
4. No `tailwind.config.js`, no `dark:` variant, no hard-coded hex outside `_tokens.css` (except the
   two documented gradient stops).
5. No emoji, no invented metric, no placeholder copy in the rendered HTML.
6. `prefers-reduced-motion: reduce` removes all transform motion.
