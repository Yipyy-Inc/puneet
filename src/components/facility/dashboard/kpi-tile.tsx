"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";

import { DeltaBadge } from "@/components/ui/delta-badge";
import type { Delta } from "@/lib/format";
import { cn } from "@/lib/utils";

// ============================================================================
// Metric and filter tile. docs/design-system/design-system.md §tiles, §5s, §6.
//
// Every value below is the reference page's own tile anatomy table:
//
//   Surface     linear-gradient(135deg, <wash> 0%, #FFF 58%) · 1px #E6E6E9 · r24
//   Carrier     a 40px SOLID badge with the glyph on top
//   Label       12 / 700 / .07em / uppercase / #4C5B6C · min-height 2.6em
//   Value       30 / 700 / -.02em / #0A1B33 · tabular
//   Sub-line    13 / #4C5B6C · exactly one
//   Selected    inset 0 0 0 2px #1668E3, value steps to #0F58C6
//   Applied     solid #1668E3, white text, one at a time
//
// ── WHAT THIS REPLACED, AND WHY EACH ONE HAD TO GO ────────────────────────
//
// The tile carried five patterns §tiles names as defects, by name:
//
//   1. `absolute bottom-0 left-0 right-0 h-0.5` on the active state — THE
//      BOTTOM ACCENT. §6 rule 1 bans an accent line on any edge, and the tile
//      section says why twice: "it reads as a progress bar that never fills,
//      and it breaks the tile's radius on two corners". Replaced by the full
//      2px inset ring, which "survives reorder and reads on any edge".
//   2. `border-t border-dashed` above the trail and the link. "A dashed
//      divider inside a 5-line tile is decoration, not structure. Space the
//      action instead." So they are spaced.
//   3. Multi-hue gradient badges (`from-amber-400 via-orange-500 to-rose-500`)
//      where the spec asks for one solid fill. "This is what made the old
//      tiles readable at a glance — a saturated circle."
//   4. A `halo` gradient at opacity behind everything, which is a tint fill
//      wearing a costume.
//   5. A 10px label and a 20px value, against the specified 12 and 30.
//
// ── THE TONE NAMES ARE KEPT, THE COLOURS ARE NOT ──────────────────────────
//
// 65 files pass `tone="indigo"` and friends, so the keys stay and map onto
// §1's roles. `amber` is the one that does NOT map to what its name suggests:
// it resolves to the WARNING family, not to orange. In this app `amber` labels
// "Escalated", "Overdue invoices", "Paused", "Drafts" — states — and §2b's
// whole guardrail is that orange is the animal and "never becomes an action or
// a state". The reference page's one orange tile is "Trials expiring · 7
// days", a countdown, which is §2b's "now" territory. So orange is available
// as its own opt-in tone, and no legacy name resolves to it by accident.
// ============================================================================

export type KpiTone =
  | "indigo"
  | "amber"
  | "rose"
  | "emerald"
  | "slate"
  | "violet"
  /** §2b's territories only — presence, capacity, now. Never a state. */
  | "brand";

interface ToneStyle {
  /** The §tiles wash, or none for the neutral tone (there are only five). */
  wash: string;
  /** The 40px solid carrier. */
  badge: string;
  /** White, except on orange, where §1 says body ink (6.90:1). */
  glyph: string;
}

const TONE_STYLES: Record<KpiTone, ToneStyle> = {
  indigo: { wash: "", badge: "bg-primary", glyph: "text-white" },
  emerald: {
    wash: "",
    badge: "bg-success",
    glyph: "text-white",
  },
  rose: { wash: "", badge: "bg-bad", glyph: "text-white" },
  amber: { wash: "", badge: "bg-warning", glyph: "text-white" },
  violet: { wash: "", badge: "bg-violet", glyph: "text-white" },
  // Five washes exist and neutral is not one of them, so this tile is plain
  // white — which is rule 2's default answer anyway.
  slate: { wash: "", badge: "bg-ink-secondary", glyph: "text-white" },
  brand: {
    wash: "",
    badge: "bg-brand-orange",
    glyph: "text-body-ink",
  },
};

interface KpiTileProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: KpiTone;
  trail?: { label: string; value: number | string }[];
  /** A coloured sub-label below the hint (e.g. an SLA breach). */
  alert?: { label: string; tone?: "rose" | "amber" };
  /** Period-over-period delta, shown beside the hint. */
  delta?: Delta;
  /** Footer call-to-action, rendered as a "label →" link. */
  link?: { label: string; onClick: () => void };
  onClick?: () => void;
  /**
   * §tiles distinguishes two: SELECTED is a 2px inset ring with the value in
   * primary ink; APPLIED is the solid blue filter currently narrowing the
   * view, and there is only ever one at a time. `active` is the selected ring;
   * `applied` is the solid.
   */
  active?: boolean;
  applied?: boolean;
}

export function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
  trail,
  alert,
  delta,
  link,
  onClick,
  active,
  applied,
}: KpiTileProps) {
  const styles = TONE_STYLES[tone];
  const isInteractive = !!onClick;
  // A `link` renders a nested <button> inside the tile; a button containing a
  // button is a WCAG nested-interactive failure, so the tile only takes the
  // button role and tab stop when it has no nested control.
  const takesButtonRole = isInteractive && !link;

  return (
    <div
      data-tone={tone}
      data-active={active ? "true" : undefined}
      data-applied={applied ? "true" : undefined}
      role={takesButtonRole ? "button" : undefined}
      tabIndex={takesButtonRole ? 0 : undefined}
      className={cn(
        `border-line relative overflow-hidden rounded-2xl border p-[18px] transition-[transform,box-shadow,border-color] duration-180 ease-[ease] motion-reduce:transition-none`,
        // ── EXACTLY ONE SHADOW CLASS REACHES THE ELEMENT ─────────────────
        //
        // `shadow-card` used to sit in the base string with the state shadow
        // added after it, and tailwind-merge kept BOTH: it reads the leading
        // `inset` of the ring as a different class group, so nothing was
        // deduped and the emitted CSS order decided the winner — which was
        // `shadow-card`. The selected tile rendered with the rest shadow and
        // no ring at all. Measured in the browser, not guessed.
        //
        // So the shadow is chosen once, per state, and never layered.
        applied
          ? "bg-primary border-transparent shadow-(--sh-cta)"
          : cn("bg-card", styles.wash),
        // §5s Selected: a full 2px ring, never a line on one side.
        active && !applied
          ? "border-transparent shadow-[inset_0_0_0_2px_var(--primary),var(--sh)]"
          : !applied && "shadow-card",
        isInteractive && [
          "cursor-pointer",
          "hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-18px_rgba(10,27,51,0.4)]",
          !applied && !active && "hover:border-line-strong",
          "motion-reduce:hover:translate-y-0",
        ],
      )}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/*
            min-h-[2.6em] is load-bearing, not padding: it reserves two lines
            so a label that wraps — and `common.save` grows 175% in French —
            cannot push its own figure down and break the alignment of a row
            of tiles (§tiles, §5q).
          */}
          <p
            className={cn(
              "min-h-[2.6em] text-[12px] leading-[1.3] font-bold tracking-[0.07em] uppercase",
              applied
                ? "text-white/80"
                : active
                  ? "text-primary-hover"
                  : "text-ink-secondary",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-[30px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums",
              applied
                ? "text-white"
                : active
                  ? "text-primary-hover"
                  : "text-body-ink",
            )}
          >
            {value}
          </p>
          {(delta || hint) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5">
              {delta && <DeltaBadge delta={delta} onSolid={applied} />}
              {hint && (
                <p
                  className={cn(
                    // Two lines, not one. §tiles asks for "one line of
                    // context", which is about CONTENT — one fact, not a
                    // table — and clamping the render to a single visual line
                    // turned "$8,557 pending" into "$8557…" on a five-up row.
                    // The tiles share a grid row, so they stay the same
                    // height whether this wraps or not.
                    "line-clamp-2 text-[13px]",
                    applied ? "text-white/80" : "text-ink-secondary",
                  )}
                >
                  {hint}
                </p>
              )}
            </div>
          )}
          {alert && (
            <p
              className={cn(
                "mt-0.5 line-clamp-1 text-[13px] font-semibold",
                applied
                  ? "text-white"
                  : alert.tone === "amber"
                    ? "text-warning"
                    : "text-bad",
              )}
            >
              {alert.label}
            </p>
          )}
        </div>
        {/* The colour carrier — 40px, one solid fill, glyph on top. */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            applied ? "bg-white/16 text-white" : [styles.badge, styles.glyph],
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>

      {/* Spaced, not ruled — the dashed divider that used to sit here is
          named in §tiles' own "never" list. */}
      {trail && trail.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5">
          {trail.map((t) => (
            <span
              key={t.label}
              className={cn(
                "inline-flex items-center gap-1 text-[13px]",
                applied ? "text-white/80" : "text-ink-secondary",
              )}
            >
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  applied ? "text-white" : "text-body-ink",
                )}
              >
                {t.value}
              </span>
              {t.label}
            </span>
          ))}
        </div>
      )}

      {link && (
        <div className="mt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              link.onClick();
            }}
            className={cn(
              "group/link inline-flex items-center gap-1 text-[13px] font-semibold",
              "hover:underline",
              applied ? "text-white" : "text-primary",
            )}
          >
            {link.label}
            <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-0.5" />
          </button>
        </div>
      )}
    </div>
  );
}
