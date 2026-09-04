# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pet services platform (Yipyy) built with Next.js 16, React 19, and TypeScript.

**This is no longer a mock-only codebase.** There is a real backend — Supabase Postgres with RLS, WorkOS AuthKit for identity (ADR 0004; Clerk was removed 2026-08-17), and live Clover card payments — reached through ~98 route handlers in `src/app/api/`. Hand-authored fixtures in `src/data/` still back the screens that have not been converted, so both exist side by side.

**The platform is being redesigned onto a finished design system** (`docs/design-system/`, imported 2026-09-03). Every screen reworked from here on follows it completely — the section below is the short form, and it is not optional.

**Before editing any screen, establish which one it reads.** A page that looks finished may be reading a fixture; a page that looks unfinished may be writing to Postgres. Assuming either way is the most expensive mistake available here.

## Commands

- **Dev:** `bun run dev` (webpack) or `bun run dev:turbo` (turbo)
- **Build:** `bun run build`
- **Lint:** `bun run lint`
- **Type check:** `bun run typecheck` (runs `tsc --noEmit`)
- **Format:** `bun run format` (Prettier)
- **Dead code:** `bun run prune` (Knip)

Always use **bun** as the package manager (not npm, yarn, or pnpm).

## Architecture

- **App Router** with React Server Components (RSC mode enabled)
- **React Compiler** enabled via babel plugin — be aware of its constraints
- **shadcn/ui** (New York style) for UI components; prefer these over custom components — restyled to the design system's tokens, which win over any shadcn default (see **Design System**, below)
- **Tailwind CSS 4** for styling; prefer `data-` attributes over conditional classes
- **next-intl** for internationalization
- **Mock data layer:** `src/data/` contains ~53 TypeScript files with mock data — no real API calls yet

## Design System — non-negotiable

**The platform is being redesigned onto a finished design system, and it is not a proposal to
evaluate.** Colour, shape, motion, size, density, icons, mascot, copy, date/number formatting, print
and governance are all decided and measured. Adopt it completely. Do not invent, do not soften, do
not "improve" a value.

**The four sources, in order:**

1. [docs/design-system/design-system.md](docs/design-system/design-system.md) — the spec, ~40
   numbered sections. `§1`, `§5b1`, `§5d2`, `§6` are the citation format; **put the section number in
   the commit message** of any change that touches the interface.
2. `docs/design-system/Yipyy Design System.dc.html` — the live visual reference, opens offline in a
   browser. Every token, component, state, chip, pose and contrast ratio rendered from the real
   values. **Where the prose and the page disagree, the page is right.**
3. [docs/design-system/WORK_ORDER.md](docs/design-system/WORK_ORDER.md) — eleven stages, in order,
   each with the exact files and a definition of done. Stage 0 is complete; stage 1 (tokens) unlocks
   everything else.
4. [docs/design-system/icon-map.json](docs/design-system/icon-map.json) — the §5b1 icon map,
   machine-readable. Wire nav glyphs from it, never from prose.

`docs/design-system/as-built-audit-2026-08-31.md` is the **old** system, kept as the record of what
is being replaced. Never build from it.

**Never invent a value.** Every colour, radius, duration, easing, size and glyph already exists in
§1. If you believe one is missing, stop and ask rather than choosing — §5v is the gate for adding
one, and it requires the value to be missing rather than merely inconvenient, measured against the
background it will actually sit on, and added to the spec and the reference page in the same change
that uses it.

**Nothing needs installing.** Tailwind v4 `@theme` in `src/app/globals.css`, Radix, `lucide-react`,
`next-intl`, `sonner` and `recharts` are all already dependencies. If a task seems to want a new
package, it is being done wrong. The reference page is HTML — **recreate its designs in this repo's
own environment; never port its markup, its `support.js` runtime, or any inline style from it.**

**shadcn/ui components are the substrate, not the design.** Keep using them (Architecture, above),
but they are restyled to the tokens below — a shipped shadcn default that contradicts this section
loses.

### Colour — one job each

| Role          | Value                 | The one job it does                                                                                                    |
| ------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Primary       | `#1668E3`             | Every button, link, focus ring, active nav item, first chart series. 5.09:1 on white. There is no second action colour |
| Primary hover | `#0F58C6`             | Hover/pressed only, never at rest                                                                                      |
| Primary tint  | `#E8F0FD`             | **Retired as a fill.** Transient hover tone only                                                                       |
| Tint strong   | `#D5E4FB`             | Hairlines and progress tracks. Never behind text                                                                       |
| Heading ink   | `#0E3A5C`             | Page and section titles only                                                                                           |
| Body ink      | `#0A1B33`             | All body copy, cells, names, numbers                                                                                   |
| Secondary ink | `#4C5B6C`             | Emphasised metadata, secondary values, a metric tile's label                                                           |
| Tertiary ink  | `#677382`             | Column heads, timestamps, helper text — 4.83:1, **the floor for text**                                                 |
| Disabled ink  | `#8C99A3`             | Chevrons and placeholder glyphs. **Non-text only**                                                                     |
| Ground        | `#FAFAFB`             | App background — **neutral, no hue**. White cards float on it. `--inset`/`--line` are neutral too                      |
| Card · line   | `#FFFFFF` · `#E6E6E9` | Every raised panel, floating on the ground; the default hairline (`#D5D5DA` strong)                                    |
| Dark panel    | `#0E3A5C`             | The **one** dark surface — the heading ink reused. White at 11.74:1                                                    |
| Orange        | `#F08A3C`             | The animal and the live moment — **a surface, never an ink**                                                           |

Status inks — the ink _is_ the token, there are no tint fills: success `#0F7A52` 5.35:1 · info
`#0F58C6` 6.50:1 · warning `#8A5115` 6.43:1 · error `#B23B3B` 5.86:1 · violet `#4C3BB8` 8.00:1 ·
neutral `#4C5B6C` 6.95:1, all on white. Chart series are the **desaturated** families — `#1668E3`,
`#4F9E85`, `#D9A46A`, `#8D85D6`, `#C06A6A` — never the saturated status colours, or a "Boarding"
series reads as a problem before anyone reads the legend.

**A dot-weight ink is never a text colour.** `#F08A3C` (2.50:1), `#D24545` (4.49:1) and `#18A66E`
(2.28:1) are for 7px dots only; words use `#8A5115`, `#B23B3B`, `#0F7A52`. `#8C99A3` (2.92:1) never
carries informational text either.

### Orange is the animal, and it is a surface

Blue owns what the software does; the status inks own what the record is; **orange owns neither** —
it attaches to the pet, which is why it can be nearly everywhere without colliding. Five
territories, and nowhere else: a 2px `#F08A3C` ring on **every** pet avatar (clients and staff never
get one); presence (the "on premises" tile, a "Here now" badge, a solid dot on the ring); capacity
(occupancy meters, "3 spots left" — at capacity it stays orange, **full is not an error**); now (the
current-time line, today's column); and brand moments with no data on screen.

Never on invoices, charts, staff, settings, or any button that is not first-run. Always a solid fill
with body ink `#0A1B33` on top (6.90:1), a 2px ring, or a 7px dot. Never orange type — not on white,
not on dark, where orange technically passes at 4.70:1 and is **still banned**. Never any orange
element on `#0A1B33`: near-black gives the accent no hue to relate to and the pair reads as hazard
tape. Where words must read as orange they are `#8A5115` on white.

**Repetition is free, competition is not.** Forty ringed avatars is one idea. Rings _plus_ an
unrelated orange badge is one idea too many. And orange never becomes an action or a state — that is
the whole guardrail.

### Shape, type, size

- **Pills:** buttons, inputs, nav items, filters, pagination. Square icon buttons become circles.
- **Radii:** cards and modals 24px, medium containers and tiles 16px, rows 14px, calendar blocks and
  date badges 12px. All from the `--r-*` tokens, never a literal.
- **Type is Plus Jakarta Sans** (drop the unused Inter request): page title 32/700, display 38/700,
  section 17/700, cells and names 15/600, body 14.5/400, meta 13.5/400, micro 12/700/.06em uppercase
  in `#677382`. All numbers get `tabular-nums`.
- **Controls are 40px**, with exactly **one 48px prominent control per screen** (the page header's
  primary action, an empty-state CTA) — and 48px for everything below 1024px.
- **Rows are 48px** at balanced density. Density is one token in three values (compact 40 · balanced
  48 · roomy 56) moving row height, cell padding and avatar **only — never font size**. Below 1024px
  roomy wins regardless of preference.
- **z-index comes from tokens in hundreds** — base 0, sticky 100, nav 200, dropdown 300, drawer 400,
  modal 500, toast 600, tooltip 700. No component writes its own.

### Motion — CTAs physically respond

Primary CTAs rest at `0 14px 26px -16px rgba(22,104,227,.85)`, lift to `translateY(-2px)` with
`0 16px 30px -16px` on hover, and settle to `translateY(0)` with a tighter shadow on `:active`.
Transition is exactly `transform .18s ease, box-shadow .22s ease, background .18s ease`.

Durations `--dur-1..5` = 120/180/220/280/340ms. Easings: `--ease-out` entering, `--ease-in` leaving,
`--ease-std` moving, `--ease-lift` the CTA lift and nothing else. Enter is opacity +
`translateY(6px)`; exit is opacity only. List stagger 24ms, capped at eight.

Ambient motion is **four patterns only** — `yy-float` (the mascot on empty states), `yy-breathe`
(the orange presence dot), `yy-rise` staggered (runs once; the only motion allowed on a surface
already showing data), and a sticky header's shadow on scroll. **One moving thing per view**, 4px
and 2.4s are the ceilings, never on a table or a value, and nothing ambient ever carries
information. `yy-skel` and spinners are loading states, not a fifth ambient pattern — they replace a
surface with no data and stop the instant it arrives. Always honour `prefers-reduced-motion`.

### Icons — two tiers (§5b1)

**Tier 1 is `lucide-react`, already shipped** — everything in working chrome. Monochrome,
`currentColor`, 1.75px stroke on a 24px grid (2px at 16), round caps and joins, **sizes 16/20/24
only**. An icon never introduces a colour; it inherits its label's ink. Three exceptions: white on a
solid fill, a status glyph in its own status ink, body ink on a solid orange badge. One glyph per
meaning — take it from [docs/design-system/icon-map.json](docs/design-system/icon-map.json), never a
synonym. The map also carries the **six collisions in the shipped nav** and their fixes.

**Six meanings have no library equivalent and ship as real components** —
`@/components/icons/yipyy-icons`: `KennelRun`, `Occupancy`, `BoardingNight`, `Playgroup`,
`GroomingTable`, `CheckedIn`. lucide-compatible API, so a call site never needs to know which tier a
glyph came from. Before drawing a seventh, search `Object.keys(lucide.icons)` — 1,756 glyphs, and
`paw-print` and `cone` were both already there — then the §5v gate.

**Tier 2 is the 3D render style — brand surfaces only.** Empty states, first run, service-category
cards, loyalty milestones, marketing. **Never in working chrome and never as a UI icon at any size**:
a render cannot inherit ink, cannot survive 16px, and cannot print. If a slot needs 24px it takes a
Tier 1 glyph. The boundary is data, not size.

### Yipyy the mascot — 23 poses (§5d1, §5d2)

Shipped at `public/mascot/yipyy-mascot-<slug>.webp` plus a `-sm` pair. Two families: **empty and
first run** (14 poses — welcome, presenting, waiting, searching, speaking, listening, pointing,
reviewing, working, idea, notification, medal, celebration, sleeping) at 320 square, `sleeping` at
400 wide; and **the moment** (9 — success, loading, secure, question, thinking, confused, warning,
error, sad) at 132 compact, in a dialog, a panel or a whole failed view.

- **Register is the rule.** Every pose is bright, level or low, and it must match the moment. A
  bright face on a broken sync cannot ship; a failure takes `error`, `warning`, `sad` or `confused`,
  or no pose at all. (This replaced the older blanket "never on an error".)
- **Never instead of the words.** He sits beside the status ink, the glyph and the sentence. Delete
  the image and the surface must still say everything. Alt text is empty by design.
- **96px of clear vertical room** is the physical floor — a row is 48, a toast 48, a chip 24, a
  field's error line 18. Anything under 96 takes a Tier 1 glyph. Never in working chrome, never over
  data already on screen. A filtered empty _is_ an empty surface, so it takes `searching` at 132.
- **One per view, one hologram per view.** Three sizes and no fourth. A missing pose collapses its
  slot — never a broken-image frame. `yy-float` runs on the empty-state poses only, never `loading`,
  `error`, `warning` or `sad`.
- **Do not decide a pose at a call site.** §5d2 already assigns one to every status ink, all 25 rungs
  of the state ladder and all 36 nav areas. Look it up.

### The hard rules (§6 — read the section; these are the ones broken most)

1. **No accent line on any edge** — not `border-left`, `border-bottom`, `border-top` or
   `border-right`, on rows, cards, tiles, list items, calendar blocks or any selected state. Signal
   state with weight, a step of ink, a full 2px ring (`inset 0 0 0 2px var(--primary)`), or a solid
   fill. **The one exception is a tab strip**: an open rail with no radius, no fill and no border
   box, where a 2px `--primary` line sits under its own label. The test is mechanical — **give it a
   radius or a background and the ban applies again.**
2. **No tint fills.** White, or a solid. A status is its glyph, its word, its ink and a 1px hairline
   of that same ink; where one must dominate, fill it solid with the ink at full strength — never
   white on a dot-weight colour. **There is no longer any exception.** The metric-tile wash — the
   one measured case — was retired on 2026-09-04 when the surface family went neutral: the brief
   was a platform with no tinted surface anywhere, and a tile is a card section like any other. The
   tile lost nothing, because its tone lives in the solid badge beside the label, not in the wash.
   Chips, badges and callouts were always white and still are.
3. **One `transition` declaration per inline style, ever.** The template compiles to a React style
   object, so a second `transition:` silently overwrites the first and the animation dies with no
   error.
4. **Opacity is never a de-emphasis tool for text.** It rewrites every ratio in the subtree —
   `#677382` composites to 2.40:1 at `.62`. Change the colour to a token that passes on its own.
5. **Hover is not an affordance.** Two of the three contexts have none, so a row action revealed on
   hover does not exist for two thirds of the product. Make it persistent, or put it behind a
   visible overflow button.
6. **A table that will not fit loses columns, it does not scroll** — 7 at ≥1024px, 5 at 600–1023px,
   4 card fields below, extras into a column picker with a saved per-user preference. A sideways
   table hides the identity column, which is the one that makes the others legible.
7. **48px tap targets on phone and tablet.** 44 is the seated floor, not ours — floor staff are
   standing and holding an animal. **Test at 599px, not 375px.**
8. **Never a numeric MM/DD or DD/MM date.** Canada reads all three orders and this is a boarding
   product, where the wrong month is a dog in the wrong week. Long form where there is room, ISO
   `2026-09-01` where there is not.
9. **A state a component does not implement is a bug, not a decision.** Every component owns its row
   in the §5s state matrix — all eight cells answered, required or not applicable. A button with no
   loading state double-submits.
10. **On paper every colour drops out except the mark.** A status becomes a bordered word, a table
    gets one hairline under its header and no zebra, and nothing depends on a fill to be understood.
    `print-color-adjust: exact` belongs on the logo and nowhere else.

Also: every `fr`/fixed grid column needs `minmax(0, …)` and flex children need `min-width: 0`; never
put a template hole in a fetching attribute (`src`, `url()`) — the preload scanner requests the
literal text.

### Words, dates, numbers (§5q, §5r)

en-CA and fr-CA, sentence case everywhere. **A button is a verb plus its object** — "Check in Kofi",
never "Submit" and never "OK". Use the pet's name wherever the record knows it; he/she when the
record has a sex, they when it does not, **never _it_**. Second person for the user. Banned:
_simply, just, easy, oops, whoops, uh-oh, please wait, kindly, utilize, leverage_.

**Always `Intl`, never a format string.** French time is `14 h 30` — spaces around the h, not 14:30
and not 14h30, the single most common French-Canadian formatting error in software. French needs a
non-breaking space (` `) before `$ % :`, or `42,50 $` wraps with the dollar sign alone on the
next line. Metric leads and imperial follows: `12.4 kg (28 lb)`. Relative time expires at 24 hours.
A pet's name, a breed as the owner typed it, an invoice number and a run number never pass through
the locale layer.

**No fixed height on anything holding a translated string** — `common.save` grows **+175%** in
French, and growth is not monotonic ("Check In" gets _shorter_). `min-height`, `min-width`, let
headers wrap, `overflow-x: auto` on tabs. Read the label at its longest real string in
`messages/fr.json`; if it breaks the layout, the label is the problem.

### Assets

- **The mascot is called Yipyy**, the same name as the product — so in copy he is "Yipyy" only where
  a character is plainly meant, and "he" everywhere else. Never let one sentence mean both.
- **Real photography lives in `public/dogs`, `cats`, `people`, `rooms`, `services`** — use it instead
  of placeholders. **Pets get photographs, people get initials.**
- **The mark is `public/yipyy-logo.svg`** — wordmark `#4AA2E2`, the dot over the i `#ED964F`, the dog
  `#064266`. **These are mark values, not UI values**: `#4AA2E2` is 2.78:1 under white text and must
  never be a button. Do not align the mark and the interface to each other.

### The guardrail greps

Run these after any interface change:

```
rg "opacity-(1|2|3|4|5|6|7)0.*text-|text-.*opacity-"             # opacity as text de-emphasis
rg "transition:[^\"]*transition:"                                # two transitions in one style
rg "bg-(orange|amber)-[0-9]{3}"                                  # orange as anything but a surface
rg -i "emerald|#0EA5E9|slate-|gray-" src/components/ui           # off-palette leftovers
rg "bg-(emerald|red|amber|blue|violet|slate)-(50|100)"           # tint fills — see the note below
bun run check:badge-glyph                                        # a colour-coded badge with no glyph (§3)
bun run check:hover-actions                                      # a control revealed only on hover (§6 rule 11)
bun run check:edge-accents                                       # an accent line on an edge (§6 rule 1)
bun run check:nav-icons                                          # a nav glyph off the map, or on two areas (§5b1)
bun run check:hardcoded-locale                                   # a formatter told a locale the user did not choose (§5q)
```

**The edge-accent grep became a gate on 2026-09-04, and why is worth knowing.**
`rg "border-l-4|border-b-2 …"` used to head this list and fired on
`saved-views.tsx`, which was correct — the tab strip is rule 1's single
sanctioned exception — so the hit was documented here as a false positive to be
re-read. That paragraph was doing a gate's job, badly. `bun run
check:edge-accents` now applies the spec's **own** mechanical test instead: a
bottom rule that rests transparent, on something with no radius and no fill, is
a tab strip and passes; give it a radius or a background and it fails, exactly
as §6 rule 1 says it should. Writing it that way immediately found a SECOND
legitimate tab strip — `OperationsCalendarEventDrawer` — that a filename
allowlist would have reported as a violation.

**The gate is deliberately narrower than the grep was.** `src/` holds 1,169
one-sided border utilities across 514 files and only 152 were ever accents. The
rest are 1px neutral hairlines — a divider under a table header, a rule above a
card footer — which rule 1 never mentions and **rule 10 actively requires** on
paper. So a one-sided border is flagged only when it is thicker than a hairline
or carries a hue: a grey is not an accent, because an accent says "this row is
different" and a grey says nothing at all. `slate-*` and `gray-*` on an edge are
still off-palette and still want `--line` — that is the leftover-palette grep's
job two lines up, not rule 1's.

**The orange grep has the same problem, and it is worth knowing before stage
8's work is judged by it.** `rg "bg-(orange|amber)-[0-9]{3}"` returns ~720
hits, and **not one of them renders orange.** Stage 1 remapped every step of
Tailwind's own `orange` and `amber` scales in `@theme`: `-50`/`-100` compile to
`var(--card)` (white) and `-200` through `-950` to `var(--warning)` `#8A5115`.
So those class names paint the WARNING ink, which is exactly what a state
should be, and orange-the-brand reaches the screen only through
`--brand-orange` / `bg-brand-orange`. The honest version of this grep is:

```
rg "brand-orange|#[fF]08[aA]3[cC]" src   # every real orange in the product
```

Read a `bg-amber-500` hit as "this file has not been through the redesign
yet", not as a §2b violation — and check any NEW orange against §2b's five
territories rather than against the class name.

**The tint-fill grep no longer measures what it was written to measure.** It
predates stage 1, which remapped every `-50` and `-100` step of Tailwind's raw
palette to `var(--card)` in `@theme` — so `bg-emerald-100` has rendered **white**
since then, and `text-emerald-700` renders `#0F7A52`. Its ~3,250 remaining hits
across ~740 files are dead class names, not tint fills: correct on screen,
untidy in source. Read a hit as "this file has not been through the redesign
yet", not as "this is a rule 2 violation" — and do not treat clearing it as a
visual fix, because there is nothing left to see. The rule it stands for is
still absolute for **new** code: white, or a solid.

## Code Style

- Use `@/*` path alias for imports (unless the file is in the same directory)
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, etc.
- **Any commit that touches the interface cites its design-system section** in the message — `feat(empty-states): a filtered table now says who it was looking for (§5d2)`. The section number is how the next person finds the rule that decided the value
- **Design work goes to the `redesign` branch** (ADR 0007, 2026-09-03), which
  deploys to **staging.yipyy.com** for the client to review. `main` still
  deploys to production on every push, so hotfixes are never blocked by
  unreviewed design work, and the cutover is one merge at the end. Merge `main`
  into `redesign` often. Staging shares the **production** database — every
  click on it is a real write — so any new outbound sender must consult
  `outboundSendsSuppressed()`; `bun run check:staging-sends` enforces it.
- **Commit and push straight to `main`. Do not open a pull request** unless
  explicitly asked. `main` is protected but `enforce_admins` is false, so the
  push is accepted. Decided 2026-08-19: the review round trip was costing more
  than it caught on a single-maintainer project.
  - **Run the green sequence locally BEFORE pushing** — `bun run typecheck && bun run lint && bun run format:check && bun run test:unit`, plus `bun run build` for anything
    structural. It is faster to find a broken build here than to wait for CI,
    and CI is now what stands between a push and production.
  - **The pipeline gates the deploy, since 2026-08-25.** Vercel used to deploy
    from `main` on push, so CI reported after customers had the code. Now the
    container image is built only once typecheck, lint, format, unit, checks,
    sql and build have passed, and the deploy job SSHes to the VPS and swaps colours
    with a graceful `caddy reload` — nobody mid-request is interrupted,
    including somebody 90 seconds into tapping a card.
    **Do not infer the deploy from the push.** That lesson outlived its cause:
    on 2026-08-24 fourteen commits produced no deployment at all for six hours
    with every gate green. Confirm with `gh run list --limit 1` and
    `curl -sS -o /dev/null -w '%{http_code}' https://yipyy.com/api/health`.
    Rollback is `ssh root@<box> /opt/yipyy/rollback.sh` — one reload, under a
    second, because the previous colour is still running.
  - Touching auth, a portal gate, a permission or an identity — or bookings,
    boarding, daycare, rooms, the care log, the calendar or the roster? Run
    `bun run test:e2e:ci` locally too — the whole suite, by hand, before you
    push. CI itself runs only the 27-spec gate on a push (the authorisation
    boundary and money) and the full suite nightly, because 83 specs is ~45
    minutes and GitHub holds one pending run per branch: with two people
    pushing, every queued run was cancelled by the next push and nothing
    finished. `bun run check:doc-counts` derives both numbers from package.json
    and fails if either drifts.
    CI still runs it, but only after the deploy is live — and the e2e job is
    not in `image`'s `needs:`, so it reports rather than gates.
- Use the `DataTable` component for all tables — additions to DataTable must not break existing implementations
- Plan before coding — outline approach before implementing

## Build Performance Rules

These rules prevent the build-time regressions already present in the codebase (currently being refactored). Follow them for all new code.

### Prefer Server Components

- **Pages (`page.tsx`) should be Server Components by default.** Do not add `"use client"` to page files.
- Extract interactive parts (state, event handlers, hooks) into small, focused client components and import them into the server component page.
- Only mark a component `"use client"` when it actually uses client-only APIs (useState, useEffect, event handlers, browser APIs).

### Separate types from data

- **Never export types and mock data from the same file.** Types go in the data file or a dedicated types file; mock data goes in a separate file that imports the types.
- Use `import type { X }` when you only need the type — this is erased at compile time and adds zero bundle cost.

### Keep components small

- No single `.tsx` file should exceed ~500 lines. If it does, split it into smaller composable components.
- Large components cannot be parallelized by the bundler and slow down compilation.

### Use dynamic imports for heavy components

- Use `next/dynamic` or `React.lazy()` for components that are conditionally rendered (modals, dialogs, drawers, tabs not visible on load).
- Use `next/dynamic` for pages that import heavy libraries like `recharts` — wrap chart components so the library loads on demand.

### Import discipline

- Import icons from `lucide-react` normally (optimizePackageImports handles tree-shaking).
- Avoid barrel files (`index.ts` that re-exports everything) — import directly from the source file.
- Never use `import *` from large packages.

### Layouts must be Server Components

- Layouts (`layout.tsx`) should not have `"use client"`. Extract `usePathname`/interactive logic into a small client component (e.g., `<NavTabs />`).
- The 7 service layouts (daycare, boarding, grooming, training, retail, store, vet) share identical patterns — use the shared `ServiceModuleLayout` component instead of duplicating.

### Separate state from UI

- Extract state + handlers into custom hooks (`use-<feature>.ts`), one hook per state domain.
- Give each modal/dialog its own file — don't inline multiple modals in one component.
- Colocate route-specific components next to `page.tsx`. Share cross-route components in `src/components/<domain>/`.

### Use special files for resilience

- **`error.tsx`** — Add at each major layout boundary (`facility/dashboard/`, `customer/`, `dashboard/`), not just root. Keeps sidebar/nav interactive when a page errors.
- **`loading.tsx`** — Add skeleton screens to heavy route segments (service pages, dashboards). Server component by default, zero client JS cost. Provides instant navigation feedback.
- **`not-found.tsx`** — Add contextual 404s to dynamic routes (`[id]`, `[slug]`) when data fetching arrives.

## Data Fetching & Forms

### TanStack Query (API client)

- Use `@tanstack/react-query` for all data fetching and mutations.
- Wrap mock data in query factory functions in `src/lib/api/<domain>.ts` so swapping to real API requires changing only the `queryFn`:
  ```
  export const bookingQueries = {
    all: () => ({ queryKey: ["bookings"], queryFn: async () => bookings }),
    detail: (id: string) => ({ queryKey: ["bookings", id], queryFn: async () => ... }),
  }
  ```
- Use `useQuery(bookingQueries.all())` in components — never import mock data directly.
- Server components prefetch with `queryClient.prefetchQuery()` + `HydrationBoundary`.
- Provider lives in the root layout via a client wrapper.

### TanStack Form (static forms only)

- Use `@tanstack/react-form` with Zod validation for **static CRUD forms** (rates, shifts, settings, modals) where fields are known at compile time.
- **Do NOT use for the FormWizard/FormBuilder system.** Those are dynamic forms with runtime-defined fields (`Record<string, unknown>` answers bag) — TanStack Form's type safety doesn't apply. The existing `useState` + `evaluateLogicRules` pattern is correct for dynamic forms.
- Create shadcn adapter components for TanStack Form fields (Input, Select, Checkbox, etc.).

## File Editing

- Only modify relevant parts of files, never rewrite entire files
- Don't generate assets (SVGs, images) unless explicitly asked. The design assets already exist and are the only ones sanctioned: the 23 mascot poses in `public/mascot/`, the mark at `public/yipyy-logo.svg`, the six custom glyphs in `src/components/icons/yipyy-icons.tsx`, and `lucide-react` for everything else. Drawing a seventh glyph goes through the §5v gate
- Don't create md files unless explicitly asked
- Don't build the project unless specified

## AI Operating Harness

This file remains the authoritative source for architecture, design-system, build-performance, and code-style rules. Layered on top of it is an operating harness (the task loop, docs map, and `.claude/skills/`). Read it next:

@AGENTS.md
