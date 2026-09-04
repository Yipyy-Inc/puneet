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
// ── THE SETTLED ANSWER, WHICH ALREADY EXISTED ─────────────────────────────
//
// §6 rule 2, as settled 2026-09-04: "a MARK carrying [a status ink] — a chip, a
// badge disc, a small tag — sits on that ink's own --wash-* rather than on
// white; a SURFACE never does." That is exactly what `badge.tsx` does for the
// six status chips, measured at 4.54–7.09:1. This is the same treatment for the
// same kind of object, so a section's disc and a status chip finally agree.
//
// ── AND WHY THE KPI TILE'S DISC IS NOT THIS ───────────────────────────────
//
// `kpi-tile.tsx` keeps a SOLID disc with a white glyph, and that is not an
// inconsistency: its disc sits on the tile's own wash, where light-on-light
// disappears. This one sits on a white card. Same two values, opposite roles,
// decided by what is behind them — the note in kpi-tile.tsx says the same thing
// from the other side.
// ============================================================================

export type MarkTone =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "violet"
  | "neutral";

const TONE: Record<MarkTone, string> = {
  info: "bg-wash-primary text-info",
  success: "bg-wash-success text-success",
  warning: "bg-wash-warning text-warning",
  error: "bg-wash-error text-destructive",
  violet: "bg-wash-violet text-violet",
  // Five washes exist and neutral is not one of them (§1), so it takes the
  // inset surface — which is what a neutral tile does elsewhere.
  neutral: "bg-surface-inset text-ink-secondary",
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
