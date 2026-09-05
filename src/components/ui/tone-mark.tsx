import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// A MARK — the small coloured square that carries a section's glyph.
//
// ── WHY THE PLATFORM LOOKED DARK ──────────────────────────────────────────
//
// These were written as gradients: `bg-linear-to-br from-rose-500 to-pink-600`,
// `from-amber-400 via-orange-500 to-rose-500`, and so on. That reads as a
// bright, saturated intention, and until stage 1 it was one.
//
// Stage 1 then remapped every step of Tailwind's raw palette onto the six
// status inks so the redesign would not have to rewrite ~900 files. Those inks
// are TEXT weights — #B23B3B, #8A5115, #4C3BB8 — chosen to pass AA as words on
// white, which means each is deliberately dark. So every one of those gradients
// silently became a flat, heavy disc: `from-amber-400 to-orange-500` is
// #8A5115 to #8A5115, a solid brown with no gradient left in it at all.
//
// Nine of them across one screen is the "dark vibe" the client reported, and
// nothing in the source says so — every class name still reads as a bright
// gradient.
//
// ── IT IS A SOLID DISC WITH A WHITE GLYPH, AND THAT WAS A CHOICE ──────────
//
// The first version of this component used the wash: `bg-wash-violet` with the
// saturated ink as the glyph, which is what `badge.tsx` does for the six status
// chips and what §6 rule 2 describes for a mark. It measured well and it read
// light — and the client looked at it on staging and preferred what was there
// before.
//
// Worth recording WHAT they were comparing against, because it is not what it
// looks like. `main` does not carry stage 1's @theme remap; only `redesign`
// does. So production still renders `from-violet-500 to-fuchsia-500` as
// Tailwind's real violet-to-magenta, while the identical line on staging
// renders flat #4C3BB8. The bright row the client remembers is the PRE-redesign
// palette, and no change to this branch can reproduce it — reverting the classes
// here would have produced the dark row they complained about in the first
// place, not the bright one they were pointing at.
//
// So this is the closest thing the design system actually has to "vivid": the
// SOLID status ink under a white glyph. The map below is `kpi-tile.tsx`'s badge
// map, value for value, deliberately — a section's disc and a metric tile's
// disc are the same object and now look it.
//
// The wash has not gone anywhere; it is still what a status CHIP wears
// (badge.tsx), which is the small mark inside a white row that rule 2 was
// written about. A 40px disc carrying a section is a different weight of thing.
// ============================================================================

export type MarkTone =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "violet"
  | "neutral";

const TONE: Record<MarkTone, string> = {
  info: "bg-primary text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  error: "bg-bad text-white",
  violet: "bg-violet text-white",
  neutral: "bg-ink-secondary text-white",
};

const SIZE = {
  sm: "size-8 rounded-lg [&>svg]:size-4",
  md: "size-10 rounded-xl [&>svg]:size-5",
} as const;

export interface ToneMarkProps {
  icon: LucideIcon;
  tone: MarkTone;
  /** 32px inside a row, 40px at a section head. There is no third (§1). */
  size?: keyof typeof SIZE;
  className?: string;
}

export function ToneMark({
  icon: Icon,
  tone,
  size = "md",
  className,
}: ToneMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        SIZE[size],
        TONE[tone],
        className,
      )}
    >
      <Icon aria-hidden />
    </span>
  );
}
