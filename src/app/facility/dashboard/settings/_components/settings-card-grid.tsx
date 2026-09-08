import { cn } from "@/lib/utils";

// ============================================================================
// TWO CARDS ON A LINE, NOT ONE.
//
// Settings sections stacked every card full width, one per row, with content in
// the left half and nothing in the right. Removing the rail on 2026-09-08 gave
// each section 266px more width and put none of it to use, which turned a loose
// screen into a visibly empty one.
//
// ── WHY `lg`, AND NOT THE `md` THE REPO USES ELSEWHERE ───────────────────
//
// Five service-settings pages already do `grid gap-6 md:grid-cols-2`, so the
// SHAPE has precedent — but not the breakpoint. `md` is 768px, which §5m
// assigns to "tablet, check-in desk", and §5m's own row for that range says
// "two-column forms collapse to one". `lg` IS §5m's desktop boundary, so
// splitting there follows the spec instead of cutting across it.
//
// ── WHY TWO COLUMNS AND NEVER THREE ──────────────────────────────────────
//
// §5m: "Three real contexts, not three abstract widths." There is no wide or
// ≥1440px breakpoint in the design system, deliberately, so an `xl:` third
// column would be inventing a fourth context (§5v).
//
// It is also wrong on the measurements. At 1440px with the rail gone, two
// columns give each card ~690px — a workable form width. Three would give
// ~460px, and several of these cards already split their own fields into two
// columns internally (business-profile-card, report-card-settings-card), so a
// third column would be splitting a split.
//
// ── `items-start` IS THE WHOLE DIFFERENCE BETWEEN THIS AND A MESS ────────
//
// Without it, grid children stretch to the tallest in the row, and a short card
// becomes a tall card mostly full of white. The settings index records that
// exact failure in its own comment (settings-landing.tsx) as the reason it
// chose CSS columns instead. Here the product owner chose natural reading order
// — left to right, top to bottom — accepting a gap UNDER a short card rather
// than the down-then-across order columns would impose. `items-start` is what
// makes that gap a gap instead of a stretched card.
//
// ── ONE RULE FOR THE EXCEPTIONS ──────────────────────────────────────────
//
// A card that lays its OWN contents out in columns takes `lg:col-span-2`.
// Otherwise the two splits compound: notification settings inside a 2-column
// section, splitting its rows two-up, would give each row ~330px — narrower
// than the full-width version it replaced.
//
// §6 rule 6 ("every fr/fixed grid column needs minmax(0, …)") is satisfied by
// using the utility: Tailwind compiles `grid-cols-2` to
// `repeat(2, minmax(0, 1fr))`. A hand-written template would not be.
// ============================================================================

export function SettingsCardGrid({
  className,
  children,
}: {
  /** For a section whose cards are genuinely unequal, e.g. `lg:grid-cols-[2fr_1fr]`. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid items-start gap-6 lg:grid-cols-2", className)}>
      {children}
    </div>
  );
}
