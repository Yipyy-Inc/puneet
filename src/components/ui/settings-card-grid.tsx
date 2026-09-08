import { cn } from "@/lib/utils";

// ============================================================================
// TWO CARDS ON A LINE, NOT ONE — AND THEIR BOTTOM EDGES LINE UP.
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
// ── WHY THE CARDS STRETCH, WHICH REVERSES WHAT THIS FILE FIRST SAID ──────
//
// This shipped with `items-start` on 2026-09-08, reasoning that a stretched
// short card becomes "a tall card mostly full of white" — the failure the
// settings index records in its own comment (settings-landing.tsx) as the
// reason it chose CSS columns instead.
//
// The product owner looked at the result and said the opposite, and they are
// right: on notifications, a 9-row card beside a 7-row one left the shorter
// card's bottom edge floating 130px above its neighbour's, with ground showing
// under it. Two cards in a row that stop at different heights do not read as
// "one is shorter" — they read as unfinished.
//
// THE CITED PRECEDENT DOES NOT TRANSFER, and that is the actual mistake.
// The landing page grids NAV GROUPS whose lengths differ by 3× — nine leaves
// against three. A settings SECTION's cards are each a group of related
// controls, and they differ by a row or two. The failure mode is real; it just
// needs a ratio the sections here do not have.
//
// Be honest about what stretching does: it does not remove the empty space, it
// MOVES it from the ground below a card to inside the card. That is an
// improvement because a grid whose cells align reads as composed and one whose
// cells stop at random heights reads as broken — not because the whitespace
// went anywhere.
//
// ── WHEN A SECTION GENUINELY SHOULD NOT STRETCH ──────────────────────────
//
// Pass `items-start` back through `className`. It is the right answer where a
// one-control card pairs with a long one and the ratio starts to look like the
// landing page's. Measured across all seventeen sections on 2026-09-08 —
// see the debt map for which needed it and why.
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

/**
 * The class list, for a file whose wrapper cannot be swapped for the component
 * — a 600-line settings component with dozens of divs, where matching the
 * right closing tag is guesswork. Same layout, same reasoning above, one
 * source of truth.
 *
 * Tailwind sees the literal here, so the utilities are generated whether a
 * caller uses the component or the constant.
 */
export const SETTINGS_CARD_GRID = "grid gap-6 lg:grid-cols-2";

export function SettingsCardGrid({
  className,
  children,
}: {
  /**
   * For a section whose cards are genuinely unequal — `items-start` to stop
   * them stretching, or `lg:grid-cols-[2fr_1fr]` for an uneven split.
   */
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(SETTINGS_CARD_GRID, className)}>{children}</div>;
}
