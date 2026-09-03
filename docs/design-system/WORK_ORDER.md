# Work order — adopting the Yipyy design system

**Stage 0 is done** (2026-09-03). Stage 1 is next, and nothing downstream is right until it is.

Eleven stages. One PR each, in order. Every stage cites its spec section; put the section number in
the commit message. Do not start a stage before the previous one is merged. This repo pushes straight to `main` (see
[CLAUDE.md](../../CLAUDE.md)) — "merged" means the stage's commit is on `main` and green, not a PR.

`bun run typecheck` and `bun run lint` pass before every PR.

---

## Stage 0 — install the documents · **DONE 2026-09-03**

Everything below has been done. It is kept as the record of where each file went.

- The standing rules were merged into the repo's existing `CLAUDE.md` (§ "Design system"), not
  copied over it — the architecture, build-performance and data-fetching rules there still stand.
  [AGENTS.md](../../AGENTS.md) points every task at this folder.
- `design-system.md`, `WORK_ORDER.md`, `Yipyy Design System.dc.html`, `support.js`,
  `icon-map.json` and `icons/` → `docs/design-system/`.
- The 46 mascot files → `public/mascot/`.
- `yipyy-icons.tsx` → `src/components/icons/yipyy-icons.tsx`. `public/transparent-logo.svg` left in
  place; `yipyy-logo.svg` → `public/`.
- The previous `docs/design-system.md` — an audit of the system being replaced — moved to
  `docs/design-system/as-built-audit-2026-08-31.md`.
- `public/yipyy-mascot.png` is **still present**: it is deleted in stage 3, after its one consumer
  is repointed.

**Done when — and this was checked rather than assumed, 2026-09-03:**

- The mascot files are served. `GET /mascot/yipyy-mascot-welcome.webp` → 200, 99,416 bytes,
  `image/webp`; the `-sm` pair → 200, 23,462 bytes. All 46 files present and all 23
  slugs match §5d1 exactly. `/yipyy-logo.svg` → 200. ✓
- **The reference page does NOT open offline, and that claim was wrong.** It pulls the icon set
  from `unpkg.com/lucide@0.475.0` and its typefaces from Google Fonts, so with no network it
  opens with no icons and fallback type — which is most of what it exists to show. Left as it is:
  vendoring lucide and two font families into `docs/` to make a reference page work on a plane
  is not worth the megabytes. Just know it needs a connection.
- **17 of its image paths were broken and are now fixed.** It shipped with relative
  `public/…` references, which resolve only from the repository ROOT — so from this folder,
  where step 0 above puts it, every mascot pose and photograph was a broken image. Rewritten to
  `../../public/…`. This is the one edit made to the page, and it is a path fix rather than a
  port: nothing about the design changed.

---

## Stage 1 — tokens in `@theme` · §1, §2, §3, §4

The unlock. Everything downstream reads from here.

- `src/app/globals.css`: replace the theme block with the published token set — 14 colour roles, six
  status inks, the radius scale `--r-xs|row|md|lg`, the five durations, the four easings, the
  z-index hundreds, the shadow set including `--sh-cta` and `--sh-cta-active`.
- Map, do not duplicate: Tailwind's `--color-primary`, `--color-foreground`, `--color-muted-foreground`,
  `--color-background`, `--color-border` point at the Yipyy values so existing utility classes inherit
  the system rather than needing a rewrite.
- Plus Jakarta Sans via `next/font`, with the §type scale as `--text-*`.

**Done — 2026-09-05, and the literal grep above needs a correction rather than a checkmark.**

The grep assumed a rewrite strategy: touch every file, replace `emerald-600` with a semantic class.
That is not the strategy this stage used. Measured before starting: ~22,000 raw Tailwind colour-class
occurrences across ~900 files (`emerald` 3,376 · `slate` 3,280 · `amber` 3,829 · `red` 1,775 · `blue`
1,324 · `violet` 850 · 15 more families) — a rewrite of that size is a project of its own, not one
stage. Decided with the product owner: **remap what each step of Tailwind's OWN palette compiles to**,
in `@theme`, rather than rewrite ~900 files. `--color-emerald-600: var(--success)` and so on, for
every step of every family the app uses — 50/100 to white (the tint-fill ban, rule 2/4), everything
else to the family's ink, never its dot (rule 13). Nothing invented: every value is a `var()`
reference to a token already in §1.

**So the grep still finds the string "emerald" in `src/components/ui` — 75 occurrences — and that is
correct, not a regression.** Every one of them is now a class name that compiles to a Yipyy token; the
text search cannot see that, because it only ever searched for the string, not what the string
resolves to. Re-run split in two, and both halves are true:

```
rg -i "#0EA5E9" src/components/ui            # 0 — no raw hex literal, genuinely clean
rg -i "emerald|slate-|gray-" src/components/ui  # 75 — all now-correct remapped classes
```

Verified against the real compiled CSS, not asserted: `bunx @tailwindcss/cli` against this repo's
actual `src/**/*.{ts,tsx}` shows `.text-emerald-600 { color: var(--success); }`,
`.bg-emerald-50 { background-color: var(--card); }`, `.text-slate-500 { color: var(--ink-tertiary); }`.
Confirmed live in the running app too — role badges, booking-status chips and the maintenance banner
all now render white-background-plus-coloured-ink (the §3 chip pattern) with zero component files
touched, purely from the token remap.

**What genuinely remains, and where it's tracked:** raw hex literals that bypass Tailwind's palette
entirely — an inline `style={{ color: '#0EA5E9' }}` or an arbitrary `text-[#0EA5E9]` — are NOT fixed
by a scale remap, because no class name is involved for `@theme` to intercept. Measured: 296+
occurrences of seven old-palette hex values alone, across ~21+ files, none of them in
`src/components/ui` (that directory has zero raw hex literals — confirmed clean). Logged in
[docs/quality/debt-map.md](../quality/debt-map.md), not fixed here — that is per-file work, unrelated
to the token layer.

Also done in this stage, each named because it is a component-level change stage 1 does not
otherwise make: dropped the unused Inter font load (`layout.tsx`, `MessageCenter.tsx` — §4 says so
directly); `dialog.tsx`'s modal radius corrected from `rounded-lg` to `rounded-2xl` (§5i names modals
at 24px, and `card.tsx` already proved `rounded-2xl` is this app's own convention for that rung);
removed the `darkModeEnabled` toggle from `GlobalSettings.tsx` and its data fixture, a control that
promised a feature confirmed on 2026-09-03 to never exist.

**Guardrails to grep after this stage and every one after it:**

```
rg "border-l-4|border-l-\[|border-b-2 border-(?!transparent)"   # banned edge accents (tab strip excepted)
rg "opacity-(1|2|3|4|5|6|7)0.*text-|text-.*opacity-"             # opacity as text de-emphasis
rg "transition:[^\"]*transition:"                                # two transitions in one style
rg "bg-(orange|amber)-[0-9]{3}"                                  # orange as anything but a surface
```

---

## Stage 2 — the empty-state choke point · §5d, §5d1, §5d2

Highest leverage in the codebase. ~28 call sites, one component.

- `src/components/ui/table-empty-state.tsx`: add `pose?: YipyyPose`. When present, render the
  132px `-sm` WebP above the title instead of the 48px icon circle; when absent, keep the circle.
  Change the action button from `bg-emerald-600` to the primary pill with the §4 lift.
- New `src/components/ui/yipyy-pose.tsx`: `<YipyyPose name size="132|320|400" float?>`. It resolves
  `/mascot/yipyy-mascot-{name}{-sm}.webp`, sets `alt=""`, collapses the slot on load error, and
  honours `prefers-reduced-motion`. `float` is refused on `loading`, `error`, `warning` and `sad`.
- `src/components/ui/DataTable.tsx`: the filtered branch (`SearchX`, ~line 437) takes
  `pose="searching"`; the true-empty branch (~line 443) takes `pose={emptyState?.pose}`.
- Fill in `pose` at the ~28 `emptyState={{…}}` call sites using the **§5d2 module map** — no
  judgement calls, every one of the 36 nav areas is already assigned.

**Done when:** every `emptyState={{…}}` in `src/app` and `src/components` names a pose, and a filtered
table shows `searching` while an unpopulated one shows its module pose.

---

## Stage 3 — the four route-level states · §5d2 state ladder

These files already exist and take a pose directly.

| File                    | Pose       | Copy                                                   |
| ----------------------- | ---------- | ------------------------------------------------------ |
| `src/app/error.tsx`     | `error`    | "We couldn't load your board" · Try again              |
| `src/app/not-found.tsx` | `confused` | "That page has moved" · Go to dashboard                |
| `src/app/loading.tsx`   | `loading`  | "Getting your day ready" · no action                   |
| `src/app/forbidden.tsx` | `secure`   | "This area needs an owner's approval" · Request access |

Each: 132px pose, the status glyph in its status ink, a 19/700 heading, one sentence ≤38ch, one 48px
primary pill. The pose never replaces the ink, the glyph or the sentence.

Also repoint `src/app/coming-soon/page.tsx` line 149 from `/yipyy-mascot.png` to
`/mascot/yipyy-mascot-welcome.webp`.

**Done when:** all four routes render their pose, and deleting the `<img>` leaves a surface that still
reads correctly.

---

## Stage 4 — StatusBadge · §status chips, §3

- White surface, 1px hairline in the same ink as the label, ink text, **glyph mandatory** (colour-blind
  safety), pill radius. No tint fill, no white-on-saturated.
- One glyph per status from §5b1 — no synonyms.
- Calendar blocks are the one place a status fills solid; copy goes white there.

**Done when:** `rg "bg-(emerald|red|amber|blue|violet|slate)-(50|100)"` returns nothing, and every
badge has an icon.

---

## Stage 5 — Button · §controls, §4

- Full pill. 40px default, 48px `prominent`, 48px minimum below 1024px. Square icon buttons → circles.
- Primary: `--primary` fill, white text, rest `0 14px 26px -16px rgba(22,104,227,.85)`, hover
  `translateY(-2px)` + `0 16px 30px -16px`, active `translateY(0)` + tighter.
- **One `transition` declaration per style**, exactly: `transform .18s ease, box-shadow .22s ease,
background .18s ease`. Honour `prefers-reduced-motion`.
- Destructive uses `--bad` `#B23B3B`, never the dot-weight `#D24545`.
- Never an orange button, except a first-run brand moment.

**Done when:** every CTA visibly lifts on hover, and no style attribute carries two transitions.

---

## Stage 6 — metric and filter tiles · §tiles

`StatCard.tsx`, `ClickableStatCard.tsx`, `delta-badge.tsx`, `src/app/dashboard/_components/business-health-tiles.tsx`.

- Radius 24px, 1px `#E4EAF5`, 18px padding, near-white wash
  `linear-gradient(135deg, <wash> 0%, #FFF 58%)` from the measured set.
- Colour lives in a 40px solid icon badge. Label 12/700/.07em uppercase with `min-height: 2.6em`
  so a wrapping French label never displaces the figure. 30px/700 tabular value, one 13px sub-line.
  Tile label steps to `#4C5B6C` on the wash.
- Selected `inset 0 0 0 2px #1668E3`; applied solid `#1668E3` with white text, one at a time.
- **No edge line, ever** — the bottom accent these had is the banned pattern on a different side.

---

## Stage 7 — page header, saved views, filter band, row actions · §patterns

- Page header as a component: one 32px title, inline rename where the object is user-named, the
  single 48px primary pill on the right.
- Saved views: a tab strip of named filter sets with the count in the label, active under a 2px
  `--primary` underline, a dashed `+` to save current filters. This is the one legal underline —
  give the strip a radius or a fill and the edge-line ban applies again.
- Filter band on `--inset`: search, all-filters, removable solid pills, a dashed add chip.
- **Row actions are persistent, never hover-revealed** (§devices — two of three contexts have no
  hover). Bulk select turns the header row into a solid `--primary` bar so the table never changes
  height.

---

## Stage 8 — the orange territories · §orange

`avatar.tsx` and the board/occupancy components.

- 2px `#F08A3C` ring on **every pet avatar** — clients and staff never get one.
- Presence: the "on premises" tile, a "Here now" badge, a solid dot on the ring, `yy-breathe` 2.8s.
- Capacity: occupancy meters, "3 spots left". At capacity it stays orange — full is not an error.
- Now: the current-time line, today's column.
- Nowhere else. Not invoices, charts, staff, settings, or any button that is not first-run.

**Done when:** forty ringed avatars on one screen, and no second orange idea competing with them.

---

## Stage 9 — DataTable budget and density · §devices, §density

- Column budget enforced: 7 / 5 / 4-field card. Extras into the existing column picker with a saved
  per-user preference. **No horizontal scroll** — it hides the identity column.
- Density is one token in three values, moving row height, cell padding and avatar only. Never font
  size. Below 1024px roomy wins regardless of preference.
- Cells may stack two values with the qualifier in parentheses in `--ink-tertiary` and a bold `+1`.

---

## Stage 10 — icons · §5b1

- `src/lib/nav/facility-nav.ts`: wire the glyph for every area from `docs/design-system/icon-map.json`
  (`tier1.navigation`) rather than from prose, so a synonym cannot creep back in.
- The six custom glyphs are already real components after stage 0 — import them from
  `@/components/icons/yipyy-icons`. They take `className`/`size` exactly like lucide, so a call site
  never needs to know which tier a glyph came from.
- Resolve the six nav collisions per `tier1Collisions` in the map (also §5b1): Calendar/Calendars, Payments/Billing, Reports/Loyalty
  Reports, Estimates/Waivers, Tasks/Intake Forms, and the `dollar-sign`/`credit-card` money pair.
- Sizes 16/20/24 only, 1.75px stroke (2px at 16), `currentColor`, round caps.
- An icon never introduces a colour — it inherits its label's ink. Exceptions: white on a solid fill,
  a status glyph in its status ink, body ink on a solid orange badge.
- Before drawing a custom glyph, search `Object.keys(lucide.icons)` — 1,756 glyphs. Three customs are
  sanctioned (playgroup, grooming table, checked in); a fourth needs the §governance gate.

---

## Stage 11 — French, print, accessibility · §formatting, §print, §focus

- Every date, time, number, currency, weight and duration through `Intl`. Never a format string,
  never a numeric MM/DD. French `14 h 30`, `\u00A0` before `$ % :`.
- No fixed heights on anything holding a translated string — `common.save` grows 175% in fr.
- Print: every colour drops out except the mark; a status becomes a bordered word; one hairline
  under the table header, no zebra. `print-color-adjust: exact` on the logo and nowhere else.
- `aria-live` on async completion: a table finishing, a toast appearing, a form failing. Focus rings
  from `--primary`. Mind the nested-interactive trap the DataTable source already documents.

---

## Governance

Adding a colour, a component or a glyph goes through the ten gates in the spec's governance section.
The short version: it must be missing, not merely inconvenient; it must be measured against its real
background; and it must be added to `design-system.md` and the reference page in the same PR that
uses it.
