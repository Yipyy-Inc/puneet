# Work order — adopting the Yipyy design system

**ALL TWELVE ARE DONE** — the eleven stages plus **8b, the form controls** (0–7 on 2026-09-03;
8, 8b, 9, 10 and 11 on 2026-09-04). Stages 4, 7, 10 and 11 grew gates; stage 7's was corrected in
8b's change.

**What is left is not a stage.** Four ratchets hold real per-item work that no single edit can do:
374 colour-only badges (§3), 41 hover-revealed controls (rule 11), 534 hardcoded locales (§5q), and
the three §5u print documents — invoice, run card, board sheet — which need their own page setup
and belong with the screens that own them.

The gap that sat outside the eleven — `Input` — was closed on 2026-09-04 as **stage 8b**, below,
after the product owner chose to do the whole form family at once rather than defer it.

The stage headings below carry the same status, and they are the record — a stage that shipped
without its heading being updated is how this file drifted from the repo once already.

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
- `public/yipyy-mascot.png` was still present here; stage 3 repointed its one consumer and
  **deleted it** (2026-09-03).

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

## Stage 1 — tokens in `@theme` · §1, §2, §3, §4 · **DONE 2026-09-03**

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

## Stage 2 — the empty-state choke point · §5d, §5d1, §5d2 · **DONE 2026-09-03**

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

**Done — 2026-09-05. Both halves hold, and one of them needed a decision the map does not cover.**

- Every `emptyState={{…}}` names a pose: **80 call sites across 51 files**, not the ~28 estimated
  here. Enforced by the type system rather than by a grep — `pose` is the `YipyyPose` union, so a
  typo or an invented name fails `bun run typecheck`.
- A filtered table shows `searching` and an unpopulated one shows its module pose. Confirmed by
  rendering both in the real app against the real CSS (a scratch route, since no table in the shared
  database happened to be empty), plus the compiled output: `@keyframes yy-float` at 4px/6s,
  `.yy-cta` carrying **one** `transition` declaration with §4's exact values, and both
  reduced-motion guards.

**§5d2 does not cover most of these call sites, and that is worth knowing before stage 3.** The map
assigns a pose to all 36 **facility** nav areas. Of the 80 call sites, roughly 70 are the **platform
super-admin portal** — compliance tooling, system health, audit logs, merchant applications, churn
reports, feature flags — which has no rows in §5d2 at all. So "no judgement calls, every one of the
36 nav areas is already assigned" was true of the facility portal and not of the app.

Nothing was invented to close that: no new pose, no new size, no new rule. Each of those surfaces
was assigned **by analogy to §5d2's own categories**, and the reason for every group is recorded in
the commit — `secure` for settings/security/compliance, `notification` for an empty alert list (the
ladder's own "all caught up" rung), `working` for reports and money, `reviewing` for review queues
and audit logs, `speaking` for ticket queues and announcements, and so on.

**Two calls in there are worth a design owner's eye rather than a maintainer's**, and neither is
load-bearing: within `SecurityManagement.tsx`, "No failed login attempts" and "No security alerts"
are arguably the ladder's `notification` rather than the module's `secure` — the file was kept
uniform on `secure` because per-file consistency is easier to review than a split, and either
reading is defensible. And `knowledge-base` took `speaking` (Marketing-shaped, outbound writing)
where `reviewing` would also fit. **The real fix is upstream: §5d2 should gain rows for the platform
portal**, at which point these become lookups instead of analogies.

---

## Stage 3 — the four route-level states · §5d2 state ladder · **DONE 2026-09-03**

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
reads correctly. — **Met.** Verified in a browser at 1280 and at 599 (§6 rule 7), and by deleting
every `<img>` on the page and re-reading it: glyph, ink, heading, sentence and action survive with
no gap left behind.

**What shipped, beyond the four files.** The surface is one component,
[`src/components/ui/route-state.tsx`](../../src/components/ui/route-state.tsx), built to the
reference page's own rendered "a whole view that failed" panel. Three things it uncovered are
recorded here because they were invisible to every gate:

1. `--color-body` shadowed `--text-body`, so §1's body type step generated no utility at all. The
   ink is now `--color-body-ink`.
2. `tailwind-merge` reads any unknown `text-*` class as a COLOUR, so putting a §1 type step in a
   `cn()` silently DELETED the ink beside it — a primary pill shipped with near-black type on
   `#1668E3`. `cn` now names the scale (`src/lib/utils.ts`); keep that list in step with `@theme`.
3. `transition-all` in shadcn's Button base was overriding `yy-cta`'s §4 transition on every CTA in
   the app, stage 2's 80 empty states included. `yy-cta` is now specificity 0,2,0.

**Three §5v questions this stage could not answer from the four sources** — each is one line to
change if the answer differs:

- **No glyph owns "permission denied."** §5b1's map has 32 nav areas, 20 actions, 18 objects and 8
  statuses, and none of them mean restricted. `lock` is used, which collides with nothing.
- **No ink is assigned to a 404 or to a first-paint load.** The status-ink map covers six statuses;
  `confused` and `loading` are on the state ladder but not in it. Neutral `#4C5B6C` and `--primary`
  respectively.
- **The map and the reference page disagree on the retry glyph.** icon-map.json says `refresh-cw`;
  the rendered failed-view panel draws `rotate-ccw`. `refresh-cw` is used, because "one glyph per
  meaning" is the rule the map exists to enforce and `rotate-ccw` would be its synonym.

And one asset observation, for the design owner rather than for code: the shipped
`yipyy-mascot-error` render reads level-to-pleasant rather than the **low** register its own
character sheet assigns it — `confused` is visibly the sadder of the two.

---

## Stage 4 — StatusBadge · §status chips, §3 · **DONE 2026-09-03**

- White surface, 1px hairline in the same ink as the label, ink text, **glyph mandatory** (colour-blind
  safety), pill radius. No tint fill, no white-on-saturated.
- One glyph per status from §5b1 — no synonyms.
- Calendar blocks are the one place a status fills solid; copy goes white there.

**Done when:** `rg "bg-(emerald|red|amber|blue|violet|slate)-(50|100)"` returns nothing, and every
badge has an icon.

**What was met.** `StatusBadge` is rebuilt on §3: white, a 1px hairline in the same ink as the
label, full pill, 26px, 13/600 sentence case, and a mandatory 16px lucide glyph on every value.
Measured in the browser rather than eyeballed — the six inks come back exactly `#0F7A52`,
`#0F58C6`, `#8A5115`, `#B23B3B`, `#4C5B6C`, `#4C3BB8`. `badge.tsx` gained the six §3 chip
variants; the four solid ones stay, because §3 allows a status to be filled solid with the ink at
full strength and since stage 1 those fills are the real inks (5.35–6.50:1 under white), not the
dot-weight colours rule 4 bans.

**What it replaced was a real accessibility defect, not a style.** The old component signalled with
a 6px COLOURED DOT and nothing else — emerald active, red suspended, amber pending. §3's anatomy
table says why that cannot ship: "1 in 12 men cannot separate the green from the orange."

**Neither half of the done-when above survived contact, and both were wrong rather than unmet.**

1. **The tint grep measures nothing now.** It was written before stage 1, which remapped every
   `-50`/`-100` step to `var(--card)`. `bg-emerald-100` has rendered WHITE since then. Its ~3,250
   remaining hits across ~740 files are dead class names, not tint fills — clearing them is a
   rename with no visual change and a 740-file merge cost against `main`. **Not done, deliberately.**
   The note now in CLAUDE.md § "The guardrail greps" says how to read a hit.

2. **"Every badge has an icon" cannot mean all 1,946 of them.** Two thirds carry no status colour
   at all — a service tag, a count, an overflow `+2`. Colour is not their channel and §3's rule does
   not bite. The set that matters is the colour-coded ones, and it measures:

   | Badge elements | colour-coded, has glyph | colour-coded, NO glyph | not colour-coded |
   | -------------- | ----------------------- | ---------------------- | ---------------- |
   | 1,947          | 275                     | **374**                | 1,298            |

   Those 374 sit in 224 files, most holding exactly one. There is no mechanical transform: picking
   the glyph means knowing what the badge means, §5b1 allows one glyph per meaning, and a wrong
   pick is worse than the omission. So it is 374 judgements, and it is now a **ratchet** —
   `bun run check:badge-glyph`, frozen at 374, in CI. A new colour-only badge fails the build;
   fixing some prints an instruction to lower the baseline. Same shape as
   `check:inert-permissions`, and for the same reason: a defect nobody counts only grows.

   **The first version of that gate was wrong, and how it was caught is the point.** Its glyph
   regex ran over the whole element including the opening tag, where `<[A-Z][A-Za-z0-9]*s*className`
   matched `<Badge className` — so every badge coloured by a utility class counted as already
   having a glyph. It reported a tidy 280 and **passed a deliberately planted violation on its
   first trial run.** The real number is 94 higher. A gate is not verified by being written and
   going green; it is verified by being watched to fail. That is the `test:sql` lesson of
   2026-08-22 in a different costume.

**A token was added and then withdrawn, and the withdrawal is the finding.** §3's chip label is
"13 / 600", a step §1's seven-rung scale does not carry, so `--text-chip` went into `@theme`. It
came straight back out, because 53 places in this repo already hand-write `text-[13px]`: the moment
a token claims that value, `better-tailwindcss/enforce-canonical-classes` offers to rewrite every
one of them to `text-chip` — **57 warnings, all autofixable**, against a 276 baseline. Both ways of
holding the token were bad:

- **compound** (13/600, matching every other step) — `bun run lint:fix`, a documented command in
  AGENTS.md, would have silently emboldened 57 pieces of unrelated body copy, because the token
  carries a weight those sites never asked for. A fixable warning whose fix is wrong is worse than
  no token at all.
- **size-only** — the autofix becomes a true no-op (verified by compiling: `text-chip` and
  `text-[13px]` emit byte-identical CSS), but the noise gets _worse_, 30 warnings to 57, and
  `text-chip` ends up as the name for ordinary 13px body text.

A token exists to be shared, and this one had exactly one consumer. `badge.tsx` writes
`text-[13px] font-semibold` directly — §3's value at §3's weight, in the one place §3 applies it —
and the warning count is back to the 276 baseline. The reasoning is parked in `globals.css` where
the token used to be, because the next person will reach for it too. **If a second component ever
needs this step, add the token and fix all 53 hand-written sites in the same change**, or the trap
comes back.

**One §5v question, the same shape as stage 3's.** §5b1's status list has no glyph for **Overdue** —
`triangle-alert` there means Incidents (a nav area) and `circle-x` is already cancelled.
`circle-alert` is used, which is what the reference page itself draws for a view that failed.

---

## Stage 5 — Button · §controls, §4 · **DONE 2026-09-03**

- Full pill. 40px default, 48px `prominent`, 48px minimum below 1024px. Square icon buttons → circles.
- Primary: `--primary` fill, white text, rest `0 14px 26px -16px rgba(22,104,227,.85)`, hover
  `translateY(-2px)` + `0 16px 30px -16px`, active `translateY(0)` + tighter.
- **One `transition` declaration per style**, exactly: `transform .18s ease, box-shadow .22s ease,
background .18s ease`. Honour `prefers-reduced-motion`.
- Destructive uses `--bad` `#B23B3B`, never the dot-weight `#D24545`.
- Never an orange button, except a first-run brand moment.

**Done when:** every CTA visibly lifts on hover, and no style attribute carries two transitions.
— **Met.** One cva restyles all 3,774 buttons across 959 files; no call site was edited.

Measured in a browser at 1280 and 599, every variant, every state:

|             | rest                  | fill                            | ink       | transition                          |
| ----------- | --------------------- | ------------------------------- | --------- | ----------------------------------- |
| primary     | `--sh-cta`, lifts     | `#1668E3`                       | `#FFFFFF` | transform · box-shadow · background |
| destructive | `--sh-cta-bad`, lifts | `#B23B3B`                       | `#FFFFFF` | transform · box-shadow · background |
| outline     | `--sh`, lifts         | `#FFFFFF` + 1px `--line-strong` | `#0A1B33` | transform · background              |
| subtle      | flat                  | `--inset`                       | `#4C5B6C` | background                          |
| ghost       | flat                  | transparent                     | `#677382` | background                          |
| disabled    | flat                  | `--inset`                       | `#8C99A3` | —                                   |

40px everywhere, **48px below 1024px** (§1's own breakpoint, and rule 7's
standing-staff tap target), 48px for `prominent`, icon buttons 40×40 circles,
full pill, 14.5/600. Verified at 599px: every control is 48.

**The destructive fill is the one place the sources contradicted each other.** §5's prose says
`--error-dot` (`#D24545`); the rendered page says `var(--bad)` (`#B23B3B`). The page wins, and it
is also the only one that can carry a label — white is 4.49:1 on the first and 5.86:1 on the
second. The dot-weight colour survives where it is legal: in the shadow, which is not text.

**Loading is a new state, and §5s required it all along.** Hard rule 9: "A button with no loading
state double-submits." `<Button loading>` disables the button, sets `aria-busy`, and puts a
spinner in the leading glyph's slot — the caller's own icons are hidden while `data-loading` is
set, so the spinner REPLACES the glyph rather than joining it. Width delta measured at **0px** for
a button that had a glyph; a button with no glyph grows 28px, which is the honest limit and is
documented on the prop. A loading button is disabled but deliberately does NOT wear the disabled
fill — that is a different cell of §5s.

**`size="sm"` is now 40px, and that is the largest visual change in the stage.** §1 has ONE control
height; there is no small button in this system. 1,698 call sites pass `sm`, so the key is kept and
resolves to `default` rather than editing 1,698 files — a documented compatibility shim, not a
second size. Every one of those buttons grew from 32px to 40px. Checked on real screens
(bookings, facilities) at desktop; nothing broke, and the toolbars simply got taller.

**One bug, and only running the app could find it.** `{spinner}{children}` is an array of two
children even when the spinner is `null`, and Radix's `Slot` calls `React.Children.only` — so
every `asChild` Button threw at render, 591 `variant="outline"` among them. Typecheck was clean.
The bookings page rendering stage 3's error state was the only symptom. Fixed with a ternary that
hands `Slot` the bare children, and the reason is written at the call site.

---

## Stage 6 — metric and filter tiles · §tiles · **DONE 2026-09-03**

`StatCard.tsx`, `ClickableStatCard.tsx`, `delta-badge.tsx`, `src/app/dashboard/_components/business-health-tiles.tsx`.

- Radius 24px, 1px `#E4EAF5`, 18px padding, near-white wash
  `linear-gradient(135deg, <wash> 0%, #FFF 58%)` from the measured set.
- Colour lives in a 40px solid icon badge. Label 12/700/.07em uppercase with `min-height: 2.6em`
  so a wrapping French label never displaces the figure. 30px/700 tabular value, one 13px sub-line.
  Tile label steps to `#4C5B6C` on the wash.
- Selected `inset 0 0 0 2px #1668E3`; applied solid `#1668E3` with white text, one at a time.
- **No edge line, ever** — the bottom accent these had is the banned pattern on a different side.

**Done. Measured in a browser, every value:** radius 24px, padding 18px, 1px `#E4EAF5`, the five
washes exact (`#EDF2FE` `#E9F8F2` `#FDEFF3` `#FDF7E6` `#F4EFFE`), 40px solid badges at
`#1668E3` `#0F7A52` `#B23B3B` `#F08A3C` `#4C3BB8` `#8A5115` — body ink on the orange one —
label 12/700 with `letter-spacing: 0.84px` and `min-height: 31.2px` (2.6em), value 30/700 tabular,
selected `inset 0 0 0 2px #1668E3` with label and value at `#0F58C6`, applied solid `#1668E3` on
`--sh-cta`.

**The file list above was incomplete, and the omission was the whole stage.** It names `StatCard`
(20 consumers) and `ClickableStatCard` (4) but not `src/components/facility/dashboard/kpi-tile.tsx`
— which **65 files** use and which carried every defect §tiles names: the bottom accent bar on the
active state, dashed rules above the trail and the link, multi-hue gradient badges, a `halo`
gradient at opacity behind everything, a 10px label and a 20px value.

**`amber` does not map to orange, deliberately.** In this app that tone labels "Escalated",
"Overdue invoices", "Paused", "Drafts" — states — and §2b's guardrail is that orange is the animal
and "never becomes an action or a state". It resolves to the WARNING family; orange ships as its
own opt-in `brand` tone for §2b's territories, so nothing inherits it by accident. The reference
page's one orange tile, "Trials expiring · 7 days", is a countdown, which is §2b's "now".

**Two bugs found by measuring rather than looking, both older than this stage:**

1. **`.shadow-card` was unlayered CSS and beat every Tailwind shadow in the app.** Four
   hand-written classes from the old system sat outside any `@layer`, and unlayered rules win over
   layered ones whatever the specificity — so `--shadow-card`, added in stage 3, **had been inert
   since the day it landed**, and any `shadow-[…]` on an element that also carried `shadow-card`
   silently did nothing. Measured: a rest tile computed
   `rgba(0,0,0,.04) 0 1px 3px, rgba(0,0,0,.06) 0 4px 12px` where §1's `--sh` is
   `0 1px 2px rgba(10,27,51,.05)`. The block is gone; `shadow-soft` and `shadow-glow-primary` had
   ZERO call sites, `shadow-card` has 240 and `shadow-elevated` 10, and all now read §1's steps.
2. **tailwind-merge does not dedupe `shadow-card` against `shadow-[inset_…]`** — it reads the
   leading `inset` as a different class group, so both survived and emitted-CSS order picked the
   winner. The selected tile rendered with the rest shadow and **no ring at all**. Each state now
   chooses exactly one shadow class rather than layering one over the base.

**One deviation from the letter of §tiles, stated plainly:** the sub-line renders `line-clamp-2`,
not one line. "One line of context" is a rule about CONTENT — one fact, not a table — and clamping
the render to a single visual line turned "$8,557 pending" into "$8557…" and "Awaiting action" into
"Awaiting…" on a five-up row. The tiles share a grid row, so wrapping costs no alignment.

---

## Stage 7 — page header, saved views, filter band, row actions · §patterns · **DONE 2026-09-03**

- Page header as a component: one 32px title, inline rename where the object is user-named, the
  single 48px primary pill on the right.
- Saved views: a tab strip of named filter sets with the count in the label, active under a 2px
  `--primary` underline, a dashed `+` to save current filters. This is the one legal underline —
  give the strip a radius or a fill and the edge-line ban applies again.
- Filter band on `--inset`: search, all-filters, removable solid pills, a dashed add chip.
- **Row actions are persistent, never hover-revealed** (§devices — two of three contexts have no
  hover). Bulk select turns the header row into a solid `--primary` bar so the table never changes
  height.

**Done. Measured in Chromium at 1280 and 599, not inferred from a clean typecheck:**

| Pattern         | Measured                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------- |
| Page title      | `<h1>` 32px / 700 / `-0.896px` (= −0.028em) / `#0E3A5C`                                  |
| Saved-view rail | radius **0**, background **transparent**, border **0** — the three mechanical conditions |
| Active view     | 48px, `#1668E3`, weight 700, `2px #1668E3` under its own label                           |
| Inactive view   | `2px transparent`, `#4C5B6C`                                                             |
| Filter band     | `#F1F5FD` (`--inset`), radius 16, padding 16, gap 11                                     |
| Search          | 40px pill, white, `#D3DDEE` hairline, 14px                                               |
| Applied filter  | 36px **solid** `#1668E3`, white 600, an 18px remove at white/24 — and removing it works  |
| Add filter      | 36px, **dashed**, pill                                                                   |
| Bulk bar        | solid `#1668E3`, white, "1 selected", `colspan=10`                                       |

Four new components — `page-header.tsx`, `saved-views.tsx`, `filter-band.tsx`,
`bulk-action-button.tsx` — plus `DataTable.tsx`, which is where the stage actually reaches the
product: **87 files import it**, so the band and the bulk bar landed on 87 screens without a call
site being edited. `PageHeader` is wired into ten facility screens (bookings, clients-adjacent
list pages, payments, tasks, estimates, forms, submissions, incidents, occupancy, pet cams,
booking requests) and `SavedViews` replaced the bookings tab pills, count-in-a-second-pill and
all.

**"So the table never changes height" is the requirement, and it was measured rather than
asserted.** The header row is **40px before selection, 40px during, and 40px after clearing**.
That is why the bar replaces the header row's cells via `colSpan` instead of being inserted above
it: a second row would push the whole table down 40px the instant a checkbox is ticked and back up
when it is cleared.

**Rule 7 at 599px: search 48 · add chip 48 · saved view 48 · column picker 48, and 0px of
horizontal overflow.** The two controls the spec draws below the floor — the 36px pill's 18px
remove dot and the 32px dashed `+` — keep their drawn size and gain a transparent 48px hit area
below 1024px (`before:-inset-[15px]` on an 18px box is exactly 48). A 48px dot would have
destroyed the pill; rule 7 asks for a 48px target, not a 48px glyph.

**Rule 11 now has a gate**: `bun run check:hover-actions`, ratcheted at **58**. 61 was the raw
grep count; reading `className` one attribute at a time rather than one file at a time drops three
false positives where a file hides element A and reveals element B. It was **watched failing on a
planted violation before being trusted** — the lesson `check:badge-glyph` taught this repo when
its first version passed one.

**Two controls duplicated each other and one was cut.** The reference band carries both "All
filters" and a dashed "+ Add filter", and they do different things there — one opens the whole
panel, one adds a criterion. Against `DataTable`'s existing `Select` model they would have opened
the same thing, which is rule 9's problem wearing a second label. So a call site with its own
filter panel (`onFilterClick`) gets "All filters"; the built-in filter set gets the dashed chip,
because that is what it does.

**One gap this stage found and did not close: `Input` is still shadcn's `h-9 rounded-md`.** §5
specifies 40px, full pill, 1px `--line-strong`, focus 2px `--primary` + a 3px ring at 12% — and
**no stage in this document owns it.** Stage 5 was Button only; stages 8–11 are orange, DataTable
density, icons and French. The band's search wears the §5 geometry as an override so this stage is
whole, but every other input in 266 routes is still the old control. It needs a stage of its own
(the blast radius is every form in the product) and it should be decided, not absorbed.

---

## Stage 8 — the orange territories · §orange · **DONE 2026-09-04**

`avatar.tsx` and the board/occupancy components.

- 2px `#F08A3C` ring on **every pet avatar** — clients and staff never get one.
- Presence: the "on premises" tile, a "Here now" badge, a solid dot on the ring, `yy-breathe` 2.8s.
- Capacity: occupancy meters, "3 spots left". At capacity it stays orange — full is not an error.
- Now: the current-time line, today's column.
- Nowhere else. Not invoices, charts, staff, settings, or any button that is not first-run.

**Done when:** forty ringed avatars on one screen, and no second orange idea competing with them.

**Done, and the budget was COUNTED in a browser rather than eyeballed.** A script walked every
element on five screens, grouped everything painted `#F08A3C` by what it belongs to, and flagged
any orange that had become an ink:

| Screen             | Orange ideas                      |
| ------------------ | --------------------------------- |
| Bookings           | **1** — 15 pet rings, one per row |
| Facility dashboard | **1** — the presence tile         |
| Occupancy          | **1** — the capacity meter        |
| Clients            | 0                                 |
| Payments           | **0**, as §2b requires            |
| Staff              | **0**, as §2b requires            |

Zero orange text anywhere. "Forty" is the spec's illustration of _repetition is free_: the
bookings page shows 15 rows, so it shows 15 rings, and they read as one idea exactly as 40 would.

**Measured values:** ring `rgb(255,255,255) 0 0 0 2px, rgb(240,138,60) 0 0 0 4px` — the 2px ring
at 2px offset, on a full circle. Presence tile badge solid `#F08A3C`, 40×40, glyph in `#0A1B33`
body ink (6.90:1 — §2b's only orange pairing). Presence dot solid orange running
`yy-breathe 2.8s ease-out`. Meter fill `#F08A3C` on an `#F1F5FD` `--inset` track. Now-line mark: a
2px `#F08A3C` rule with a 7px orange dot.

**Four things arrived, three of them replacing something that was the wrong colour:**

- `pet-avatar.tsx` — a SEPARATE component, not a `ring` prop on `Avatar`. The rule is not "an
  avatar may have a ring", it is "a pet has one and a person never does"; a prop makes that
  something 38 call sites must remember, and the failure is silent. Wired into the board block,
  the bookings table, the customer dashboard and the customer pets list. The customer dashboard's
  was `ring-primary/20` — a BLUE ring on a pet, the exact collision §2b warns about.
- `occupancy-meter.tsx` — and the screen called Occupancy had no meter on it at all: four count
  tiles and a grid, so "how full is the building" was two numbers and a subtraction. It refuses a
  tone prop, because **full is not an error** and the figure carries the difference. Over capacity
  is the one branch that takes `--bad`, and it is a status, not a fullness.
- `now-line.tsx` — the staff schedule's marker was a dashed INDIGO rule. Blue is what the software
  does; the present moment is neither an action nor a state.
- `KpiRow`'s "Current Guests" tile moved from `indigo` to `brand`. It is §2b's named "on premises"
  tile and it was saying what the software does rather than what is in the room. The other three
  tiles stayed put — arrivals, departures and check-outs are STATES, which orange may never mean.

**`yy-breathe` landed with this stage** (§4's keyframes verbatim), and the PULSE is opt-in while
the DOT is not. Two rules meet on the presence dot: §4 assigns it `yy-breathe`, and §4 also says
one moving thing per view. Forty breathing dots down a table breaks the second and §5p's ban on
ambient loops over data. So the dot renders wherever presence is true, and `pulse` belongs on the
one place a view shows a single pet — a profile header, a presence tile. Nothing is lost when it
is off: the dot and the words carry the meaning either way.

**The stage was additive, because there was no real orange to clean up.** Measured first: the only
`brand-orange` in `src/` was one `KpiTile` tone nothing opted into, and zero raw `#F08A3C`. The
~720 `bg-orange-*` / `bg-amber-*` class names all compile to `--warning` after stage 1's remap —
see the note in CLAUDE.md, because that grep will mislead the next person who runs it.

---

## Stage 8b — the form controls · §5, §5c, §5g · **DONE 2026-09-04**

Not one of the original eleven. `Input` was flagged at the end of stage 7 as a gap no stage owned;
the product owner chose to close it as its own stage, covering the whole FAMILY rather than the one
component.

**Doing `Input` alone would have made the product worse.** `input`, `textarea`, `select`,
`date-picker`, `time-picker-lux` and shadcn's `SidebarInput` all carried the identical
`h-9 rounded-md`, so fixing one would have put 40px pill inputs beside 36px rounded-rectangle
selects inside the same form.

**And `h-9` was a §5g defect, not a style preference.** §5c: "Field `min-height: 40px` — never a
fixed height." CLAUDE.md says why in general — no fixed height on anything holding a translated
string, because `common.save` grows 175% in French. A fixed-height field clips its own value, in
the locale nobody on the team reads first. The size change IS the fix.

**Measured in Chromium, on a real settings form:**

| Control  | Measured                                                                              |
| -------- | ------------------------------------------------------------------------------------- |
| Input    | 40px min · full pill · 1px `#D3DDEE` on `#FFFFFF` · 14.5px · 48px at 599px            |
| Focus    | `inset 0 0 0 2px #1668E3` + `0 0 0 3px rgba(22,104,227,.12)` — **0px layout shift**   |
| Select   | 40px · full pill · `--inset` `#F1F5FD` when disabled, which is §5's own disabled fill |
| Textarea | 16px radius · white · grows past its 80px resting height                              |

**The focus ring is an inset shadow, and that is a deliberate reading of §5.** The spec asks for a
2px border on focus over a 1px resting border. Written literally that is a 1px layout shift every
time somebody tabs into a field — twelve small jumps on a twelve-field form. `inset 0 0 0 2px`
paints the identical 2px edge inside the existing box. Measured: the field is 40px at rest and 40px
focused.

**One judgement the spec does not make, written down rather than buried.** There is no textarea
specimen anywhere in the reference page, and a 999px radius on a 96px-tall box is a lozenge whose
first and last lines sit inside the curve. So the textarea takes §1's radius scale on its own
terms — 16px, the "medium containers" step. No new value enters the system, but it IS a choice, and
`rounded-full` is a one-word change if the client disagrees.

**Two things went that were rule violations rather than old styling:** `disabled:opacity-50` on
every field (rule 4 — opacity rewrites every ratio in the subtree; disabled is now `--inset` behind
`--ink-disabled`, which passes on its own), and `opacity-50` on the select chevron, which §1 has a
token for: `--ink-disabled`, "chevrons and placeholder glyphs, non-text only".

**`md:text-sm` came out of the base string.** A breakpoint override on the field's own size is
exactly what silently beat two arbitrary `text-[…]` values earlier in this redesign. One size now,
at every width.

**Blast radius, measured before starting:** 1,867 `<Input>` in 500 files, 795 `<SelectTrigger>` in
347, 403 `<Textarea>` in 268 — and only **three** call sites override height or radius. The same
shape as stage 5, where 1,698 buttons grew from 32px to 40px and nothing broke. `size="sm"` on
SelectTrigger is kept and resolves to the same height, exactly as Button's does.

`SidebarInput` was the one field that had escaped the family — `bg-background h-8`, so `--ground`
instead of `--card` and a 32px box that only looked 40 because `min-h-10` outranked it. Found by
measuring rather than reading, because it was the first input the probe happened to land on.

---

## Stage 9 — DataTable budget and density · §devices, §density · **DONE 2026-09-04**

- Column budget enforced: 7 / 5 / 4-field card. Extras into the existing column picker with a saved
  per-user preference. **No horizontal scroll** — it hides the identity column.
- Density is one token in three values, moving row height, cell padding and avatar only. Never font
  size. Below 1024px roomy wins regardless of preference.
- Cells may stack two values with the qualifier in parentheses in `--ink-tertiary` and a bold `+1`.

**Done. Measured in Chromium at 1440, 800 and 599 — every one of §5m's three contexts:**

| Context             | Measured                                                              |
| ------------------- | --------------------------------------------------------------------- |
| Desktop (1440)      | **7 columns**, 0px horizontal overflow                                |
| Tablet (800)        | **5 columns**, roomy forced, and the density control is **not shown** |
| Phone (599)         | **0 tables**, 15 cards, **4 fields** each, 0px page overflow          |
| Density, three ways | 55 → 63 → 71px, and the **font never moved** (14px throughout)        |
| After a reload      | still roomy — the preference persisted                                |

**The row heights are 8px apart, which is right, and 15px above §5n's absolutes, which is
content.** §5n's 40/48/56 assume a 24px line box inside `12px 16px` padding. Measured on a real row:
padding is exactly `12px/12px`, and the row is 65px because one cell holds a 40px element — a
thumbnail, an avatar, a two-line stack. 24 + 40 = 64. The density is doing its job; the cell is
taller than one line of text. Stated here rather than rounded off, because "48px rows" is the kind
of claim somebody later measures.

**The density control is offered only at ≥1024px**, because that is the only place it applies —
§5n: "below 1024px the preference is ignored and roomy wins". IGNORED, not overwritten: a manager
who chose compact at their desk still has compact when they sit back down, and the tablet does not
quietly rewrite their choice. Verified: 0 density controls at 800px.

**The budget trims from the right, after the user's own column choice.** What somebody hid in the
column picker stays hidden; the budget then keeps the leftmost survivors, which is where identity
is. When it trims, the picker says so — "Showing 7 of 9. Hide one to show another" — because rule
6 turns the overflow into "a choice someone makes once", and a choice nobody is told about is not
one.

**Two `overflow-x-auto` containers had to go, not one.** `DataTable`'s own wrapper AND the `Table`
primitive's, so a table past its budget scrolled twice over. `Table` gained a `containerClassName`
prop rather than losing the scroll globally: every table NOT going through `DataTable` still has
whatever column count it was written with and no budget enforcing anything, so removing the escape
hatch under them would replace a scroll with a clipped table — worse, and silent. They lose it when
they gain a budget.

**The phone card is not a read-only fallback.** It reuses `col.render` verbatim, so a status chip
stays a chip and a ringed pet avatar stays ringed, and it carries selection and row actions —
because §5m's phone user is the floor staff member actually doing the work.

**The honest limit: "saved per user" is saved per BROWSER.** `localStorage`, keyed by `tableId`.
Per-table is exact; per-user is not — the same person on a second device starts from the default. A
row in Postgres would fix it and is a migration, an API route and an RLS policy, deliberately not
smuggled into a design stage.

**A source conflict found here and NOT acted on, because two of three sources agree against it.**
§5e says "Bulk bar sits above the header row on white with a `--primary` hairline". §5b pattern 04,
the rendered reference page, and this document's own stage 7 all say the header row BECOMES a solid
`--primary` bar. The page wins by CLAUDE.md's own rule, and stage 7 shipped the solid bar with the
row height measured identical before, during and after selection. Flagged for whoever reconciles
the spec.

---

## Stage 10 — icons · §5b1 · **DONE 2026-09-04**

- `src/lib/nav/facility-nav.ts`: wire the glyph for every area from `docs/design-system/icon-map.json`
  (`tier1.navigation`) rather than from prose, so a synonym cannot creep back in.
- The six custom glyphs are already real components after stage 0 — import them from
  `@/components/icons/yipyy-icons`.
- Resolve the six nav collisions per `tier1Collisions` in the map (also §5b1).
- Sizes 16/20/24 only, 1.75px stroke (2px at 16), `currentColor`, round caps.
- An icon never introduces a colour — it inherits its label's ink.

**Done. Measured in Chromium across all 37 rendered nav buttons:**

| Property        | Measured                               |
| --------------- | -------------------------------------- |
| Size            | **20×20**, every one                   |
| Stroke          | **1.75px**, every one                  |
| Ink             | **37/37** inherit their label's colour |
| Duplicate glyph | **none**                               |

**Nine glyphs changed — five collisions and four synonyms.** The collisions are the ones that
mattered, because a glyph on two areas carries no information at all: the label does the work and
the icon is decoration. Per `tier1Collisions`, with the map's own reasoning:

| Was              | On                                    | Fix                             |
| ---------------- | ------------------------------------- | ------------------------------- |
| `calendar`       | Facility Calendar + **Bookings**      | Bookings → `calendar-check`     |
| `credit-card`    | Payments + **Subscription & Billing** | Subscription → `repeat`         |
| `bar-chart-3`    | Reports + **Loyalty Reports**         | Loyalty Reports → `trending-up` |
| `file-text`      | Estimates + **Digital Waivers**       | Waivers → `file-signature`      |
| `clipboard-list` | Tasks + **Intake Forms**              | Forms → `clipboard-pen`         |

And four that had simply drifted from the map: Dashboard `house` (was lucide's deprecated `Home`
alias), Facility Calendar `calendar-days` (was the bare `Calendar`), Occupancy `layout-grid` (was
`Grid3X3`), Incidents `triangle-alert` (was the deprecated `AlertTriangle`).

**The sixth collision was NOT applied, deliberately.** The map's `dollar-sign` entry fixes "Billing"
to `wallet`, but this nav has one item called "Subscription & Billing" and no dollar-sign anywhere;
the map's own note says "the titles need separating too", which is a product decision about what
those screens are rather than an icon swap. The `credit-card` duplicate it shared is resolved
either way. Left for whoever splits them.

**Two defects found by measuring rather than by reading the nav file:**

1. **The nav glyph was 16px on all 36 areas.** §5b1: "16 inline with text and in badges, 20 THE
   DEFAULT FOR BUTTONS, ROWS AND NAV, 24 for page headers." At 16 the rail read as text with
   decorations beside it rather than as a set of glyphs.
2. **The ACTIVE item's glyph went grey while its label went primary** — `isActive &&
"text-muted-foreground"` in `generic-sidebar.tsx`, which is §5b1's "an icon never introduces a
   colour" broken in the one state where the colour matters most. The same component carried an
   `iconColor` prop letting a call site paint a glyph from data; no nav item ever set it, and it is
   removed rather than left as a legal-looking way to break the rule.

**The stroke is fixed in CSS, not by a prop.** lucide ships `stroke-width: 2`; §5b1 wants 1.75 at
20px. CSS `stroke-width` beats the SVG presentation attribute, so one `[&>svg]:[stroke-width:1.75]`
on the menu button fixes all 36 without threading a prop through the nav model or touching a call
site.

**`bun run check:nav-icons` is the encoding, and it was watched failing.** It compares every nav
item against the map AND fails on any glyph used twice — the second half matters because a new
collision could otherwise pass while both halves individually match. Planting `calendar-days` back
on Bookings produced both errors at once:

```
✗ 1 glyph(s) do not match the map
    Bookings                 is CalendarDays, map says CalendarCheck
✗ 1 glyph(s) used by more than one area
    CalendarDays         Facility Calendar + Bookings
```

**The first plant did not land, and that is worth recording.** The line number was stale — the doc
block added earlier in the same change had shifted the file by ~48 lines — so the gate passed a
violation that was never actually written. Caught by checking the planted line rather than trusting
the `sed`. A gate is only verified by watching it fail on a change you have confirmed is present.

---

## Stage 11 — French, print, accessibility · §formatting, §print, §focus · **DONE 2026-09-04**

- Every date, time, number, currency, weight and duration through `Intl`. Never a format string,
  never a numeric MM/DD. French `14 h 30`, `\u00A0` before `$ % :`.
- No fixed heights on anything holding a translated string — closed in stage 8b.
- Print: every colour drops out except the mark; a status becomes a bordered word; one hairline
  under the table header, no zebra. `print-color-adjust: exact` on the logo and nowhere else.
- `aria-live` on async completion. Focus rings from `--primary`.

**The most useful thing found in this stage: §5q is not a specification to implement, it is a
description of what `Intl` already does.** Checked against this repo's own ICU before a line was
written — every row of the table matches character for character, including the U+00A0:

```
fr-CA time      "14 h 30"          en-CA time      "2:30 p.m."
fr-CA currency  "42,50\u00A0$"     en-CA currency  "$42.50"
fr-CA percent   "82\u00A0%"        fr-CA thousands "1\u00A0240"
fr-CA date      "mar. 1 sept. 2026"  en-CA date    "Tue, Sep 1, 2026"
```

**So the defect was never that French formatting is hard. It is that 534 call sites across 330
files pass a LITERAL locale tag, and 461 of those say `"en-US"`.** A facility that switches to
French still reads American dates. And `en-US` is wrong in English too: it renders `9/1/2026`,
which is exactly the numeric MM/DD form rule 8 bans — "Canada reads all three orders and this is a
boarding product, where the wrong month is a dog in the wrong week."

`src/lib/i18n/format.ts` is the layer that takes the locale, and `bun run check:hardcoded-locale`
freezes 534 so the migration can only go one way. Not swept in one change: a client component can
call `useAppLocale()`, a server component cannot, and a pure helper has to take the locale as an
argument — which changes its signature and every one of its own callers. That is a refactor with a
shape per file.

**Money was being formatted as US dollars.** `src/lib/format.ts` builds every figure with
`currency: "USD"` on `en-US`, in a Canadian product taking Canadian dollars through Clover. In
English the two render identically — `$42.50` — which is precisely why it survived; in French the
right answer is `42,50 $` and the wrong one is `42,50 $US`. The new layer uses `CAD`.

**Two assertions failed on the first run and NEITHER was a bug in the code:**

1. **French time uses PLAIN spaces, not NBSP.** `14 h 30` is U+0020 either side; §5q asks for a
   non-breaking space "before `$ % :`", which is money and percent, and money does carry U+00A0.
   The test was wrong and asserting NBSP would have failed correct code. Checked by printing
   codepoints rather than comparing two strings that look identical in a terminal.
2. **§5q's own weight example is arithmetically wrong.** The table prints `12.4 kg (28 lb)`;
   12.4 × 2.20462 = 27.34, which rounds to **27**. 28 lb is 12.70 kg. The implementation converts
   correctly and the test asserts 27 — **not fudged to match the spec**, because a weight on this
   product sits next to a medication dose. **Flagged here for whoever corrects the spec.**

**24 unit tests** assert the table line by line, with the non-breaking spaces written as `\u00A0`
escapes on purpose: a test using a normal space passes while the bug ships, which makes the escape
the entire point.

**Print did not exist.** No `@media print` anywhere in the app — every screen printed as a
screenshot of itself: sidebar, toasts, buttons, coloured chips and truncations, in ink somebody
pays for. Now: `@page letter/18mm`, the chrome hidden by role and `data-slot` rather than by utility
class, **every truncation expanded** (§5u: "there is no hover on paper, so an ellipsis is
information destroyed"), status chips become bordered words, one hairline under the table header
and no zebra, `thead` repeats across pages, and `print-color-adjust: exact` on the mark and nothing
else. The three §5u documents — invoice, run card, board sheet — need their own page setup and
belong with the screens that own them; what is here is what is true of all three and of every page
somebody hits Ctrl+P on by accident.

**`Button` had no focus indicator at all, and stage 5 is where it went.** That rewrite carried
`outline-none` across from shadcn WITHOUT its `focus-visible:ring-*`, so from that commit until
this one not one of the **3,774 buttons** in this app showed a keyboard user where they were.
Nothing failed and nothing looked wrong, because a mouse never reveals it. Found by tabbing through
a real page and reading the computed style at each stop.

**And the first reading of that probe was wrong, which is worth recording.** It measured `outline`
only and reported 1 of 6 tab stops visible — the sidebar looked broken too. It was not: the sidebar
uses a RING (a box-shadow), which is a perfectly good focus indicator. Measuring both gives
**12/12 visible**. A probe that checks one of the two mechanisms manufactures defects.

**The global `:focus-visible` rule is real but narrower than it first looks.** It upgrades the
browser default to §5k's ring for anything that has not removed its outline. It CANNOT help an
element carrying `outline-none`, because that is a utility and utilities beat `@layer base` — which
is why Button needed its own and why the 13 bare elements across 7 files (the feeding-form input,
both message composers, the rich-text variable input, three modals) each still need one.

**`aria-live` went on the one place it is worth having.** A sighted user watches a table shrink as
they type; a screen-reader user gets nothing, because rows change without focus moving. `DataTable`
now announces "N of M shown" politely — 87 screens from one region. `polite` rather than
`assertive` because a changing count is not an interruption and would otherwise talk over the
user mid-keystroke.

---

## Governance

Adding a colour, a component or a glyph goes through the ten gates in the spec's governance section.
The short version: it must be missing, not merely inconvenient; it must be measured against its real
background; and it must be added to `design-system.md` and the reference page in the same PR that
uses it.
