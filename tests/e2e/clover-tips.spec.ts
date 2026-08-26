import { expect, test } from "@playwright/test";

import { activeTipTier, cloverTipSuggestions } from "@/lib/tips";
import type { TipConfig, TipOption } from "@/types/facility";

// ============================================================================
// The tips a facility offers, as the Clover terminal is told them.
//
// ── WHY THIS SPEC EXISTS, AND WHY IT DRIVES NO BROWSER ────────────────────
//
// A facility configures its tips once at Settings → Tips. Those three options
// are sent to the card reader with /device/read-tip, so the customer taps the
// facility's own tips instead of whatever was configured on the hardware.
//
// It cannot be reached through a browser: the assertion is about a JSON body
// handed to a physical terminal. So the mapping lives in `lib/tips.ts` with no
// imports of its own and is asserted here directly — Playwright only as the
// runner this repo already has. A spec in no suite is not coverage.
//
// ── WHAT IS ACTUALLY AT RISK ──────────────────────────────────────────────
//
// Clover reads `percentage` as a WHOLE integer and `amount` as CENTS, while
// Yipyy stores fixed tips in DOLLARS. Get that wrong and a $5 tip suggestion
// reaches the reader as five cents — money, in front of a customer.
// ============================================================================

const pct = (value: number, label?: string): TipOption =>
  label === undefined
    ? { type: "percentage", value }
    : { type: "percentage", value, label };

const fixed = (value: number, label?: string): TipOption =>
  label === undefined
    ? { type: "fixed", value }
    : { type: "fixed", value, label };

/** A facility offering 15/18/20%, which is the shipped default. */
function config(overrides: Partial<TipConfig> = {}): TipConfig {
  return {
    enabled: true,
    mode: "general",
    general: {
      options: [pct(15, "Good job"), pct(18, "Excellent job"), pct(20)],
      preferredIndex: 1,
    },
    smart: {
      thresholdAmount: 50,
      belowThreshold: {
        options: [fixed(5), fixed(10), fixed(15)],
        preferredIndex: 0,
      },
      aboveThreshold: {
        options: [pct(15), pct(18), pct(20)],
        preferredIndex: 1,
      },
    },
    ...overrides,
  };
}

test.describe("the tips sent to a Clover terminal", () => {
  test("percentages go as whole integers, with their labels", async () => {
    expect(cloverTipSuggestions(config(), 100)).toEqual([
      { name: "Good job", percentage: 15 },
      { name: "Excellent job", percentage: 18 },
      // No label configured. Clover then displays the figure itself, which is
      // better than an empty caption on a card reader.
      { percentage: 20 },
    ]);
  });

  test("a fixed tip is stored in DOLLARS and sent in CENTS", async () => {
    // The bug this exists to prevent: $5 arriving at the reader as $0.05.
    const suggestions = cloverTipSuggestions(
      config({
        mode: "general",
        general: {
          options: [fixed(5), fixed(10, "Generous"), fixed(2.5)],
          preferredIndex: 0,
        },
      }),
      100,
    );

    expect(suggestions).toEqual([
      { amount: 500 },
      { name: "Generous", amount: 1000 },
      { amount: 250 },
    ]);
  });

  test("tips switched off produce nothing at all", async () => {
    expect(cloverTipSuggestions(config({ enabled: false }), 100)).toEqual([]);
  });

  test("no Custom and no No-Tip entry is ever sent", async () => {
    // Clover documents that "the options 'custom tip' and 'no tip' are always
    // offered". Sending our own would show the customer two of each — and one
    // of the four hardcoded arrays this replaced did contain a literal 0.
    const suggestions = cloverTipSuggestions(
      config({
        mode: "general",
        general: {
          options: [pct(0, "No tip"), pct(15), pct(20)],
          preferredIndex: 1,
        },
      }),
      100,
    );

    expect(suggestions).toEqual([{ percentage: 15 }, { percentage: 20 }]);
    expect(
      suggestions.some((s) => s.percentage === 0 || s.amount === 0),
      "a zero suggestion duplicates the device's own No Tip",
    ).toBe(false);
  });

  test("a fractional percentage is rounded, not dropped or rejected", async () => {
    // Clover takes an integer. 17.5 must become 18 rather than a malformed
    // payload that fails the whole tip prompt at the counter.
    expect(
      cloverTipSuggestions(
        config({
          mode: "general",
          general: {
            options: [pct(17.5), pct(18), pct(20)],
            preferredIndex: 0,
          },
        }),
        100,
      )[0],
    ).toEqual({ percentage: 18 });
  });

  test("smart mode picks its tier from the amount, inclusive from above", async () => {
    const smart = config({ mode: "smart" });

    // Under the threshold: the dollar tier.
    expect(cloverTipSuggestions(smart, 49.99)).toEqual([
      { amount: 500 },
      { amount: 1000 },
      { amount: 1500 },
    ]);

    // AT the threshold the ABOVE tier applies — the rule the screens have
    // always used, and now the terminal uses the same one.
    expect(cloverTipSuggestions(smart, 50)).toEqual([
      { percentage: 15 },
      { percentage: 18 },
      { percentage: 20 },
    ]);
  });

  test("the tier rule is the one the screens render", async () => {
    // `TipSelector` calls this same function, so a divergence between what a
    // customer sees online and what the reader shows cannot be introduced in
    // one place only.
    const smart = config({ mode: "smart" });
    expect(activeTipTier(smart, 10)).toBe(smart.smart.belowThreshold);
    expect(activeTipTier(smart, 500)).toBe(smart.smart.aboveThreshold);

    // `toBe` is reference equality, so the SAME object has to be compared —
    // `config()` builds a fresh one on every call.
    const general = config();
    expect(activeTipTier(general, 500)).toBe(general.general);
  });
});
