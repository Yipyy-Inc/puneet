import type { TipConfig, TipTierConfig } from "@/types/facility";

// ============================================================================
// What tips this facility offers — one answer, for the screen and the terminal.
//
// A facility configures its tips once, at Settings → Tips, and that is stored
// in `facility_settings.tip_config`. Until 2026-08-26 the answer was then
// re-invented in four places: three components carried their own hardcoded
// percentages (10/15/20, 0/15/18/20, 10/15/20/25 — all different, none the
// facility's), and the Clover terminal was told nothing at all, so the device
// fell back to whatever the merchant had configured on the hardware itself.
//
// ── WHY THIS FILE IS PURE ─────────────────────────────────────────────────
//
// The tier rule has to run in TWO places that cannot import each other: a
// `"use client"` component rendering the buttons, and a server route building
// the payload for a card reader. It lived inside `TipSelector`, which is a
// client component, so the route could not reach it — and a second copy is a
// second thing to keep in step.
//
// So: no `server-only`, no imports beyond a type. That is also what makes it
// reachable from a spec, which is the point — money arithmetic no test can
// call is money arithmetic nobody checks.
// ============================================================================

/**
 * A tip suggestion in the shape Clover's REST Pay Display expects.
 *
 * Deliberately NOT the `TipSuggestion` exported by `lib/clover/print.ts`:
 * that module is `server-only`, and importing it here would drag the whole
 * Clover client into every component that renders a tip button.
 */
export interface CloverTipSuggestion {
  /** Shown on the device. Omitted, Clover displays the amount or percentage. */
  name?: string;
  /** A flat amount in CENTS. Mutually exclusive with `percentage`. */
  amount?: number;
  /** A WHOLE percentage. Mutually exclusive with `amount`. */
  percentage?: number;
}

/**
 * The three options in force at this amount.
 *
 * `smart` mode exists so a $20 daycare visit can offer dollar tips while a $400
 * boarding stay offers percentages. The threshold is inclusive from above — at
 * exactly the threshold the ABOVE tier applies, which is the rule the screens
 * have always used.
 *
 * @param subtotal in DOLLARS, matching `smart.thresholdAmount`.
 */
export function activeTipTier(
  config: TipConfig,
  subtotal: number,
): TipTierConfig {
  if (config.mode !== "smart") return config.general;
  return subtotal < config.smart.thresholdAmount
    ? config.smart.belowThreshold
    : config.smart.aboveThreshold;
}

/**
 * The facility's tips, ready to hand to a Clover device.
 *
 * ── WHAT IS DELIBERATELY NOT IN HERE ──────────────────────────────────────
 *
 * No "Custom" and no "No Tip". Clover's own documentation for /device/read-tip
 * states that "the options 'custom tip' and 'no tip' are always offered", so
 * adding them would show the customer two of each. The web `TipSelector` draws
 * its own because a browser has no device to draw them for it.
 *
 * ── AND WHY AN EMPTY ARRAY IS MEANINGFUL ──────────────────────────────────
 *
 * Tips switched off returns `[]`, and `readTipOnDevice` omits the field
 * entirely when given an empty list — which Clover reads as "use defaults" and
 * would show the device's own tips. So an empty answer here must never be
 * passed on as "no preference": the caller has to skip the tip prompt outright.
 * That is why the terminal route checks `enabled` itself rather than inferring
 * it from the length of this array.
 *
 * @param subtotal in DOLLARS — the PRE-TAX amount, which is what a percentage
 *   here means and what Clover is told to calculate on.
 */
export function cloverTipSuggestions(
  config: TipConfig,
  subtotal: number,
): CloverTipSuggestion[] {
  if (!config.enabled) return [];

  return (
    activeTipTier(config, subtotal)
      .options.map((option): CloverTipSuggestion | null => {
        // A label is optional in our schema; Clover then shows the figure
        // itself, which is a better default than an empty caption.
        const name = option.label?.trim() ? { name: option.label.trim() } : {};

        if (option.type === "percentage") {
          // Clover takes a whole integer. A facility that typed 17.5 gets 18
          // rather than a rejected payload or a silently dropped suggestion.
          const percentage = Math.round(option.value);
          return percentage > 0 ? { ...name, percentage } : null;
        }

        // Stored in dollars, sent in cents.
        const amount = Math.round(option.value * 100);
        return amount > 0 ? { ...name, amount } : null;
      })
      // A zero or negative suggestion is not a tip. It is also already on the
      // screen as "No Tip", so sending one would duplicate the device's own
      // option — and one of the four hardcoded arrays this replaces did contain
      // a literal 0.
      .filter(
        (suggestion): suggestion is CloverTipSuggestion => suggestion !== null,
      )
  );
}
