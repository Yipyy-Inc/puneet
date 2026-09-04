# Yipyy product design system — v1

Hand this file to Claude Code. Every colour traces to `src/app/coming-soon/coming-soon.module.css`,
which documents the palette already decided for the brand. Nothing here is invented.

Visual reference with live examples: `Yipyy Design System.dc.html`.

---

## 1. Tokens

```css
:root {
  /* Brand */
  --primary: #1668e3; /* 5.09:1 on white */
  --primary-hover: #0f58c6; /* 6.50:1 on white */
  --primary-tint: #e8f0fd; /* retired as a fill (rule 04) — transient hover tone only.
                                       Selected is a 2px ring, never this */
  --primary-tint-2: #d5e4fb; /* hairlines and progress tracks. Never a fill behind text */
  --brand-orange: #f08a3c; /* accent: ALWAYS a solid fill under #0A1B33 (6.90:1) — 2px
                                       pet-avatar rings, presence badges, capacity fills, the
                                       now-line, 7px dots. Never an ink: not on white, not on
                                       dark, not anywhere */
  --panel-dark: #0e3a5c; /* the ONE dark surface — same value as --heading, reused.
                                       White carries every word at 11.74:1; orange appears only
                                       as a solid badge/ring/dot. Never #0A1B33 under orange */

  /* Ink */
  /* Ratios are on white cards, where this text lives. On --ground
     each is ~5% lower; all four still pass AA by a wide margin. */
  --heading: #0e3a5c; /* 11.81:1 — titles only */
  --body: #0a1b33; /* 17.25:1 */
  --ink-secondary: #4c5b6c; /*  6.95:1 */
  --ink-tertiary: #677382; /*  4.83:1 — the floor for text */
  --ink-disabled: #8c99a3; /* non-text only */
  --code-fg: #c8d6ea; /* 11.71:1 on --body — code only */

  /* Surface — NEUTRAL since 2026-09-04. The family shipped blue-tinted
     (ground #F6F9FF, inset #F1F5FD, line #E4EAF5) and was neutralised on the
     product owner's call: a clean white page, and cards that float slightly
     above it and are also white. The hue left the SURFACES only — --primary,
     the status inks and --panel-dark are unchanged, so blue still means what
     the software does and no longer means "page".

     The ground is not pure white on purpose. White on white leaves the shadow
     as the only thing saying where a card ends, and this product is read on a
     tablet held on a kennel floor. #FAFAFB is white to the eye and measurably
     lighter than the card, so the separation survives glare and a dim screen.

     WARMED on 2026-09-04, a few hours after it went neutral. Cool neutral read
     clinical beside the warm off-white a competitor uses, and warmth turned
     out to be most of what "glowing" meant. Each step gains contrast rather
     than losing it: --ink-tertiary #677382, the floor for text, measures
     4.58:1 on the original #F6F9FF, 4.63:1 on neutral #FAFAFB and 4.71:1 on
     the warm #FDFCFA it is now. */
  --ground: #fdfcfa; /* warm near-white */
  --card: #ffffff;
  --inset: #f6f4f1;
  --inset-2: #edeae5;
  --line: #e9e6e1;
  --line-strong: #d9d5cf;

  /* Status — the INK is the token. Chips are white with a 1px hairline of
     the same ink; the -bg tints below fill nothing and are kept for reference. */
  --success: #0f7a52;
  --success-bg: #e9f7f1;
  --success-dot: #18a66e;
  --warning: #8a5115;
  --warning-bg: #fef3e8;
  --warning-dot: #f08a3c;
  --error: #b23b3b;
  --error-bg: #fdf0f0;
  --error-dot: #d24545;
  --info: #0f58c6;
  --info-bg: #e8f0fd;
  --info-dot: #1668e3;
  --violet: #4c3bb8;
  --violet-bg: #efedfc;
  --violet-dot: #6b5ae0;

  /* Charts — desaturated status families so a series reads as a category,
     not an alert. NEVER the saturated status colours above. */
  --chart-1: #1668e3; /* --primary as-is — first series */
  --chart-2: #4f9e85; /* success family, desaturated    */
  --chart-3: #d9a46a; /* warning family, desaturated    */
  --chart-4: #8d85d6; /* violet family, desaturated     */
  --chart-5: #c06a6a; /* error family, desaturated      */
  --chart-grid: #e4eaf5;
  --chart-axis: #8c99a3;

  /* Radius */
  --r-xs: 12px; /* calendar blocks, date badges */
  --r-row: 14px; /* table + list rows */
  --r: 16px; /* medium containers, tiles */
  --r-lg: 24px; /* cards, modals */
  --r-pill: 999px; /* buttons, inputs, filters, nav, chips */

  /* Elevation — tinted to brand navy, never pure black */
  --sh: 0 1px 2px rgba(10, 27, 51, 0.05);
  --sh-2: 0 12px 26px -18px rgba(10, 27, 51, 0.5);
  --sh-3: 0 34px 64px -34px rgba(10, 27, 51, 0.4);
  --sh-cta: 0 14px 26px -16px rgba(22, 104, 227, 0.85);
  --sh-cta-hover: 0 16px 30px -16px rgba(22, 104, 227, 0.85);
  --sh-cta-active: 0 4px 10px -8px rgba(22, 104, 227, 0.6);

  /* Motion */
  --ease: transform 0.18s ease, box-shadow 0.22s ease, background 0.18s ease;

  /* Motion */
  --dur-1: 120ms; /* hover, checkbox, chip                       */
  --dur-2: 180ms; /* transform + lift, tab underline, accordion  */
  --dur-3: 220ms; /* shadow growth, colour crossfade             */
  --dur-4: 280ms; /* popover + dropdown enter, toast in          */
  --dur-5: 340ms; /* drawer slide, modal scale-in                */
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1); /* entering        */
  --ease-in: cubic-bezier(0.55, 0.06, 0.68, 0.19); /* leaving         */
  --ease-std: cubic-bezier(0.4, 0, 0.2, 1); /* moving          */
  --ease-lift: cubic-bezier(0.34, 1.36, 0.64, 1); /* the CTA lift    */

  /* Layers — gaps of 100 are room to think, not permission to write 301 */
  --z-base: 0;
  --z-sticky: 100;
  --z-nav: 200;
  --z-dropdown: 300;
  --z-drawer: 400;
  --z-modal: 500;
  --z-toast: 600;
  --z-tooltip: 700; /* clears everything, including modal content */

  /* Size */
  --control-h: 40px;
  --control-h-lg: 48px; /* page-header primary action, empty-state CTAs, and every
                            control below 1024px. One prominent control per screen */
  --row-h: 48px; /* balanced. compact 40 · roomy 56 — moves row height,
                          cell padding and avatar only; never font size */
  --row-pad: 12px 16px;
  --row-av: 32px;
  --tap-min: 48px; /* phone + tablet. 44 is the seated floor, not ours */
  --nav-h: 40px;
  --sidebar-w: 266px; /* 68px icon rail 600–1023px, bottom bar ≤599px */
  --topbar-h: 60px;
}
```

## 2. Colour roles — one job each

| Role          | Value     | The one job it does                                                                                                                   |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Primary       | `#1668E3` | Buttons, links, focus rings, active nav, first chart series. The only saturated blue allowed under white text                         |
| Primary hover | `#0F58C6` | Hover/pressed for anything primary. Never a resting colour                                                                            |
| Primary tint  | `#E8F0FD` | Retired as a fill (rule 4). Transient hover tone only                                                                                 |
| Tint strong   | `#D5E4FB` | Hairlines and progress tracks. Never a fill behind text                                                                               |
| Heading ink   | `#0E3A5C` | Page and section titles only                                                                                                          |
| Body ink      | `#0A1B33` | All body copy, cells, names, numbers                                                                                                  |
| Secondary ink | `#4C5B6C` | Emphasised metadata, secondary values                                                                                                 |
| Tertiary ink  | `#677382` | Column heads, timestamps, helper text. Never lighter for words                                                                        |
| Disabled ink  | `#8C99A3` | Placeholder glyphs, chevrons. Non-text only                                                                                           |
| Ground        | `#FAFAFB` | App background — neutral, no hue. White cards float slightly above it (2026-09-04)                                                    |
| Code ink      | `#C8D6EA` | Monospace code on `--body`; 11.71:1. The only light-on-dark text                                                                      |
| Card          | `#FFFFFF` | Every raised panel, popover, modal, table container                                                                                   |
| Line          | `#E4EAF5` | Card borders, dividers, table header rule — the default hairline                                                                      |
| Dark panel    | `#0E3A5C` | The one dark surface — the heading ink reused. White carries every word at 11.74:1; orange appears only as a solid badge, ring or dot |
| Orange        | `#F08A3C` | 7px status dots, plus the accent inside the wordmark. Never the mark, a fill, text, or a button                                       |
| Error         | `#D24545` | Invalid borders/dots only — 4.49:1 is below the text floor. Error text steps to `#B23B3B`                                             |

## 2b. Where orange goes

Orange cannot mean _attention_ — `#8A5115` already owns that. It cannot mean _action_ — blue owns
every button, link, focus ring and active nav item. Duplicating either makes it mean nothing. So it
gets its own category:

|                      | Owns                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `#1668E3` **blue**   | What the software does. Every action, link, focus ring, active nav item, primary button, selected ring. There is no second action colour                                                                     |
| **status inks**      | What the record is. Confirmed, in service, overdue, cancelled, expiring — six inks, each with a mandatory glyph                                                                                              |
| `#F08A3C` **orange** | **The animal, and the live moment** — always as a surface, never as an ink. Every pet wherever it appears, how full the building is, what time it is right now, and the brand moments with no data on screen |

Because orange attaches to _the animal_ rather than to a control or a state, it can appear on almost
every screen without ever colliding with blue or a status ink.

### The five territories

**1. The pet's own identity.** A 2px `#F08A3C` ring at 2px offset on every pet avatar, everywhere
one is drawn — lists, board blocks, search results, profile headers. A pet has one; a client and a
staff member never do. This single change is what puts orange on nearly every screen. Do not confuse
it with the blue selected ring: that one is `inset` on the row or card, this one is on the avatar
circle only. Two different objects, two different colours.

**2. Presence — who is in the building.** The dashboard "on premises" tile, the "Here now" badge on
a profile, the run occupancy figure. The pet's ring gains a solid orange dot while they are
physically here, and loses it at check-out. A badge that never turns off is decoration.

**3. Capacity — how full.** The occupancy meter, the capacity bar on a day cell, "3 spots left", the
boarding run counter. Solid orange fill on an `--inset` track, figure in body ink beside it. At
capacity it does **not** turn red — full is not an error. It stays orange and the number tells the
story.

**4. Now — the live moment.** The current-time line across the board, today's column header, the
"now" marker on a staff schedule: a 2px orange rule with a 7px dot at its head. Only the present
moment — a future booking is blue or a status, because it has not happened yet.

**5. Brand moments.** Yipyy's accessories in empty states, the first-run "Add your first pet"
button, the sign-in marketing panel, and the active pill on the dark mobile bar — a solid orange
fill, with the bar's own words staying white around it. No data on screen, so no contrast to lose —
the one place orange gets to be large.

### Screen by screen

| Screen                           | Orange                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**                    | The presence tile and the capacity meter — one idea, how full the building is, told twice                                       |
| **Board · calendar**             | The now-line across the day, today's column header, a ring on every pet avatar in every block                                   |
| **Bookings list**                | A ring on each pet avatar down the column — thirty of them, still one idea                                                      |
| **Pet profile**                  | The avatar ring, and a solid "Here now" badge while the pet is on premises                                                      |
| **Check-in**                     | The ring goes solid the moment the pet arrives. The button stays blue — orange marks the result, never the act                  |
| **Client profile**               | The client has no ring. Their pets, listed below, all do                                                                        |
| **Search · command palette**     | Pet results carry the ring; bookings, invoices and clients do not. It is how you tell the animal from the paperwork at a glance |
| **First run · empty · sign-in**  | Yipyy, one accent button, the marketing panel                                                                                   |
| Invoices · payments              | **Nothing.** Money is blue for actions and status ink for state — an orange invoice reads as overdue                            |
| Reports · charts                 | **Nothing.** Series use `--chart-3` `#D9A46A`, so a bar reads as a category and not an alert                                    |
| Staff · settings · audit log     | **Nothing.** Records and controls, and not one of them is an animal                                                             |
| Any button that is not first-run | **Nothing.** Blue owns every action in the product, without exception                                                           |

### The budget

**Repetition is free. Competition is not.** Orange may repeat as often as the data repeats — forty
ringed avatars down a list is _one_ idea and reads as rhythm. Two _unrelated_ orange things on one
screen — pet rings and a promotional badge — is one too many, and the promotional badge is the one
that goes, because it is not one of the five territories. Count ideas, not pixels.

**It never becomes an action or a state.** This is the whole guardrail, and the reason orange can now
be everywhere. The moment an orange thing is clickable, or means confirmed / overdue / cancelled, it
has taken blue's job or a status ink's job and the palette collapses back into noise.

**Always solid, always under body ink** — a solid `#F08A3C` fill with `#0A1B33` on top (6.90:1), a
2px ring, or a 7px dot. No outlined orange, no orange text on white, no pale orange anything, and
no orange type on dark either. Orange is a surface with no exceptions.

### Orange never sets type on dark — and the dark it sits _on_ is `#0E3A5C`

Two rules, and the first has no exception.

**Orange is a surface everywhere.** On a dark panel, white carries every word and orange appears as a
solid badge, ring or dot with body ink on top — never as letters, even though orange type
technically passes at 4.70:1 on `#0E3A5C`. **The pairing runs the other way round: not orange on
navy, but navy and body ink _on_ orange.** `#0A1B33` on a solid `#F08A3C` fill is 6.90:1, and it is
the only orange pairing in the system, on light surfaces and dark ones alike.

**The panel is the heading ink, not near-black.** `#0A1B33` gives the accent no hue to relate to, so
a solid orange badge on it reads as hazard tape; `#0E3A5C` has real chroma and the pair resolves.
Not a new token: the value is already `--heading`.

| Surface   | White on it |                                                                                  |
| --------- | ----------- | -------------------------------------------------------------------------------- |
| `#0A1B33` | 17.25:1     | **Retired** as the surface under an orange element — no hue relationship to read |
| `#0E3A5C` | 11.74:1     | **Use this.** Real chroma, so a solid orange badge resolves against it           |

`#0A1B33` remains the body ink and remains correct _on top of_ an orange fill. What changes is that
it is no longer a surface orange sits on, and orange is no longer an ink on any surface.

## 3. Status chips

Pattern is always: **white background**, a 1px hairline in the same ink as the label, dark ink, full
pill, 26px tall. A 6px dot in the saturated hue replaces the glyph only in the dense tier. No tint
fills anywhere — ink on white outscores ink on its own tint in all six pairs, so this raised every
ratio in the table above. Where a status must dominate, fill it **solid** with the ink at full
strength (legal because contrast is symmetric) — never a faint wash.

| Chip       | Spec                                                           | Use for                                   | Ratio  |
| ---------- | -------------------------------------------------------------- | ----------------------------------------- | ------ |
| Confirmed  | `#0F7A52` on `#FFFFFF` + 1px `#0F7A52` hairline, dot `#18A66E` | Paid, completed, active, vaccines current | 5.35:1 |
| Checked in | `#0F58C6` on `#FFFFFF` + 1px `#0F58C6` hairline, dot `#1668E3` | In progress, on site, neutral notice      | 6.50:1 |
| Pending    | `#8A5115` on `#FFFFFF` + 1px `#8A5115` hairline, dot `#F08A3C` | Needs attention, expiring, low stock      | 6.43:1 |
| Overdue    | `#B23B3B` on `#FFFFFF` + 1px `#B23B3B` hairline, dot `#D24545` | Failed, unpaid, expired, blocking         | 5.86:1 |
| Membership | `#4C3BB8` on `#FFFFFF` + 1px `#4C3BB8` hairline, dot `#6B5AE0` | Plans, packages, programmes               | 8.00:1 |
| Cancelled  | `#4C5B6C` on `#FFFFFF` + 1px `#4C5B6C` hairline, dot `#8C99A3` | Inactive, dormant, refunded, offline      | 6.95:1 |

## 4. Type — Plus Jakarta Sans (400/500/600/700)

Already loaded in the app. Drop the unused Inter request.

| Name        | Spec                                                   | Use                         |
| ----------- | ------------------------------------------------------ | --------------------------- |
| Display     | 38 / 700 / −0.030em / 1.15                             | Hero and empty-state titles |
| Page title  | 32 / 700 / −0.028em / 1.2                              | Screen titles               |
| Section     | 17 / 700 / −0.008em / 1.3                              | Card headers                |
| Body strong | 15 / 600 / 1.45                                        | Table cells, names          |
| Body        | 14.5 / 400 / 1.6                                       | All prose and labels        |
| Meta        | 13.5 / 400 / 1.5                                       | Secondary lines             |
| Micro       | 12 / 700 / 0.06em / uppercase, `--ink-tertiary` 4.83:1 | Column heads, group labels  |

All numbers get `font-variant-numeric: tabular-nums`.

## 5. Components

**Button** — `height:40px; padding:0 20px; border-radius:999px; font:600 14.5px`. Variants:
primary (`--primary` fill, `--sh-cta`), outline (`--line-strong` border on white), subtle
(`--inset` fill), ghost (transparent), destructive (`--error-dot` fill), disabled (`#6D9DE8`,
no shadow). Icon buttons are 40×40 circles.

**Input** — `height:40px; padding:0 16px; border-radius:999px; border:1px solid --line-strong`.
Focus: `border:2px solid --primary` + `box-shadow:0 0 0 3px rgba(22,104,227,.12)`.
Invalid: same with `--error-dot` / `rgba(210,69,69,.12)`.

**Filter pill** — 40px pill, trailing `expand_more`. Active carries a count badge in `--primary`.

**Segmented** — `--inset` track, 3px pad, active segment white with `--sh`, segments pad `9px 17px`.

**Table row** — 48px, inset rounded container (`margin:2px 10px; border-radius:14px`), no bottom
border. Header row keeps one hairline. Hover `--inset` (neutral, never chromatic).

**Card** — white, `1px solid --line`, `border-radius:24px`, `--sh`. Header `14px 20px` with a
hairline under.

**Metric / filter tile** — white-to-wash gradient, 1px `#E4EAF5`, radius 24px, 18px padding.
Colour lives in a 40px solid icon badge (white glyph; body ink on the orange one). Label
12px/700/.07em uppercase `#4C5B6C` with `min-height: 2.6em` — two lines reserved, so a wrapping
label never pushes its value down and a row of tiles keeps its figures on one line; then a 30px/700 tabular value, then one 13px `--ink-secondary`
sub-line. Selected = `inset 0 0 0 2px #1668E3` + value in `#0F58C6`. Applied = solid `#1668E3`,
white text, one at a time. No edge line, ever.

**Nav item** — 40px full pill. Active = white + a 1px `--primary` hairline + `--primary-hover` ink + weight 600.

**Calendar block** — service colour is the _fill_ (boarding `#E8F0FD`, daycare `#E9F7F1`, grooming
`#EFEDFC`, training `#FEF3E8`), `1px solid rgba(10,27,51,.07)`, radius 13px. Contents: status chip
on its own line (only when duration ≥ 60 min), pet name, service, then time + price.

**KPI tile** — radius 24px, pad `19px 21px`. Value 33 / 700 / −0.03em. Delta as a status chip.

## 5b. Surfacing patterns

Six additions. Every one renders data the product already holds — none needs a new capability.

**Pet codes.** A fixed vocabulary, so a calendar block can be read without opening it. Chip 19px,
radius 6px, `rgba(255,255,255,.85)` on the service fill, mono 10.5/700. Max 3 per block, ordered by
severity (red, then amber, then the rest); overflow becomes `+2`. Never invent a code at a call
site — add it here or it does not exist.

| Code               | Ink     | Means                                       |
| ------------------ | ------- | ------------------------------------------- |
| `2W` / `4W` / `6W` | violet  | Grooming interval                           |
| `MED`              | warning | Medication on file, must be administered    |
| `VAC`              | error   | Vaccine expired or expiring inside the stay |
| `BEH`              | error   | Behaviour note — read before handling       |
| `1ST`              | info    | First visit                                 |
| `SR`               | info    | Senior — reduced activity                   |
| `OWN`              | success | Food supplied from home                     |
| `VIP`              | success | VIP client                                  |

**Occupancy in the date header.** Day name, date, then the day's % with a 4px bar under it.
Blue below 90%, `--warning-dot` at ≥90%, `--error-dot` at 100%. The percentage is a capacity
warning, not decoration — it sits where the booking decision is made.

**Hover preview.** Popover on a room or kennel: photo from `public/rooms`, plus a 7-day capacity
bar chart with % labels above and dates below. `--sh-3`, radius 24px, 240ms delay in / 80ms out.

**Day report panel.** Beside the calendar, never in Reports. Appointments, pets, finished,
no-shows, then earned vs expected revenue with a fill bar. Earned is the only figure at 19px —
it is the number an owner checks hourly.

**Print sheet builder.** Modal, `--sh-3`, radius 24px. Header and footer stay white, body drops to
`--inset` so the sheet reads as paper. Live sheet on the left, field toggles on the right; toggles
only show and hide, they never reorder. Footer states the scope (pets · staff · date).

**Collapsible rail.** 60px collapsed, 266px expanded, width transition 220ms ease. Icons never
move, labels fade. This matters at Yipyy's scale — 36 nav areas.

## 5b1. Icons — two tiers

**Tier 1 — UI icons.** Line glyphs, `lucide-react`, already shipped. Every icon in working chrome:
nav, buttons, rows, cells, inputs, status, empty-state headers. Monochrome, inherits its label's ink
through `currentColor`, 1.75px stroke on a 24px grid. ≈68 named glyphs. This is the tier with the
rules, because it is the tier people use two hundred times a day.

**Tier 2 — Brand illustration.** 3D renders, in Yipyy's pipeline. Reserved for surfaces with no
data on them: empty states, first run, service-category cards, loyalty milestones, marketing.
≈14 renders plus Yipyy's 23 poses (§5d1). It is the same render language as the mascot himself,
which is why it already looks like the brand.

### Why the 3D style cannot be the icon set

It is a good style and the brand already speaks it — Yipyy the mascot is a render in exactly this language.
It just cannot be the tier that does the work:

- **A render cannot be a UI icon.** At 20px in a sidebar, specular highlights, cast shadows and
  three materials become mud. The glyph has to survive 16px on a phone; a line icon is the only
  thing that does.
- **It cannot inherit ink.** Tier 1 is `currentColor` — it darkens with its label on hover, goes
  white on a solid fill, steps to `--ink-disabled` when disabled, with no per-state asset. A render
  is a fixed bitmap in every state.
- **It cannot carry the colour rules.** Every render in the reference set is multi-hue and
  saturated. Thirty in a sidebar overrides blue-for-action and the status inks at a stroke, and
  orange stops meaning the animal (§2b).
- **It cannot print.** Rule 17 drops every colour on paper except the mark. A run card with six
  renders prints as six grey smudges; a line glyph prints exactly as drawn.
- **So the boundary is data, not size.** Surface showing records → line icons. Surface with no data
  on it yet → a render is allowed. Same test as Yipyy, same reason.

### Tier 1 construction

|              | Value          | Why                                                                                                                                                           |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grid         | 24 × 24        | Every glyph on the same box with a 1px optical margin — lucide's native grid, so shipped and custom glyphs are constructed alike                              |
| Stroke       | 1.75px         | At 20 and 24px. Steps to 2px at 16px so the glyph does not thin out. The only variation                                                                       |
| Caps · joins | round          | Matches the pill-and-radius language. Never miter — a sharp join beside a full pill reads as a different family                                               |
| Sizes        | 16 · 20 · 24   | 16 inline with text and in badges, 20 the default for buttons/rows/nav, 24 for page headers, empty-state heads and 40px solid badges. No other size           |
| Colour       | `currentColor` | An icon never introduces a colour. Three sanctioned exceptions: white on a solid fill, a status glyph in its own status ink, body ink on a solid orange badge |
| Alignment    | optical        | Icon and label centre on cap height, not the line box, in a flex row with a 9px gap at 20px. Never a fixed margin — it drifts when the label wraps in French  |

### Six collisions in the shipped nav

Read out of `src/lib/nav/facility-nav.ts`. Six glyphs each carry two meanings — two screens wearing
one icon is two screens nobody can find by eye.

| Glyph            | Currently on                             | Fix                                                                                                          |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `calendar`       | Facility Calendar · Bookings             | Bookings → `calendar-check`. The calendar is the grid you look at; a booking is one confirmed reservation    |
| `credit-card`    | Payments · Subscription & Billing        | Subscription → `repeat`. What Yipyy charges the facility is a recurring charge, not a card taken at the desk |
| `bar-chart-3`    | Reports & Analytics · Loyalty Reports    | Loyalty Reports → `trending-up`. One metric over time, not the reporting suite                               |
| `file-text`      | Estimates · Digital Waivers              | Waivers → `file-signature`. A waiver's whole nature is that it is signed                                     |
| `clipboard-list` | Tasks · Intake Forms                     | Intake Forms → `clipboard-pen`. A form is filled in; a task is ticked off                                    |
| `dollar-sign`    | Payments & Billing (pairs with Payments) | → `wallet`. Two money screens with two money glyphs and near-identical names; the titles need separating too |

### The map

Four groups, ≈68 glyphs, one name each — the point is that nobody picks a synonym.

**Navigation (32 areas):** `house` Dashboard · `calendar-days` Facility Calendar · `layout-grid`
Occupancy · `phone` Calling · `message-square` Inbox · `scissors` Grooming · `graduation-cap`
Training · `shopping-cart` Retail · `zap` Automations · `lightbulb` Insights · `users` Customer ·
`clock` Scheduling · `heart-handshake` Daily Care · `calendar-check` Bookings · `file-text`
Estimates · `clipboard-list` Tasks · `calendar-clock` Booking Requests · `clipboard-check`
Evaluations · `user-check` Staff · `package` Inventory · `tags` Memberships · `camera` Pet Cams ·
`credit-card` Payments · `wallet` Billing · `vault` Register · `receipt` Payroll · `repeat`
Subscription · `gift` Gift Cards · `bar-chart-3` Reports · `megaphone` Marketing · `award` Loyalty ·
`trending-up` Loyalty Reports · `shield-check` Reputation · `triangle-alert` Incidents ·
`file-signature` Waivers · `clipboard-pen` Intake Forms · `settings` Settings.

**Actions:** `plus` add · `pencil` edit · `trash-2` delete · `x` close · `check` confirm · `search` ·
`filter` · `arrow-up-down` sort · `ellipsis` more · `download` export · `upload` import · `printer` ·
`share-2` · `copy` duplicate · `refresh-cw` retry · `undo-2` · `eye` / `eye-off` · `link` ·
`external-link`.

**Objects:** `dog` · `cat` · `user` client · `users-round` household · `syringe` vaccination ·
`stethoscope` vet · `pill` medication · `utensils` feeding · `bath` · `bone` treat · `door-open`
check-in/out · `bed` boarding · `sun` daycare · `map-pin` · `paperclip` · `image` ·
`paw-print` pet record · `cone` recovery hold.

**Status** (glyph mandatory, never colour alone): `circle-check` confirmed · `clock-3` pending ·
`circle-dot` in service · `circle-x` cancelled · `triangle-alert` needs attention · `circle-slash`
no-show · `loader-circle` loading · `circle-help` unknown.

### Six custom glyphs — the brand-identity part

Checked one by one against all 1,756 glyphs in lucide 0.475 — against the library's own icon list,
not against what the app happens to import. Drawn on lucide's own 24px grid at 1.75px with round
caps, so they sit beside the shipped set without reading as a second family; that is what makes the
set feel bespoke rather than assembled. Construction drawings for an illustrator to refine, not
final artwork.

**Two were already in the library and are dropped:**

- **`paw-print`** replaces the custom "Paw" — the identity glyph that pairs with the orange ring and
  marks a pet record wherever `dog` or `cat` is too specific. It is the most load-bearing of the set,
  so drawing it was the most expensive mistake to leave in.
- **`cone`** replaces the custom "Recovery cone" — the medical-hold flag. lucide's geometric cone
  reads as a cone at 20px, which is the whole requirement; a bespoke e-collar buys nothing.

| Glyph              | Closest in library | Why it is still custom                                                                                                                                                                                          |
| ------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kennel run**     | `fence`            | The unit the boarding business is measured in, and `Grid3X3` stands in today. A fence is a boundary; a run is one enclosure a named animal occupies — different noun, and this map allows one meaning per glyph |
| **Occupancy**      | `grid-2x2-check`   | How full the building is — the figure orange marks. Fill is the meaning; `grid-2x2-check` means a grid that has been verified, a different statement about the same shape                                       |
| **Boarding night** | `moon-star`        | Boarding is priced by the night. `moon-star` already means dark mode in every product a user has opened, so it cannot also mean one animal's overnight stay — the paw pads are what make it a stay              |
| **Playgroup**      | none               | Daycare's core object: several animals loose together. `users` and `users-round` are both people, and nothing in 1,756 glyphs is a group of animals                                                             |
| **Grooming table** | none               | Distinguishes the station from the service — `scissors` is the service. `table` and `table2` are both data tables                                                                                               |
| **Checked in**     | none               | The most-performed action in the product. `paw-print` says pet and `circle-check` says done; neither says the arrival, and it needs one glyph because it is one event                                           |

### Tier 2 — the render set

Fourteen renders beyond Yipyy's ten poses, in his pipeline.

| Set                | Count | Size               | Where                                                                                        |
| ------------------ | ----- | ------------------ | -------------------------------------------------------------------------------------------- |
| Service categories | 6     | 160 × 160          | Boarding, daycare, grooming, training, playgroup, retail — services grid and booking picker  |
| Empty states       | 10    | 320 × 320 (2 wide) | Yipyy's ten poses — **shipped**, see §5d1. One per named empty state, never on an error      |
| Loyalty milestones | 4     | 160 × 160          | First booking, tenth visit, referral sent, review left — a milestone card carries no records |
| First run          | 4     | 320 × 320          | Add your first pet, connect payments, invite staff, you're set                               |

- **Never in working chrome.** Not nav, table, row, cell, button, chip, form or toast — the boundary
  is whether the surface is showing records, exactly as for Yipyy.
- **Never as a UI icon at any size.** A render is 160px or 320px. If a slot needs 24px, the answer
  is a Tier 1 glyph, not a shrunken render.
- **One per view**, like Yipyy and like orange. Two renders on one screen turn a brand moment
  into a sticker sheet.
- **PNG or WebP with transparency, 2× for the slot, ≤120KB** — Yipyy's own budget, so the two sets
  stay one family.
- **Rendered in Yipyy's pipeline** — his light, material and camera. A render bought from a
  different set reads as clip art the moment it sits beside him.
- **It never carries information.** Every render sits beside a heading and a sentence that already
  say the thing, so it drops out on paper with nothing lost.

## 5b2. Bigger, and more obvious

Six patterns worth taking from best-in-class pet software, and one to leave.

**1. The page header is a component.** One title per screen at **32px** (up from 26 — a page title
competing with a section heading is a page with no centre), an inline rename affordance where the
object is user-named, and the primary action as a **48px** `--control-h-lg` pill on the right.
Anything secondary stays 40px and outlined. One prominent control per screen.

**2. Saved views, with counts.** The largest idea here and the one Yipyy has nothing like. A list of
1,054 clients is unusable; the same list under six named views is six short lists. The count belongs
_in_ the label — it is the difference between a tab and an answer. Active view carries a 2px
`--primary` underline, never a fill; a trailing dashed `+` saves the current filter set as a new
view. This is the one edge line rule 2 allows, and the rule now names it: an open rail with no radius, no
fill and no border box, where the line sits under its own label. The test is mechanical — give the
strip a radius or a background and the ban applies again. The sidebar is a different component and
keeps its solid `--primary` pill. Below 600px the strip scrolls sideways with a chip half in view.

**3. Filters you compose, on a band of their own.** Search, an all-filters button, and a dashed `+`
chip that adds one criterion at a time, each applied filter becoming a removable solid `--primary`
pill. The band sits on `--inset`, a neutral surface and not a tint, so rule 04 holds.

**4. Persistent row actions.** Message and call sit _in_ the row, always visible — rule 11 satisfied
rather than argued with. 34px circular icon buttons, ink stepping to `--primary` on hover.

**5. Multi-value cells.** A cell may carry several values stacked, the qualifier in `--ink-tertiary`
inside parentheses ("Zuri (Bernese mountain dog)"), with a bold `+1` for the remainder. Two lines in
a 48px row is legitimate; three is a card.

**6. Bulk selection.** A checkbox column, and the header row _becomes_ the selection bar the moment
anything is ticked — solid `--primary`, count on the left, actions on the right. Replacing the
header rather than appearing above it means the table never changes height when you tick a box.

### The one thing not to take: orange as the primary action

In the reference every primary button is orange; that is their identity and it works because orange
is the only accent they run. Yipyy already spent its orange on the animal (§2b). Copy the orange
button and presence, capacity and the now-line lose their meaning in one move, because orange would
then mean "click me" everywhere else on the screen. The contrast is fine — `#0A1B33` on `#F08A3C` is
6.90:1 — the failure is semantic, not visual. **Take the size and the confidence of that button.
Leave the colour.**

## 5c. Forms

Label 13.5/600 above the field, 6px gap. Field `min-height: 40px` — never a fixed height. Help text
13/400 tertiary, 6px below. Error 13/500 `--error` **replaces** the help text, never stacks with it.
Fields 18px apart, groups 28px. Mark optional fields "Optional"; assume the rest are required rather
than asterisking them.

**Wizards** (staying as wizards): step rail with a 28px badge — done is a white tick on a solid `--success`,
current is solid primary, todo is an outline. The badge carries the number, so the label never
repeats it, and a done step shows the tick _instead of_ its number. Any wizard over three steps
must offer save-and-resume.

## 5d. Empty and loading states

**First-run empty** — Yipyy at 132px, headline 19/700, body 14.5/1.55 capped at 34ch, exactly one
primary action.

**Filtered empty** — no Yipyy: a 40px icon circle, 15.5/700 headline, 13.5 body.

Yipyy appears in first-run empties and onboarding only. Never on an error, never on a filtered
empty, never in working chrome — he stops meaning anything if he is everywhere.

**Skeletons** — `--inset-2` fill, radius matching the real element, `opacity 1 → .45` pulse at 1.4s.
A skeleton mirrors the shape of what is loading. Never a spinner for content; spinners are only for
an action already in flight.

## 5d1. Yipyy — twenty-three poses

**The mascot is called Yipyy**, the same name as the product. In copy he is "Yipyy" only where a
character is plainly meant ("Yipyy is waiting", "Yipyy's poses") and "he" everywhere else; the
company and the app are "Yipyy" too, so never let one sentence mean both.

All twenty-three poses are shipped, in `public/mascot/`. WebP, transparent, 12–112KB each.

### The character sheet — locked across all twenty-three

Only the body attitude and the prop change. A new pose is checked against this before it ships.

|          |                                              |                                                                                                                                                                                                          |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build    | Bipedal pup, ~4 heads tall                   | Stands and gestures like a character, not a dog. The large head-to-body ratio keeps him friendly and must not drift                                                                                      |
| Coat     | Grey body, cream chest, muzzle, paws         | Blue brow and eye markings, two small orange brow flecks, navy paw pads. Blue tail tip above a cream tip                                                                                                 |
| Eyes     | Warm brown, large, high shine                | Both visible in every pose but Sleeping. He looks at the viewer or at what he is offering — never off-frame at nothing                                                                                   |
| Register | Bright · level · low                         | 8 bright, 12 level, 3 low. The axis the cast added, and the one that unlocked the failure poses: the pose must match the register of the moment                                                          |
| Headset  | Blue over-ear, mic on his left               | He works the front desk, so it is worn in all twenty-two waking poses. Sleeping is the only exception                                                                                                    |
| Collar   | Purple + teal, orange studs, silver bone tag | Reads "yipyy". Character colouring, not UI — it predates the palette and is exempt, but it is identical in all twenty-three                                                                              |
| Props    | Four holograms, cyan and violet              | `loading` ring, `secure` shield, `reviewing` clipboard, `working` tablet. Character, not UI, exempt like the collar — but the two carrying fake dashboards never sit beside a real chart or a real table |
| Light    | Soft key upper left, faint contact shadow    | One studio setup, one camera at his chest, one lens, transparent background. Never a baked backdrop or full ground plane                                                                                 |

### Two families

| Family                | Poses | Slot                                | What it is                                                                                                                                                                                                                  |
| --------------------- | ----- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty & first run** | 01–14 | Square 320, wide 400 for `sleeping` | A surface with no data on it — the job he has always had. Headline, sentence, exactly one primary action, and him above them                                                                                                |
| **The moment**        | 15–23 | Compact 132 only                    | A confirmation, a permission, a whole view that failed. This family only exists because the cast now has a matched face for a bad moment; while every pose was warm, the honest answer was to keep him out of them entirely |

### The cast — empty & first run

| #   | Pose                  | Reg.   | Body attitude                                                | Serves                                                    | Copy                              | CTA                     |
| --- | --------------------- | ------ | ------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------- | ----------------------- |
| 01  | **Welcome**           | Bright | Standing square, one paw raised in a wave                    | First run · sign-in panel · the front door                | "Let's get your facility set up"  | Add your first pet      |
| 02  | **Presenting**        | Bright | Both paws open at chest height, offering the empty space     | No pets on a client record · no pets in the facility      | "No pets on file for Amara yet"   | Add a pet               |
| 03  | **Waiting**           | Level  | Standing still, paws together, ears up. Patient, not idle    | No bookings today · nothing scheduled                     | "Nothing booked for Tuesday"      | Add a booking           |
| 04  | **Searching**         | Level  | One paw shading his eyes, scanning the middle distance       | Empty board · nobody on premises · occupancy zero         | "No one's checked in yet today"   | Check someone in        |
| 05  | **Speaking**          | Bright | Mouth open mid-sentence, one paw out, mic live               | Empty inbox · no messages sent · no client updates        | "Your inbox is clear"             | Send a message          |
| 06  | **Listening**         | Level  | One paw at the headset earcup, head turned to hear           | No calls logged · no voicemail · empty call history       | "No calls logged today"           | Log a call              |
| 07  | **Pointing**          | Bright | Side-on, one paw pointing at the space beside him            | No staff invited · single-user account · empty playgroup  | "You're the only one here so far" | Invite a teammate       |
| 08  | **Reviewing**         | Level  | Glass clipboard in both paws, brow down, actually reading it | No waivers out · no intake forms · no evaluations         | "No waivers out for signature"    | Send a waiver           |
| 09  | **Working**           | Level  | Tablet in one paw, the other tapping it, dashboard lit       | A report with no history · an analytics view never opened | "No numbers to report yet"        | Take your first booking |
| 10  | **Idea**              | Bright | One paw up with a single claw raised, ears forward           | No automations · no saved views · nothing running itself  | "Nothing runs on its own yet"     | Create an automation    |
| 11  | **Notification**      | Level  | On all fours, one front paw lifted, head up and alert        | Empty notifications panel · nothing needing attention     | "You're all caught up"            | — none                  |
| 12  | **Medal**             | Bright | Holding a gold medal out on its ribbon, chin lifted          | Loyalty milestones · a tenth stay · a review earned       | "Zuri's tenth stay with you"      | Send a thank-you        |
| 13  | **Celebration**       | Bright | Both paws up, mouth open mid-bark, tail mid-wag              | Onboarding finished · tasks cleared · a day closed out    | "That's everything for today"     | Go to dashboard         |
| 14  | **Sleeping** _(wide)_ | Low    | Curled nose-to-tail, eyes closed, one ear folded. No headset | After hours · nothing overnight · a closed day            | "No overnight stays tonight"      | — none                  |

### The cast — the moment

Compact 132 only, in a dialog, a panel or a whole failed view. Never a toast, a field or a row.

> **One deviation, 2026-09-04.** A ROUTE-level state that owns the entire viewport —
> `app/loading.tsx`, `error.tsx`, `not-found.tsx`, `forbidden.tsx`, rendered by `RouteState` with
> `surface="bare"` — takes the pose at **320**, not 132. At 132, alone in the middle of an empty
> 1440px screen with nothing else on it, he reads as an unfinished icon rather than as the subject.
> 320 rather than an intermediate value because "three sizes and no fourth" still holds, and the
> source files are 720×720 so it is still downscaling. Everything this rule was written for — a
> dialog, a sign-in panel, a section that failed in place — keeps 132.

| #   | Pose         | Reg.   | Body attitude                                                    | Serves                                                                              | Copy                                     | CTA               |
| --- | ------------ | ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- | ----------------- |
| 15  | **Success**  | Bright | Thumb up, eyes bright, chest square to you                       | A finished flow — the confirmation panel, never the toast                           | "Kofi is checked in"                     | Back to the board |
| 16  | **Loading**  | Level  | Both paws around a spinning holographic ring                     | A first load with nothing on screen yet. Never a button, never a row                | "Getting your day ready"                 | — none            |
| 17  | **Secure**   | Level  | Paw on hip beside a holographic shield and padlock               | Sign-in · two-factor · permissions · an access request                              | "This area needs an owner's approval"    | Request access    |
| 18  | **Question** | Level  | Head tilted, one paw at his chest, waiting on your answer        | A confirmation that asks something harmless                                         | "Send Amara the waiver now?"             | Send it           |
| 19  | **Thinking** | Level  | Paw at his chin, eyes up and off to one side                     | A judgement call the record cannot make — a clash, a double-booked run              | "Two dogs, one run on Friday"            | Choose a run      |
| 20  | **Confused** | Level  | One paw half-raised, brow knitted, ears down at the sides        | A page that has moved or no longer exists                                           | "That page has moved"                    | Go to dashboard   |
| 21  | **Warning**  | Level  | Front paw out flat, pad towards you, brow level. Stop, not scold | A destructive confirmation — beside the warning ink, never instead of it            | "Cancelling this removes all four stays" | Cancel the series |
| 22  | **Error**    | Low    | Shoulders dropped, one paw turned up, mouth flat                 | A whole view that would not load, or a sync that broke. Never a field               | "We couldn't load your board"            | Try again         |
| 23  | **Sad**      | Low    | Ears flat, head lowered, eyes up. Quiet, not pitiful             | A sad record rather than a system fault — a pet marked deceased, an account closing | "Zuri's record is now closed"            | — none            |

Files: `public/mascot/yipyy-mascot-<slug>.webp` plus `-sm`. Slugs: `welcome · presenting · waiting ·
searching · speaking · listening · pointing · reviewing · working · idea · notification · medal ·
celebration · sleeping · success · loading · secure · question · thinking · confused · warning ·
error · sad`.

### Three slots, and only one pose is wide

The pose dictates the slot, not the reverse.

| Slot                 | Poses                           | Notes                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Square 320 × 320** | Twenty-two portrait poses       | The default: card and panel empty states, first run, milestone cards. Shipped at **720 × 720** with the figure at 95% of the box, feet on an 18px baseline, so every square pose sits at an identical height                                   |
| **Wide 400 × 250**   | `sleeping`                      | A curled dog is genuinely wide, and squaring him buys dead air rather than a better image. Shipped at **800 × 500** at the same 95%. He serves a full-width surface — the after-hours board is the widest thing in the product                 |
| **Compact 132px**    | Both shapes · every moment pose | The inline empty (§5d), and the only size a dialog or sign-in panel ever gets. Re-rendered at size, **not** downscaled — fur that reads at 320 turns to noise at 132. Square poses ship at **240 × 240**; `sleeping` has his own **264 × 165** |

- WebP, transparent, 12–112KB. Export at 2× the slot.
- **Crop each source to its alpha bounding box _before_ the contain-fit.** Fitting a landscape source
  into a square canvas bakes the letterbox permanently into the file, and then a wide slot makes the
  figure _smaller_ rather than larger, because the padding scales with the content.
- Consistent framing within a shape: same 95% share of the box, feet on the same baseline. Renders
  that each sit differently in frame make a set that jitters as you move between screens.
- A missing pose **collapses its slot**: headline, body and CTA render with no gap left behind.
  Never a broken-image frame, never a grey box.

### Where he never goes

- **Never the wrong register on a failure.** The old rule was "never on an error", and it was right
  while every pose was warm. Error, Warning, Sad and Confused now exist, so the ban is sharper and
  more useful: a bright pose on a broken sync, a declined payment or a closed record cannot ship.
  Match the register, or use no pose at all.
- **Never instead of the words.** He sits beside the status ink, the glyph and the sentence — never
  in place of them. Delete the image and the surface must still say everything, which is what makes
  it work on paper, in reduced-motion and read aloud. Alt text is empty by design.
- **He needs 96px of clear vertical room.** That is the physical floor, and it settles most cases on
  its own: a row is 48, a toast is 48, a chip is 24, a field's error line is 18. Anything under 96
  takes a Tier 1 glyph — not because a pose would be wrong there, but because it cannot be seen.
  `loading` is a whole view with nothing on it yet, never a button spinner or a row skeleton.
- **Never over data already on screen.** A pose belongs on a surface with nothing on it, or one that
  is entirely about a single moment. Over live rows, a chart or a filled table he stops reading as a
  state and becomes decoration. A filtered empty _is_ an empty surface, so it takes `searching` at
  132 — that reverses the earlier ban.
- **One per view, one hologram per view.** Two poses on one screen is a sticker sheet. Twenty-three
  is a cast, not a palette to decorate with — and the four holographic props never double up, because
  two sets of fake data on one screen read as a toy.
- **`yy-float` does not run on all of them.** It is for the empty-state poses. Not `loading`: that
  surface already has a spinning ring, and one moving thing per view is the rule. Not `error`,
  `warning` or `sad` either — a dog gently bobbing above your failure is glib.
- **Three sizes, and there is no fourth.** 320 square, 400 wide, 132 compact. If a slot wants 64px
  the answer is a Tier 1 glyph, not a shrunken render.
- **Twelve words or fewer, never jokey about a problem.** §5r applies to his copy specifically.
  "Nothing booked for Tuesday" — not "Looks like it's a slow one!" On a failure, plainer still.

## 5d2. Where he appears — the placement map

Twenty-three poses is a cast wide enough to cover the product, and an unassigned pose is a pose
nobody uses. This section is an inventory rather than a permission: every status ink, every state a
screen can be in, and all 36 nav areas, each with the pose that belongs there. The restraint that is
left is physical — §5d1's 96px floor, and never on top of data.

### Status ink → pose

| Status  | Ink       | Pose           | Surface                                                          | Copy                                     |
| ------- | --------- | -------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| Success | `#0F7A52` | `success`      | A confirmation panel after a flow finishes                       | "Kofi is checked in"                     |
| Info    | `#0F58C6` | `notification` | An announcement, a caught-up notifications view                  | "You're all caught up"                   |
| Warning | `#8A5115` | `warning`      | A destructive confirmation, an expiring record, over capacity    | "Cancelling this removes all four stays" |
| Error   | `#B23B3B` | `error`        | A whole view that would not load, a broken sync, a failed import | "We couldn't load your board"            |
| Violet  | `#4C3BB8` | `secure`       | Permissions, two-factor, an access request, an expired session   | "This area needs an owner's approval"    |
| Neutral | `#4C5B6C` | `sleeping`     | Archived, closed, after hours, offline                           | "No overnight stays tonight"             |

### The state ladder

Read top to bottom it is the life of a screen. The four **— none** rungs are the honest boundary.

| State                         | Pose            | Surface                                       | Copy                                         |
| ----------------------------- | --------------- | --------------------------------------------- | -------------------------------------------- |
| First run — no account data   | `welcome`       | Sign-in panel · the front door                | "Let's get your facility set up"             |
| Onboarding · add a pet        | `presenting`    | Step 1 of setup                               | "No pets on file yet"                        |
| Onboarding · connect payments | `secure`        | Step 2 — money and permissions                | "Connect a payout account"                   |
| Onboarding · invite staff     | `pointing`      | Step 3 — the team                             | "You're the only one here so far"            |
| Onboarding · finished         | `celebration`   | The last step                                 | "That's everything set up"                   |
| Loading · first paint         | `loading`       | A whole view with no data yet                 | "Getting your day ready"                     |
| Loading · refresh over data   | **— none**      | Skeletons and the sticky header               | the rows are already there                   |
| Empty · never had data        | the module pose | See the module map                            | the module's own sentence                    |
| Empty · a filter cleared it   | `searching`     | Compact 132, beside the clear-filters action  | "No pets match those filters"                |
| Partial · some data           | **— none**      | Data is present, so it is not empty           | never a pose over real rows                  |
| Confirm · harmless            | `question`      | A reversible dialog                           | "Send Amara the waiver now?"                 |
| Confirm · destructive         | `warning`       | Beside the warning ink, never instead of it   | "Cancelling this removes all four stays"     |
| Conflict · needs a decision   | `thinking`      | A clash panel                                 | "Two dogs, one run on Friday"                |
| Succeeded                     | `success`       | The confirmation panel, never the toast       | "Kofi is checked in"                         |
| Permission denied             | `secure`        | A gated view, or the request panel            | "This area needs an owner's approval"        |
| Session expired               | `secure`        | The re-authentication panel                   | "Sign in again to carry on"                  |
| Not found · 404               | `confused`      | A whole view for a page that moved            | "That page has moved"                        |
| Offline                       | `sleeping`      | A full-view offline state                     | "You're offline — the board is from 14 h 30" |
| Maintenance                   | `sleeping`      | A full-view maintenance state                 | "Back at 6 h 00"                             |
| Failed to load                | `error`         | A whole view or panel. Never a field          | "We couldn't load your board"                |
| A sad record, not a fault     | `sad`           | A pet marked deceased, an account closing     | "Zuri's record is now closed"                |
| All caught up                 | `notification`  | An empty notifications or incidents panel     | "You're all caught up"                       |
| Milestone reached             | `medal`         | A loyalty card, a tenth stay, a review earned | "Zuri's tenth stay with you"                 |
| Field-level error             | **— none**      | 48px of room: ink, glyph, hairline, sentence  | he does not fit and would not help           |
| Toast                         | **— none**      | A 48px strip that leaves in four seconds      | the glyph and the sentence                   |

### All 36 nav areas → pose

Modules that share a pose share a shape of emptiness. That is deliberate: staff learn the pose once
and read the next one instantly.

- `presenting` — Pets · Clients · Memberships · Inventory · Retail
- `waiting` — Bookings · Scheduling · Boarding · Daycare · Grooming
- `searching` — Occupancy board · Kennel runs · every filtered empty
- `notification` — Daily care · Incidents · Notifications
- `speaking` — Inbox · Marketing
- `listening` — Calls
- `pointing` — Staff · Playgroups
- `reviewing` — Digital waivers · Intake forms · Evaluations
- `working` — Reports & analytics · Loyalty reports · Estimates · Payments · Billing · Register · Payroll
- `medal` — Loyalty · Gift cards · Reputation
- `idea` — Automations · Insights · Training
- `celebration` — Tasks
- `question` — Booking requests
- `sleeping` — Pet cams · offline · maintenance · after hours
- `secure` — Settings · Subscription
- `welcome` — Sign-in

## 5e. Data tables — visual only

Every element below maps to a prop `DataTable` **already has**, so this is a restyle, not a migration.

| Visual element    | Existing prop                                 |
| ----------------- | --------------------------------------------- |
| Search field      | `searchKey` / `searchKeys` / `getSearchValue` |
| Filter pills      | `filters[]` · `onFilterClick` + `filterCount` |
| Column chooser    | `columns[].defaultVisible`                    |
| Sort affordance   | `columns[].sortable` · `sortValue`            |
| Sticky header     | `stickyHeader`                                |
| Bulk-select bar   | `selectable` + `selectedIds` + `toolbarExtra` |
| Numeric alignment | `columns[].align: "right"`                    |
| Empty state       | `emptyState{icon,title,description,action}`   |
| Row click         | `onRowClick`                                  |
| Zebra rows        | `zebra`                                       |

Bulk bar sits above the header row on white with a `--primary` hairline. Numeric columns are always right-aligned with
`tabular-nums`. Indeterminate select-all uses a dash, not a tick. A row containing a checkbox or a
menu must **not** also be `role="button"` — your own source comments this as a WCAG
nested-interactive failure.

## 5f. Charts

Series colours are **desaturated** members of the status families, so a series reads as a category
and not as an alert.

```css
--chart-1: #1668e3; /* primary          — first series   */
--chart-2: #4f9e85; /* success family   — second         */
--chart-3: #d9a46a; /* warning family   — third          */
--chart-4: #8d85d6; /* violet family    — fourth         */
--chart-5: #c06a6a; /* error family     — fifth          */
--chart-grid: #e4eaf5;
--chart-axis: #8c99a3;
```

Bars radius 8px on the top corners only. Single-metric trends use `--chart-1` alone.

**Never use the saturated status colours as series colours.** A "Boarding" series in `#D24545` reads
as a problem before anyone reads the legend. The one exception is a chart whose subject genuinely is
good-versus-bad (paid vs overdue) — then use the status colours and say so in the legend.

## 5g. Long labels (French)

Measured from `messages/en.json` (24,887 bytes) and `messages/fr.json` (27,801 bytes): the French
bundle is only **+11.7%** larger overall. That figure is misleading and worth ignoring — the risk is
concentrated entirely in **short labels**, which is exactly what buttons, tabs and column headers
are.

| Key                   | EN          | FR                   | Growth    |
| --------------------- | ----------- | -------------------- | --------- |
| `common.save`         | Save        | Enregistrer          | **+175%** |
| `bookings.newBooking` | New Booking | Nouvelle réservation | +82%      |
| `nav.dashboard`       | Dashboard   | Tableau de bord      | +67%      |
| `common.search`       | Search      | Rechercher           | +67%      |
| `nav.bookings`        | Bookings    | Réservations         | +50%      |
| `checkin.checkIn`     | Check In    | Arrivée              | **−13%**  |

Two things follow. **"Save" is the most common button in the app and its worst case is +175%** — so no
control may be sized to its English label. And growth is **not monotonic**: "Check In" gets _shorter_
in French, so a single blanket multiplier is not a safe substitute for testing against `fr.json`.

| Do                         | Not                       | Why                                                         |
| -------------------------- | ------------------------- | ----------------------------------------------------------- |
| `min-height: 40px`         | `height: 40px`            | a control must be able to grow to two lines                 |
| `min-width` on buttons     | fixed width               | the label decides the width, not the grid                   |
| let headers wrap           | `white-space: nowrap`     | nowrap is for numbers, dates and codes only                 |
| `overflow-x: auto` on tabs | `text-overflow: ellipsis` | a truncated tab is unusable; a scrolling one is not         |
| test against `fr.json`     | assume a growth factor    | growth is not uniform — "Check In" gets _shorter_ in French |

## 5h. Feedback

Toasts: top-right, stacked newest-first, max 3. White card, `--sh-3`, radius 16px, with a white
32px icon circle ringed in the status ink — never a tinted fill anywhere on it. 4s auto-dismiss; 8s when it carries an action; errors
never auto-dismiss. Prefer an undo toast over a confirmation dialog wherever the action is reversible.

## 5i. Overlays

| Kind    | Spec                                                               | Reach for it when                                      |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Modal   | centred · 560/720/960px · radius 24px · `--sh-3`                   | a decision, or a short form                            |
| Drawer  | right edge · 480px · full height · radius 24px on the left corners | a record read or edited while keeping the list in view |
| Popover | anchored · max 320px · radius 16px · `--sh-3`                      | a preview or a short pick — never a form               |
| Sheet   | bottom edge · mobile only · radius 24px top corners                | the mobile drawer. Never on desktop                    |

**Never stack two modals.** A drawer may open a modal; a modal must never open a drawer. Escape
closes the topmost layer only.

## 5j. Destructive actions

Name the object in the title — never "Are you sure?". State what survives, what does not, and
whether it is reversible. The button verb is the title's verb, never "OK". Cancel is the safe default
and takes focus. Destructive fill `--error-dot`, sitting to the right of Cancel.

Type-to-confirm is reserved for irreversible bulk actions. Using it on a single reversible archive
trains people to type without reading.

## 5k. Focus and keyboard

|                    |                                                                    |
| ------------------ | ------------------------------------------------------------------ |
| Focus ring         | `2px solid #1668E3` + `box-shadow: 0 0 0 3px rgba(22,104,227,.12)` |
| Never              | `outline: none` without an equivalent replacement                  |
| Command palette    | ⌘K / Ctrl+K — the real fast path across 36 nav areas               |
| Escape             | closes the topmost overlay only, never the whole stack             |
| Nested interactive | a row with a checkbox or menu must not also be `role="button"`     |
| Tab order          | follows the DOM; never `tabindex` above 0                          |

Palette results are grouped by type with actions last; the selected row is a solid `--primary` with white text, not an
outline.

## 5l. Avatars and imagery

24px (dense rows) · 32px (table rows, threads) · 40px (headers) · 60px (profile headers).

**Pets get photographs, people get initials.** A pet's photo is the fastest identifier on a busy
floor — use it wherever one exists, and fall back to a breed-neutral placeholder, never to initials.
Staff and clients use initials by default; a staff photo only where the person uploaded one.

Initials: white, 1px `--line-2` hairline, `--primary-hover` ink, weight 700, max 2 letters. Photos:
`object-fit: cover` with an `--inset` placeholder while loading. Stacked groups overlap −8px with a
2px `--card` ring.

## 5m. Breakpoints and devices

Three real contexts, not three abstract widths.

| Range      | Context               | Who                                              | What changes                                                                                                                                                                             |
| ---------- | --------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ≤ 599px    | Phone, one-handed     | Floor staff, standing, a leash in the other hand | Sidebar → bottom bar (5 items max) · DataTable → card list of 4 fields · gutter 16px, card gap 10px · tap targets 48px · primary action pinned bottom · modals become full-height sheets |
| 600–1023px | Tablet, check-in desk | Standing, shared device, an owner watching       | Sidebar → 68px icon rail · table keeps 5 columns + overflow menu · two-column forms collapse to one · drawer 420px · density forced to roomy (56px)                                      |
| ≥ 1024px   | Desktop, back office  | Seated, mouse, hours at a time                   | Full 266px sidebar with labels · full table · drawer 480px, modals centred · density is whatever the user saved                                                                          |

**48px on the phone, not 44.** 44 is the accessibility floor for a seated user with a free hand.
Yipyy's phone user is standing, moving, and holding an animal. Those 4px are the difference between
a check-in and a mis-tap.

**The phone shows four fields, and you pick them:** identity (pet + owner), the status chip, the one
time or number that matters, one action. A card carrying nine fields is a table that lost its columns.

**One horizontal scroll, and it must look scrollable.** Tab strips and filter rails may scroll
sideways; a page and a table may not. A scrolling rail needs a visible cut-off — a chip half in view —
never a clean edge that reads as the end of the list.

**A table that will not fit loses columns, it does not scroll.** The budget is seven columns at
≥1024px, five at 600–1023px, four fields on a card below that. Past it, the extra columns move into
a column-picker menu with a persistent per-user preference — the overflow becomes a choice someone
makes once instead of a gesture they repeat on every row. The reason the ban holds even at nine
columns: a sideways-scrolling table pushes the identity column out of view, and identity is the
column that makes the other eight legible.

**The primary action lives in the bottom third.** A primary button in the top-right corner is
unreachable one-handed on any phone over six inches, which is every phone.

**Test at 599px, not at 375px.** 375 is the easy case where everything stacks. 599 is where a
two-column form still thinks it fits and a card list still thinks it is a table.

## 5n. Density

| Mode         | Row      | Cell padding | Avatar | Use                                                         |
| ------------ | -------- | ------------ | ------ | ----------------------------------------------------------- |
| Compact      | 40px     | `8px 14px`   | 24px   | Long lists a manager scans — payments, invoices, audit log  |
| **Balanced** | **48px** | `12px 16px`  | 32px   | **The default.** Everywhere, unless someone chose otherwise |
| Roomy        | 56px     | `16px 16px`  | 32px   | Touch. Forced on tablet and phone regardless of preference  |

- Three things move: row height, cell padding, avatar size. Nothing else.
- Font size never changes — see rule 16.
- Radius never changes: `--r-row` stays 14px at all three.
- It is a per-table preference saved per user, not a global theme.
- Below 1024px the preference is ignored and roomy wins.

## 5o. Layers (z-index)

| Value | Token          | What lives there                                     |
| ----- | -------------- | ---------------------------------------------------- |
| 0     | `--z-base`     | Page content                                         |
| 100   | `--z-sticky`   | Sticky table header, sticky page header              |
| 200   | `--z-nav`      | Sidebar, top bar                                     |
| 300   | `--z-dropdown` | Select, filter menu, popover, search results         |
| 400   | `--z-drawer`   | Right drawer and its scrim                           |
| 500   | `--z-modal`    | Modal and its scrim                                  |
| 600   | `--z-toast`    | Toast stack                                          |
| 700   | `--z-tooltip`  | Tooltip — clears everything, including modal content |

- Gaps of 100 are room to think, not permission to write 301. A new layer earns a token.
- The tooltip outranks the toast because a toast can land on a tooltip's anchor.
- Only one of drawer or modal is open at a time. Two scrims is a bug you can see.
- No component sets its own `z-index`. If it needs one, it needs a token.

## 5p. Motion tokens

| Token     | Value | Use                                                                   |
| --------- | ----- | --------------------------------------------------------------------- |
| `--dur-1` | 120ms | A state change on something already on screen — hover, checkbox, chip |
| `--dur-2` | 180ms | Transform and lift, tab underline, accordion                          |
| `--dur-3` | 220ms | Shadow growth, colour crossfade                                       |
| `--dur-4` | 280ms | Popover and dropdown enter, toast in                                  |
| `--dur-5` | 340ms | Drawer slide, modal scale-in                                          |

| Token         | Curve                           | Use                                             |
| ------------- | ------------------------------- | ----------------------------------------------- |
| `--ease-out`  | `cubic-bezier(.22,.61,.36,1)`   | Anything entering                               |
| `--ease-in`   | `cubic-bezier(.55,.06,.68,.19)` | Anything leaving                                |
| `--ease-std`  | `cubic-bezier(.4,0,.2,1)`       | Anything moving between two on-screen positions |
| `--ease-lift` | `cubic-bezier(.34,1.36,.64,1)`  | The CTA lift, and nothing else                  |

**Enter** — opacity 0→1 with `translateY(6px)`→0, `--dur-4 --ease-out`. Never scale a card up from
small: that reads as a zoom, not an arrival.
**Exit** — opacity only, `--dur-2 --ease-in`. Never animate position on the way out; a row that
slides away makes you doubt which row you clicked.
**List stagger** — 24ms per item, capped at eight. Past 192ms a stagger stops reading as
choreography and starts reading as a slow server.
**Skeleton** — the existing `yy-skel` opacity pulse, 1.4s ease-in-out infinite. No sweeping
gradient: with no tint fills there is nothing to sweep.
**Numbers** — `tabular-nums` lets a count tick in place without reflowing. Never roll the digits.
**Reduced motion** — transitions to 0.001ms, animations off. Keep the opacity crossfade: an instant
swap is still legible, an invisible one is not.

### Ambient motion — the decorative kind

**Ambient is not the same as continuous.** Ambient motion decorates a surface that is doing its job,
and is held to the four patterns and the limits below. A **loading state** replaces a surface that
cannot do its job yet — `yy-skel`, the 1.4s opacity pulse on skeleton rows, loops continuously and
runs on tables, and it is _not_ a fifth ambient pattern: it is not decoration, and it is gone the
instant data arrives. Spinners and determinate progress bars are the same category.

Four ambient patterns, and no fifth without going through §5v.

```css
@keyframes yy-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
@keyframes yy-breathe {
  0% {
    box-shadow: 0 0 0 0 rgba(240, 138, 60, 0.5);
  }
  70% {
    box-shadow: 0 0 0 9px rgba(240, 138, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(240, 138, 60, 0);
  }
}
@keyframes yy-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

| Pattern             | Value                                                        | Where, and only there                                                                                                  |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Float**           | `yy-float 6s ease-in-out infinite`                           | Yipyy. Empty states and first run — screens with no data to distract from                                              |
| **Breathe**         | `yy-breathe 2.8s ease-out infinite`                          | The presence dot. Orange means the live moment, so the one thing allowed to pulse is the mark saying an animal is here |
| **Rise, staggered** | `yy-rise .28s var(--ease-out) both`, 24ms apart, capped at 8 | The only motion allowed on a surface already showing data, because it runs once and stops                              |
| **Lift on scroll**  | `box-shadow` over `--dur-3 var(--ease-std)`                  | A sticky header earns its shadow only once something is behind it                                                      |

- **Never on a surface that is showing data.** No ambient loop runs on a table, calendar, invoice,
  chart or form once it holds real content. Those are surfaces people read and compare, and a moving
  thing beside a number is a thing you re-read to be sure it did not change. The skeleton is not an
  exception — it stands in for the surface before any data exists, and it stops when data arrives.
- **One moving thing per view** — the same budget as orange, for the same reason. Two ambient loops
  on one screen cancel and read as a page that has not finished loading.
- **4px and 2.4s are the ceilings.** Amplitude never exceeds 4px, a period is never shorter than
  2.4s. Faster or larger stops reading as ambience and starts reading as a spinner or a bug.
- **It never carries information.** If every loop froze, nothing would become unknowable. The pulse
  says "live" on top of a badge that already says "Here now" in words.
- **Never on something being read or clicked.** Ambient motion attaches to decorative and status
  marks — Yipyy, a presence dot, an occupancy ring. Never to a label, button, row or value.
- **It stops for `prefers-reduced-motion`.** Nothing above is load-bearing, so the reduced-motion
  view is not a degraded one — it is the same screen, still.

## 5q. Formatting — Canada, bilingual

|                         | en-CA                    | fr-CA                       |
| ----------------------- | ------------------------ | --------------------------- |
| Date, long              | Tue, Sep 1, 2026         | mar. 1 sept. 2026           |
| Date, numeric           | 2026-09-01               | 2026-09-01                  |
| Date, no year           | Sep 1                    | 1 sept.                     |
| Time                    | 2:30 PM                  | 14 h 30                     |
| Stay                    | Sep 1 → Sep 4 · 3 nights | 1 sept. → 4 sept. · 3 nuits |
| Currency                | $42.50                   | 42,50 $                     |
| Currency, disambiguated | CA$42.50                 | 42,50 $ CA                  |
| Thousands               | 1,240                    | 1 240                       |
| Percent                 | 82%                      | 82 %                        |
| Weight                  | 12.4 kg (28 lb)          | 12,4 kg (28 lb)             |
| Duration                | 1h 30m                   | 1 h 30                      |
| Phone                   | (416) 555-0142           | 416 555-0142                |

- **`Intl`, never a format string.** `Intl.DateTimeFormat` / `Intl.NumberFormat` with the real
  locale. A hand-rolled template gets French wrong in ways nobody on an English team will notice.
- **French needs non-breaking spaces.** fr-CA puts a space before `$`, `%` and `:` — and it must be
  `\u00A0`. A plain space lets `42,50 $` wrap so the dollar sign lands alone on the next line.
- **French time is `14 h 30`.** Spaces around the h. Not 14:30, not 14h30. This is the single most
  common French-Canadian formatting error in software.
- **Metric leads, imperial follows:** `12.4 kg (28 lb)`. Canadian vet records are metric, Canadian
  owners speak imperial. One decimal below 20 kg, whole numbers above.
- **Relative time expires at 24 hours.** "in 20 min" and "il y a 2 h" are useful; "3 days ago" for a
  booking is not — past a day, show the date.
- **Some strings are not translatable:** a pet's name, a breed as the owner typed it, an invoice
  number, a run number. Never pass these through the locale layer.

## 5r. Voice

| Write                                                                | Not                           | Why                                                                                          |
| -------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| Check in Kofi                                                        | Submit                        | A button is a verb and it names its object. Nobody is submitting anything                    |
| Send invoice                                                         | OK                            | OK is what a button says when nobody decided what it does                                    |
| No rabies record on file for Zuri — add one to confirm this booking. | An error occurred.            | What happened, then what to do, in one sentence. No code without prose, never blame the user |
| No bookings today — add one                                          | No data found                 | An empty state names the next action, not the absence of one                                 |
| Invoice sent to amara@osei.ca                                        | Success!                      | Confirmation is past tense and specific enough to be checked                                 |
| Zuri is due for a bath                                               | This pet is due               | Use the name wherever the record knows it. This is a pet product                             |
| She hasn't eaten since Tuesday                                       | It hasn't eaten since Tuesday | He/she when the record has a sex, they when it doesn't. Never _it_                           |
| Your bookings                                                        | My bookings                   | Second person for the user. The application has no first person                              |

- Sentence case everywhere — buttons, nav, table columns, modal titles. Title Case is for proper
  nouns and named features only; French title case is simply wrong.
- Numbers under ten are words in prose and digits in data: "three staff on shift", but the cell reads 3.
- Destructive verbs are the real verb — Delete, Cancel booking, Refund. Never _Remove_ for something
  that is destroyed.
- Yipyy's copy is warm, twelve words or fewer, and never jokey about a problem. Empty states only.
- Banned: _simply, just, easy, oops, whoops, uh-oh, please wait, kindly, utilize, leverage_.
- Write the label, then read it in French at its longest real string from `fr.json`. If it breaks the
  layout, the label is the problem.

## 5s. State matrix

| State    | Recipe                                                                                                                                          | Never                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Rest     | As specified                                                                                                                                    | —                                                                            |
| Hover    | Ink darkens one step; raised things lift 2px and their shadow grows                                                                             | Change size, radius, or content width                                        |
| Pressed  | `translateY(0)` with a tighter shadow, background one step darker                                                                               | Move the target out from under the finger                                    |
| Focus    | 2px `--primary` ring at 2px offset, layered on top of whatever hover did                                                                        | Replace hover with it; `outline: none` without a replacement                 |
| Selected | `inset 0 0 0 2px --primary` — a full ring — value steps to `--primary-hover`. A tab strip is the one exception: 2px under the label, per rule 2 | An edge stripe on anything with a radius or a fill. A tint fill              |
| Disabled | `--ink-disabled` label on `--inset`, `cursor: not-allowed`, no hover, no shadow                                                                 | Opacity. Hiding it — a control that is gone cannot be explained              |
| Loading  | Label stays put, a spinner replaces the leading glyph, width locked                                                                             | Swapping the label to "Loading…" — it shifts layout and throws away the verb |
| Error    | 1px `--error` border, an error glyph in the field, message below in `--error`                                                                   | A red fill, a shake, tooltip-only                                            |

Required cells per component (● required · — not applicable):

|                  | Rest | Hover | Press | Focus | Select | Disable | Load | Error |
| ---------------- | :--: | :---: | :---: | :---: | :----: | :-----: | :--: | :---: |
| Button           |  ●   |   ●   |   ●   |   ●   |   —    |    ●    |  ●   |   —   |
| Icon button      |  ●   |   ●   |   ●   |   ●   |   ●    |    ●    |  ●   |   —   |
| Input · select   |  ●   |   ●   |   —   |   ●   |   —    |    ●    |  ●   |   ●   |
| Checkbox · radio |  ●   |   ●   |   ●   |   ●   |   ●    |    ●    |  —   |   ●   |
| Table row        |  ●   |   ●   |   ●   |   ●   |   ●    |    —    |  ●   |   —   |
| Nav item         |  ●   |   ●   |   ●   |   ●   |   ●    |    ●    |  —   |   —   |
| Filter pill      |  ●   |   ●   |   ●   |   ●   |   ●    |    ●    |  ●   |   —   |
| Status chip      |  ●   |   —   |   —   |   —   |   —    |    —    |  ●   |   —   |
| Metric tile      |  ●   |   ●   |   ●   |   ●   |   ●    |    —    |  ●   |   —   |
| Card             |  ●   |   ●   |   —   |   ●   |   ●    |    —    |  ●   |   ●   |
| Dropzone         |  ●   |   ●   |   —   |   ●   |   —    |    ●    |  ●   |   ●   |
| Calendar block   |  ●   |   ●   |   ●   |   ●   |   ●    |    —    |  ●   |   —   |

## 5t. The six components — built

All six are **live in `Yipyy Design System.dc.html`** ("The six components, built") — clickable
picker, drag-responsive dropzone, delayed tooltip, working pagination, typed search with keyboard
nav, and a ⌘K palette. The full spec for each follows.

**Date and range picker** — every booking starts here, and boarding is priced by the night.
Two months side by side ≥1024px, one below. Endpoints solid `--primary` with white text; the span
between is `--inset` with body ink — a neutral, not a tint. Blocked days keep their number in
`--ink-disabled` with a strikethrough, never hidden — a missing day looks like a bug. A day at
capacity carries a 7px `--warning-dot`. Preset rail: Today, Tomorrow, This week, Next week, This
month. Under the field, the count that matters: "Sep 1 → Sep 4 · 3 nights".

**File dropzone** — seven document types run through it and there is no pattern at all today
(vaccination records, waivers, pet photos, vet notes, invoices, grooming before/after, ID).
Idle: 1.5px dashed `--line-strong`, radius 24px, min-height 148px, a 28px `upload_file` glyph in
`--ink-tertiary`, "Drop files or browse", then accepted types and max size. Drag-over: solid 2px
`--primary`, background stays white — no tint. Uploading: a file row with a determinate 3px
`--primary` bar. Failed: `--error` border and a retry link — never remove the row, a file that
vanished is a file nobody re-uploads. File row 56px: a 40px type glyph on `--inset`, name at 15/600
truncating **in the middle** (filenames end in the part that matters), size and date in
`--ink-tertiary`, download and delete.

**Tooltip** — icon-only buttons are already shipping without labels. **The 400ms delay lives in a JS
timer, not a CSS transition delay.** `transition: opacity .12s ease .4s` looks equivalent and is not:
it delays the close by 400ms too, and CSS cannot open a tooltip on `:focus` of a _sibling_ at all —
showing a descendant from a parent's hover needs a descendant selector, which inline styles cannot
express. So it is state-driven: `onMouseEnter`/`onFocus` start a 400ms timer that flips a flag,
`onMouseLeave`/`onBlur` clear it immediately. That is the only mechanism that satisfies both the
timing and the keyboard requirement. The tooltip itself is `aria-hidden` and the button carries the
same text as an `aria-label`, so it is announced once, not twice. `--body` fill with white text
(17.25:1 inverted, and the only other light-on-dark surface besides the code panel), 12.5/500,
radius 10px, pad `7px 10px`, max-width 260px, 6px offset. 400ms open delay, 0ms close.
Keyboard-reachable on focus. Never the only source of a piece of information. There is no hover on
touch: below 1024px the same content becomes a help button opening a popover.

**Pagination** — 412 bookings do not fit on one screen and infinite scroll loses your place.
36px full pills; current page solid `--primary` with white text, siblings white with a
`--line-strong` hairline. Ellipsis is non-interactive `--ink-tertiary`. Left: "1–25 of 412" in 13px
tabular `--ink-tertiary`. Right: a rows-per-page pill — 25 · 50 · 100. On a phone: prev and next
only, plus "Page 3 of 17".

**Search with results** — staff know the pet's name and nothing else about where the record lives.
40px pill, leading search glyph, a clear button once filled, 220ms debounce. Results popover grouped
by type, each group under a 12/700/.07em uppercase `--ink-tertiary` label. The matched substring is
`--primary-hover` at weight 700 — a weight change, never a highlight fill. ↑ ↓ to move, Enter to
open, Esc to close, and the input keeps focus throughout. Empty: "No matches for kofi" and the one
broadest thing to try next.

**Command palette** — 36 nav areas is more than anyone will click through twice. ⌘K and Ctrl+K.
620px wide, radius 24px, `--sh-3`, pinned 15vh from the top. A 44px borderless input at 17px, then
44px rows: glyph, label, and a right-aligned `--ink-tertiary` breadcrumb of where it lives. Sections
in order: Actions, Recent, Go to. Palette verbs are the button verbs — if the button says "Check in
Kofi", so does the palette. A destructive action may appear, but it opens the confirmation; it never
fires from the palette.

## 5u. Print

**Invoice** — Letter, portrait, 18mm margins. Mark 28mm wide top-left, the business block
right-aligned opposite it. Everything in `--body` on white; status becomes a bordered word, never a
chip. One 1px hairline above and below the header row — no zebra, it prints as bands and costs ink.
Totals right-aligned and tabular, the grand total at 15/700 with a rule above it. A footer on every
page: invoice number, page x of y. No background fill, no white-on-dark, no QR code over 22mm.

**Run card** — 4×6in, landscape, one per pet. The pet's name at 34pt/700, legible at arm's length by
someone holding a leash. Photo 32mm square top-right, so staff match the dog to the card without
reading. Run number, owner and phone at 14pt, check-out date. Feeding: amount, times, own food yes or
no. Medication in a 1.5pt box — it is the one thing that must never be missed, so it is the one thing
with a border. Behaviour flags as words in a 1pt box, never a coloured dot, which prints as a speck.

**Board sheet** — Letter, landscape, the day's occupancy. Runs down the left, pet and status across.
8pt floor — this one is read on a wall, not in a hand. Fits 40 runs; past that, page 2 repeats the
header row. Status as a two-letter code plus a legend at the foot of the page. One hairline grid at
0.5pt. Nothing filled.

Every print stylesheet:

- `@page { size: letter; margin: 18mm }` — and `print-color-adjust: exact` on the mark only.
- Hide the nav, the toasts, and every interactive affordance. A printed button is a lie.
- Expand every truncation. There is no hover on paper, so an ellipsis is information destroyed.
- 12pt floor for anything read standing up; 8pt only for a wall sheet at arm's length.
- Nothing on the page may depend on a fill or a colour to be understood — see rule 17.

## 5v. Governance

1. **A new colour needs a job no existing token does.** Write the job as one sentence. If the
   sentence contains "similar to" or "a bit lighter than", the answer is no. Then compute the ratio
   against the surface it will actually sit on, at the size it will actually be, and put both
   numbers in its row.
2. **A new component needs three real uses.** Two places is a pattern. Three is a component. With
   fewer than three it is a variant of something that already exists, and should be built as one.
3. **A variant is named for when, not for how it looks.** `destructive`, not `red`. `on-dark`, not
   `light-text`. A name that describes appearance is a name that lies the first time the appearance
   changes.
4. **Every component ships with its row in the state matrix** — all eight cells answered, required
   or not applicable. An unanswered cell is how a button ends up double-submitting in production.
5. **Every component ships with its longest French label**, taken from `fr.json`, not invented. A
   component that has only been seen in English has not been tested.
6. **Deprecate, never delete.** Mark the token `/* deprecated 2026-09-01 — use X */` and keep it one
   release. A token removed the same day is a screen broken in a corner nobody opens until a
   customer does.
7. **Version the token block, not the components.** A changed value bumps v1 → v1.1, and the header
   carries the version and the date. Components move on their own; the palette is the contract.
8. **One owner per section.** Ambiguous ownership is the reason design systems fork into two systems
   that are 90% the same.
9. **Before commissioning a custom glyph, search the library's own icon list — not the app's
   imports.** What the codebase imports is what someone reached for; it says nothing about what
   exists. lucide 0.475 ships 1,756 glyphs, and two of the eight originally drawn for §5b1 were
   already in it. Enumerate `Object.keys(lucide.icons)`, search the near-synonyms, and record the
   closest candidate plus the reason it was rejected in the glyph's own row. "No library has this"
   is a claim somebody spends money on.
10. **When the product and the system disagree, the system loses once.** Ship the exception, log it.
    If the same exception comes back a second time it was never an exception — it is the rule, and
    the system changes. A system nobody is allowed to change is a system nobody uses.

## 6. Hard rules

1. **Orange is a surface and never an ink — no exceptions — and it marks the animal, never an action
   or a state.** `#F08A3C` is 2.50:1 on white, so it never sets words and never sits under white
   text. It is always the fill, and the ink on top of it is always body ink `#0A1B33` at **6.90:1**.
   Sanctioned: solid accent buttons and badges, the 2px ring on every pet avatar, capacity and
   occupancy fills, the now-line, 7px dots, and a solid badge on `--panel-dark` `#0E3A5C`. Orange
   words on a dark panel pass at 4.70:1 and are **still banned** — on dark, white carries every word
   and orange is a solid element. Never any orange element on `#0A1B33`: near-black gives the accent
   no hue to relate to and the pair reads as hazard tape. Where words themselves must read as orange
   they are `#8A5115` on white (6.43:1), with no fill behind them.
   **Budget: repetition is free, competition is not** — forty ringed avatars down a list is one
   idea; rings plus an unrelated orange badge is one too many. It never becomes an action or a state; that is
   the whole guardrail.
2. **No accent line on any edge — not left, not bottom, not any, with one named exception.**
   `border-left`, `border-bottom`, `border-top` and `border-right` accents are one mistake wearing
   four hats: a stripe pinned to one side of a rounded container squares off two corners, flips side
   in RTL, and reads as a progress bar that never fills. Applies to rows, cards, tiles, list items,
   calendar blocks and every selected state. **The exception is a tab strip** — an open rail with no
   radius, no fill and no border box, where the 2px line sits directly under the label it belongs to.
   None of the three failures can occur there: no corner to square, nothing to mistake for an
   unfilled bar, and the line is centred on its label rather than pinned to a side, so it does not
   flip. The test is mechanical: **if the thing has a radius or a background, it is not a tab strip
   and the ban applies.** Everywhere else, signal state with weight, ink, a full 2px ring, or a solid
   fill — a ring is the whole container, so it survives reflow and reorder. The three sanctioned replacements, at the
   values §5s specifies: **selected** is `box-shadow: inset 0 0 0 2px var(--primary)` with the value
   stepping to `--primary-hover`; **focus** is `0 0 0 2px var(--card), 0 0 0 4px var(--primary)` —
   2px at 2px offset, layered on top of hover rather than replacing it; and **weight plus a step of
   ink** (`font-weight: 700`, meta from `--ink-tertiary` to `--ink-secondary`) is enough on its own
   for hover and for "this row changed" — it invents no colour and survives print. Never a tint fill
   for any of them, and never an orange dot: orange marks the animal, not a row's state.
3. **One `transition` declaration per inline style.** A second one silently overwrites the first.
4. **No tint fills, with exactly two exceptions, both measured.** This rule was rewritten three
   times on 2026-09-04 — the wash removed, the marks tinted, the wash restored on the client's call —
   so it is worth stating as the settled position rather than as a diff.

   (a) A **metric or filter tile** carries the §tiles wash: `linear-gradient(135deg, <wash> 0%,
#FFF 58%)` from `#EDF2FE` / `#E9F8F2` / `#FDEFF3` / `#FDF7E6` / `#F4EFFE`. Body ink measures
   15.30–16.12:1 on these against 17.25:1 on white, so the wash is decoration at no cost. Two
   conditions: it stays near-white, and the tile label steps to `--ink-secondary` `#4C5B6C` because
   `--ink-tertiary` is 4.32:1 on the wash. The tile's 40px disc stays a **solid** ink under a white
   glyph — a pale disc on a pale tile does not read.

   (b) A **status chip** takes a flat `--wash-*` fill with the saturated ink on top and no border.
   That is a different treatment for a different object: a chip is a small mark inside a white row,
   where a pale fill is what makes it legible without shouting; a tile is a large surface that
   already carries a wash, so the mark on top has to be the dark half of the pair. Same two values,
   opposite roles, decided by what sits behind them.

   Pages and cards are white, always. Callouts stay white too.

   The reason is measurable rather than aesthetic. A 40px disc filled with a TEXT-weight ink is dark
   by construction — those values exist so words clear 4.5:1, which forces them to `#8A5115` (a
   brown), `#0F7A52` and `#4C3BB8` — and as a large solid they read heavy. Inverted, the same pair
   is luminous and measures BETTER, since a glyph needs only 3:1: violet 7.09:1, warning 6.00:1,
   info 5.80:1, error 5.25:1, success 4.88:1, primary 4.54:1, neutral 6.33:1.

   The old rule read as follows, and the first half of it still holds. White, or a solid.
   A metric or filter tile used to be allowed a near-white gradient in its badge's hue —
   `linear-gradient(135deg, <wash> 0%, #FFF 58%)` from `#EDF2FE` / `#E9F8F2` / `#FDEFF3` /
   `#FDF7E6` / `#F4EFFE` — and it was genuinely measured: body ink held 15.30–16.12:1 on those
   washes against 17.25:1 on white, so it cost no contrast. It was retired anyway, on the product
   owner's call, when the surface family went neutral: the brief was a platform with **no tinted
   surface anywhere**, and a tile is a card section like any other. Nothing was lost from the tile,
   because the tone was never carried by the wash — it is carried by the 40px solid badge beside
   the label, and the wash was a second, quieter copy of the same signal. The `--wash-*` values are
   kept in `globals.css` so restoring this is one edit rather than a re-derivation. Chips, badges
   and callouts were always white and still are — that is the case this rule was written against,
   where a tint costs real contrast (green on its own tint is 4.85:1).

5. **Status is dark ink on white**, with a 1px hairline of that same ink — never a tint fill, and
   never white on a _dot-weight_ colour (`#18A66E` is 2.28:1). Solid fills use the ink, not the dot.
6. **Every `fr`/fixed grid column needs `minmax(0, …)`**; flex children need `min-width: 0`.
7. **Never put a template hole in a fetching attribute** (`src`, `url()`) — the preload scanner
   requests the literal text. Use `data-src` and assign after mount.
8. **Two columns wrap before one column starves.**
9. **On a solid block, the fill carries the status — not the text.** Calendar blocks are the one
   place a status must dominate, so they fill solid with the status ink and set their copy in
   white — 8.00:1 on `#4C3BB8`, 5.35:1 on `#0F7A52`. The status chip inverts to white with the
   ink as its label. Block copy never restates the status in words; the fill, chip and dot
   already say it, and block text is 11.5–13.5px.
10. **Opacity is never a de-emphasis tool for text.** Container opacity silently rewrites every
    ratio in the subtree. `#677382` is 4.83:1 at full strength but composites to `#A1A8B2` —
    **2.40:1** — at `opacity: .62`, below even the 3:1 large-text floor. De-emphasise by changing
    the colour to a token that passes on its own. Opacity is for non-text surfaces only.
11. **Minimum tap target 48px on phone and tablet.** 44px is the accessibility floor for a seated
    user with a free hand; Yipyy's floor staff are standing and holding an animal.
12. Always honour `prefers-reduced-motion`.
13. **A dot-weight ink is never a text colour.** `-dot` values are for 7px dots only — `#F08A3C`
    is 2.50:1, `#D24545` 4.49:1, `#18A66E` 2.28:1. Words use the text-weight partner: `#8A5115`,
    `#B23B3B`, `#0F7A52`. `--ink-disabled` (2.92:1) likewise never carries informational text.
14. **Hover is not an affordance.** There is no hover on the tablet or the phone, and those are two
    of the three contexts this product runs in — a row action revealed on hover does not exist for
    two thirds of the product. Make it persistent, or put it behind a visible overflow button.
15. **Never write a numeric date as MM/DD or DD/MM.** Canada uses all three orders in practice, so
    `09/01` is genuinely ambiguous to a Canadian reader — and this is a boarding product, where the
    wrong month is a dog in the wrong week. Long form (Sep 1, 1 sept.) where there is room, ISO
    `2026-09-01` where there is not. ISO also sorts, which no other format does.
16. **Density changes row height. It never changes font size.** Compact, balanced and roomy move the
    row, the cell padding and the avatar — nothing else. Type that resizes when you switch screens
    reads as a rendering bug, and it re-breaks every French label you already measured.
17. **On paper, every colour drops out except the mark.** Office printers lie about colour: a status
    tint prints as grey mush and a 7px dot prints as a speck. A printed status is a bordered word, a
    printed table has one hairline under its header and no zebra, and nothing on the page depends on
    a fill to be understood. The logo is the single exception, and the only place
    `print-color-adjust: exact` belongs.
18. **A state a component does not implement is a bug, not a decision.** Every component owns its
    row in §5s. A button with no loading state double-submits, an input with no error state fails
    silently, a row with no focus state is unreachable by keyboard. Undefined cells are where design
    systems rot.

## 7. Assets

### The mark — three inks, none of them a UI token

Sampled from the master artwork. `yipyy-logo.svg` is `public/transparent-logo.svg` with each path
group set to its real ink and a tight viewBox (`36 276 950 480`).

| Element                        | Ink       | Notes                                         |
| ------------------------------ | --------- | --------------------------------------------- |
| Wordmark (5 letterforms)       | `#4AA2E2` | Lighter than `--primary` on purpose           |
| Dot over the i                 | `#ED964F` | The only orange in the mark — 2.31:1 on white |
| Dog (ear, muzzle, p descender) | `#064266` | The head is a knockout to white               |

**Logo values are not UI values.** `#4AA2E2` under white text is **2.78:1** and would fail outright
as a button. `#064266` is a _more saturated_ blue than `--heading`, not a darker one — 10.61:1 on
white against `--heading`'s 11.81:1. The gap between the mark and the interface is deliberate; do
not align either side to the other.

- Photography: `public/dogs`, `public/cats`, `public/people`, `public/rooms`, `public/services`.
- Yipyy the mascot: twenty-three poses in `public/mascot/` (§5d1) — empty states, onboarding and the
  nine moment poses; never working chrome. Files are `yipyy-mascot-<pose>.webp`; the `-mascot-` segment stays so the character
  is never confused with the product in an asset path.
- Icons: `lucide-react`, already shipped — the full named map is §5b1. The reference page renders
  the real lucide set at the system's stroke. Six custom glyphs (§5b1) have no adequate library
  equivalent and need drawing; the 3D render tier is brand-only and never enters working chrome.

## 8. What this replaces

The old token set failed WCAG AA on every light-mode brand surface: primary button 2.77:1, success
2.28:1, accent 2.26:1, logo orange on white 2.70:1. It also carried six hardcoded gradients and a
glass-morphism treatment that ignored the theme, and a 14px base radius applied uniformly to a
data-dense admin product. None of that carries forward.
