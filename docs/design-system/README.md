# Yipyy design system — index

**Imported 2026-09-03.** This folder is the design system the platform redesign is measured
against. It is authoritative: [CLAUDE.md](../../CLAUDE.md) makes following it mandatory for every
screen touched from here on, and [AGENTS.md](../../AGENTS.md) puts it in the task loop.

Read [design-system.md](design-system.md) for the spec, [WORK_ORDER.md](WORK_ORDER.md) for the
staged adoption sequence, and open `Yipyy Design System.dc.html` in a browser for the live visual
reference. Where the prose and the reference page disagree, **the page is right**.

### Two things about opening the reference page

**It is not offline, despite what the handoff said.** It pulls the icon set from
`unpkg.com/lucide@0.475.0` and its two typefaces from Google Fonts. With no
network it still opens, but every icon in the specimen sheet is missing and the type falls
back — which is most of what you opened it to look at. Measured 2026-09-03.

**Its image paths were fixed on import.** The page shipped with 17 relative
`public/…` references, which resolve only when it is opened from the repository
ROOT — so from `docs/design-system/`, where the work order puts it, every
mascot pose and every photograph was a broken image. They now read `../../public/…`
and resolve from this folder. If you move this file, they move with it.

### Two things about opening the reference page

**It is not offline, despite what the handoff said.** It pulls the icon set from
`unpkg.com/lucide@0.475.0` and its two typefaces from Google Fonts. With no
network it still opens, but every icon in the specimen sheet is missing and the type falls
back — which is most of what you opened it to look at. Measured 2026-09-03.

**Its image paths were fixed on import.** The page shipped with 17 relative
`public/…` references, which resolve only when it is opened from the repository
ROOT — so from `docs/design-system/`, where the work order puts it, every
mascot pose and every photograph was a broken image. They now read `../../public/…`
and resolve from this folder. If you move this file, they move with it.

[as-built-audit-2026-08-31.md](as-built-audit-2026-08-31.md) is the _old_ system — what the codebase
rendered before this import, including everything wrong with it. It is a record of what is being
replaced, not a rule.

## What this is

A complete design system for the Yipyy facility product — colour, type, shape, motion, size,
density, icons, mascot, voice, data formatting, print and governance — plus a staged work order for
adopting it in the existing Next.js app.

It is **not** a screen-by-screen redesign of one feature. It is the system every screen is measured
against, and the highest-leverage places to install it first.

## About the design files

`Yipyy Design System.dc.html` is a **design reference created in HTML** — a live specimen sheet, not
production code. Open it in a browser and read it beside the spec. Every token, component, state,
status chip, pose and contrast ratio is rendered from the real values, so it settles arguments the
prose cannot.

The task is to **recreate these designs in the target codebase's own environment**, using the
libraries already installed there. Do not port the HTML, the `support.js` runtime, or any inline
style from the reference page.

## Fidelity

**High fidelity.** Final colours, type scale, spacing, radii, shadows, durations, easings and
contrast ratios. Every colour is measured against its actual background and the ratio is published
beside it. Recreate pixel-accurately using the repo's existing components and Tailwind theme.

## Target environment (verified from `package.json`)

|            |                                                                                        |
| ---------- | -------------------------------------------------------------------------------------- |
| Framework  | Next 16.2 App Router · React 19.2 · TypeScript 5.9                                     |
| Styling    | Tailwind v4 (`@tailwindcss/postcss`) — tokens belong in `src/app/globals.css` `@theme` |
| Primitives | Radix UI (dialog, popover, select, tabs, tooltip, alert-dialog, avatar…)               |
| Icons      | `lucide-react` 0.554 — already the Tier 1 set, no new icon dependency                  |
| i18n       | `next-intl` 4.5 · `messages/en.json`, `messages/fr.json`                               |
| Toasts     | `sonner` 2.0                                                                           |
| Charts     | `recharts` 3.5                                                                         |
| Tooling    | `bun run typecheck`, `bun run lint`, Playwright, knip                                  |

**Nothing needs installing.** If a stage seems to want a new package, it is being done wrong.

## Where every file landed

Stage 0 of the work order is **complete**. Nothing here needs copying again.

| File                          | Lives at                                                        | Why                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The standing rules            | [CLAUDE.md](../../CLAUDE.md) § "Design system"                  | Merged into the repo's own rules file — read on every task                                                                                                                   |
| The spec                      | `docs/design-system/design-system.md`                           | ~40 numbered sections. `§5d1`, `§5b1`, `§5d2` are the citation format; use them in commit messages                                                                           |
| The stages                    | `docs/design-system/WORK_ORDER.md`                              | Eleven stages, each with the exact files and a definition of done                                                                                                            |
| The live reference            | `docs/design-system/Yipyy Design System.dc.html` + `support.js` | Every token, component, state and pose rendered with its contrast ratio. **Needs a network connection** — see below                                                          |
| The icon map                  | `docs/design-system/icon-map.json`                              | §5b1 machine-readable — 37 nav areas + actions + objects + status, plus the six nav collisions and their fixes. Wire `src/lib/nav/facility-nav.ts` from this, not from prose |
| The six custom glyphs (React) | `src/components/icons/yipyy-icons.tsx`                          | lucide-compatible API — `<CheckedIn className="size-5" />`                                                                                                                   |
| The six custom glyphs (SVG)   | `docs/design-system/icons/svg/*.svg`                            | 24×24 files for Figma, email and print. Not needed in `src`                                                                                                                  |
| The icon notes                | `docs/design-system/icons/README.md`                            | What is already installed, and the gate for a seventh glyph                                                                                                                  |
| The mascot                    | `public/mascot/*.webp` (46 files)                               | 23 poses × 2 sizes. Served at `/mascot/yipyy-mascot-<pose>.webp`                                                                                                             |
| The mark                      | `public/yipyy-logo.svg`                                         | Per-path inks corrected. `public/transparent-logo.svg` stays in place                                                                                                        |
| The old system                | `docs/design-system/as-built-audit-2026-08-31.md`               | What is being replaced. Reference only                                                                                                                                       |

`public/yipyy-mascot.png` is still present on purpose — it is deleted in stage 3, once
`src/app/coming-soon/page.tsx` line 149 stops loading it.

## The system in one page

**Colour.** Blue `#1668E3` is primary and owns every action, link and focus ring. Heading ink
`#0E3A5C`, body ink `#0A1B33`, secondary `#677382`, ground `#F6F9FF`. Status inks —
success `#0F7A52`, info `#0F58C6`, warning `#8A5115`, error `#B23B3B`, violet `#4C3BB8`,
neutral `#4C5B6C` — all ≥5.35:1 on white. Orange `#F08A3C` is **the animal and the live moment**,
and it is a surface, never an ink: pet avatar rings, occupancy meters, the now-line, presence dots,
brand moments. Never a button, never a chart series, never on staff or invoices. One dark surface,
`#0E3A5C`. Full detail and every ratio: §1–§2.

**No tint fills, no opacity on text, no accent line on any edge.** White or a solid. A status is its
glyph, its word, its ink and a 1px hairline of that ink. The two carved exceptions — a measured
near-white wash on a metric tile, and a 2px underline on a tab strip — are stated in §3 with the
mechanical test that distinguishes them.

**Shape and size.** Buttons, inputs, filters and pagination are full pills; square icon buttons
become circles. Cards 24px, medium 16px, rows 14px, small 10–12px. Controls 40px, with exactly one
48px prominent control per screen, and 48px everywhere below 1024px. Rows 48px at balanced density.

**Type.** Plus Jakarta Sans. Body 14.5px, cells 15px, card headers 17px, page titles 32px, micro
labels 12px.

**Motion.** CTAs physically respond: rest shadow, −2px lift on hover, settle on active. Durations
120/180/220/280/340ms with named easings. Ambient motion is four patterns, one moving thing per
view, and never on a table or a value. §4.

**Mascot.** Yipyy, 23 poses, in `public/mascot/`. Two families: 14 for empty and first-run
surfaces at 320px, 9 for a moment (success, loading, secure, question, thinking, confused, warning,
error, sad) at 132px in a dialog or a failed view. The pose's **register must match the moment** —
that rule replaced the older blanket "never on an error". §5d1 is the cast; **§5d2 assigns a pose to
every status ink, all 25 rungs of the state ladder and all 36 nav areas**, so nobody has to decide on
the day. He needs 96px of clear vertical room, never sits over live data, and never replaces the
status ink, the glyph and the sentence.

**Icons.** Two tiers. Tier 1 is `lucide-react` — already a dependency, nothing to copy: monochrome,
`currentColor`, 1.75px on a 24px grid, sizes 16/20/24 only. `icons/icon-map.json` is the §5b1 map in
machine-readable form and resolves **six glyph collisions in the shipped nav** (`calendar`,
`credit-card`, `bar-chart-3`, `file-text`, `clipboard-list`, `dollar-sign` each carrying two
meanings). Six meanings lucide has no equivalent for are **shipped as real files** —
`icons/yipyy-icons.tsx` (React, lucide-compatible API) and `icons/svg/*.svg` — not as markup buried
in the reference page. Tier 2 is the 3D render style, brand surfaces only, never a UI icon at any
size.

**Words, dates, numbers.** en-CA and fr-CA. Sentence case. Buttons are a verb plus its object —
"Check in Kofi", never "Submit". Never a numeric MM/DD or DD/MM date. French time is `14 h 30` with
non-breaking spaces. Metric leads: `12.4 kg (28 lb)`. Always `Intl`. §5r and the formatting section.

**Devices.** Three contexts: a phone one-handed on the floor (≤599px), a tablet at the check-in desk
(600–1023px), a desktop in the back office (≥1024px). 48px tap targets on the first two. **Hover is
not an affordance** — two of the three contexts have none, so a row action revealed on hover does not
exist. A table that will not fit **loses columns**: 7 at ≥1024px, 5 at 600–1023px, 4 card fields
below, extras into a column picker. Test at 599px, not 375px.

## Where the leverage is

Four insertion points carry most of the system. They are stages 1–3 of the work order.

1. **`src/app/globals.css` `@theme`** — every token in one place. Nothing else can be right until
   this is.
2. **`src/components/ui/table-empty-state.tsx`** — a `pose` prop here lights up ~28 `emptyState={{…}}`
   call sites at once, and `DataTable.tsx` already branches filtered-empty (`SearchX`, line 437) from
   true-empty (`Inbox`, line 443), which is exactly the §5d2 distinction. This one file is the whole
   "use the mascot wherever we get the chance" answer.
3. **`src/app/error.tsx` · `not-found.tsx` · `loading.tsx` · `forbidden.tsx`** — four route-level
   states that already exist and take `error`, `confused`, `loading` and `secure` directly.
4. **`src/lib/nav/facility-nav.ts`** — wire it from `icons/icon-map.json` and the six collisions
   resolve themselves.
5. **`StatusBadge.tsx` · `button.tsx` · `StatCard.tsx`** — the three most repeated components in the
   app.

## Known defects the adoption fixes

- `table-empty-state.tsx` hardcodes `bg-emerald-600 hover:bg-emerald-700` on its action button —
  off-palette. It becomes `--primary`.
- `coming-soon/page.tsx` line 149 still loads the retired `/yipyy-mascot.png`.
- Six nav glyph collisions in `src/lib/nav/facility-nav.ts` (§5b1 lists each with its resolution).
- Micro labels previously specified at `#8C99A3` (2.92:1) — a non-text ink. They are `#677382`.

## Files

- `design-system.md` — the spec
- `WORK_ORDER.md` — the stages
- `Yipyy Design System.dc.html` + `support.js` — the live reference
- `icon-map.json` + `icons/` — the §5b1 map and the six custom glyphs
- `as-built-audit-2026-08-31.md` — the system this replaces
- `../../public/mascot/` — 46 WebP files
