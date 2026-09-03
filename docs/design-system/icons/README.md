# Icons — what to copy, what is already installed

## Tier 1 — UI icons: nothing to copy

Everything in working chrome is `lucide-react`, **already a dependency** (0.554). Monochrome,
`currentColor`, 1.75px stroke on a 24px grid, sizes 16/20/24 only (2px stroke at 16), round caps
and joins. An icon never introduces a colour — it inherits its label's ink. The only exceptions are
white on a solid fill, a status glyph in its own status ink, and body ink on a solid orange badge.

`icon-map.json` is the §5b1 map in machine-readable form: 37 nav areas, 20 actions, 18 objects and
8 status glyphs, one name per meaning, so nobody picks a synonym. Wire
`src/lib/nav/facility-nav.ts` from it rather than from prose.

It also carries `tier1Collisions` — **six glyphs in the shipped nav each carry two meanings**, with
the resolution and the reason for each. Fix those in stage 10.

## Tier 2 — the six custom glyphs: copy these

These are the meanings lucide has no adequate equivalent for. They were drawn on lucide's grid at
its stroke and caps so they read as one family beside it.

| Glyph            | Component       | Why it is custom                                                                                |
| ---------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `kennel-run`     | `KennelRun`     | closest: fence — The unit the boarding business is measured in; Grid3X3 stands in for it today. |
| `occupancy`      | `Occupancy`     | closest: grid-2x2-check — How full the building is — the figure orange marks.                   |
| `boarding-night` | `BoardingNight` | closest: moon-star — Boarding is priced by the night.                                           |
| `playgroup`      | `Playgroup`     | no candidate — Daycare's core object — several animals loose together.                          |
| `grooming-table` | `GroomingTable` | no candidate — Distinguishes the grooming station from the service — scissors is the service.   |
| `checked-in`     | `CheckedIn`     | no candidate — The most-performed action in the product.                                        |

**Two formats, both real files:**

- `yipyy-icons.tsx` → copy to `src/components/icons/yipyy-icons.tsx`. A lucide-compatible API, so
  call sites do not care which tier a glyph came from:

  ```tsx
  import { CheckedIn, Occupancy } from "@/components/icons/yipyy-icons";

  <CheckedIn className="size-5" />        // inherits the label's ink
  <Occupancy size={16} />                 // stroke steps to 2 automatically
  ```

  It is `forwardRef`, spreads `SVGProps`, sets `aria-hidden`, and takes `strokeWidth` to override.

- `svg/*.svg` → six standalone 24×24 files with `stroke="currentColor"`, for Figma, email, print, or
  anywhere React is not available.

## Adding a seventh

Search `Object.keys(lucide.icons)` — 1,756 glyphs — **not** the app's current imports. `paw-print`
and `cone` were both already there and had been drawn by hand before anyone checked. Then the
governance gate: it must be missing rather than inconvenient, drawn on the same grid and stroke, and
added to `design-system.md`, `icon-map.json` and `yipyy-icons.tsx` in the same PR that uses it.

## Not icons

The mascot's 23 poses and the Tier 2 3D renders are **not** icons and never substitute for one. A
render cannot inherit ink, cannot survive 16px, and cannot print. If a slot needs 24px it takes a
Tier 1 glyph. See §5d1 and §5d2.
