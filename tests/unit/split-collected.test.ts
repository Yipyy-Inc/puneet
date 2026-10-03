import { describe, expect, test } from "bun:test";

import { taxToAddCents } from "@/lib/payments/booking-tax";
import { splitCollected } from "@/lib/payments/split-collected";
import { NO_TAX, type TaxConfig } from "@/lib/settings/tax";

// ============================================================================
// A part payment read back into supply and tax — with the same tax function
// the card routes charge with, so the figure on the payment dialog's button
// is the figure the card is asked for.
// ============================================================================

const QUEBEC: TaxConfig = {
  ...NO_TAX,
  province: "QC",
  taxes: [
    {
      id: "gst",
      name: "GST",
      rate: 0.05,
      enabled: true,
      isCompound: false,
      appliesTo: "all",
      registrationNumber: "",
    },
    {
      id: "qst",
      name: "QST",
      rate: 0.09975,
      enabled: true,
      isCompound: false,
      appliesTo: "all",
      registrationNumber: "",
    },
  ] as TaxConfig["taxes"],
};

const taxed = { total_cost: 400, extras_total: 0, taxable: true };
const taxOn =
  (config: TaxConfig, bill = taxed) =>
  (cents: number) =>
    taxToAddCents(config, cents, bill);

describe("splitCollected", () => {
  test("$100.00 handed over under GST and QST is $86.97 of service and $13.03 of tax", () => {
    expect(splitCollected(10_000, 40_000, taxOn(QUEBEC))).toEqual({
      subtotalCents: 8_697,
      taxCents: 1_303,
      totalCents: 10_000,
    });
  });

  test("never a cent above what was asked", () => {
    for (let collected = 1; collected <= 3_000; collected += 7) {
      const split = splitCollected(collected, 40_000, taxOn(QUEBEC));
      expect(split.totalCents).toBeLessThanOrEqual(collected);
      // …and the tax is exactly what a card route would add to that supply.
      expect(split.taxCents).toBe(taxOn(QUEBEC)(split.subtotalCents));
      // One more cent of supply would have gone over.
      if (split.subtotalCents < 40_000) {
        const next = split.subtotalCents + 1;
        expect(next + taxOn(QUEBEC)(next)).toBeGreaterThan(collected);
      }
    }
  });

  test("more than the balance is the balance", () => {
    const full = taxOn(QUEBEC)(40_000);
    expect(splitCollected(99_999, 40_000, taxOn(QUEBEC))).toEqual({
      subtotalCents: 40_000,
      taxCents: full,
      totalCents: 40_000 + full,
    });
  });

  test("no tax: the figure is the supply", () => {
    expect(splitCollected(2_550, 40_000, taxOn(NO_TAX))).toEqual({
      subtotalCents: 2_550,
      taxCents: 0,
      totalCents: 2_550,
    });
  });

  test("prices that include tax add nothing at the till", () => {
    const inclusive = { ...QUEBEC, pricesIncludeTax: true };
    expect(splitCollected(5_000, 40_000, taxOn(inclusive))).toEqual({
      subtotalCents: 5_000,
      taxCents: 0,
      totalCents: 5_000,
    });
  });

  test("a tax-free service carries no tax on its part payment", () => {
    const exempt = { total_cost: 400, extras_total: 0, taxable: false };
    expect(splitCollected(5_000, 40_000, taxOn(QUEBEC, exempt))).toEqual({
      subtotalCents: 5_000,
      taxCents: 0,
      totalCents: 5_000,
    });
  });

  test("nothing asked, or nothing owed, is nothing", () => {
    expect(splitCollected(0, 40_000, taxOn(QUEBEC)).totalCents).toBe(0);
    expect(splitCollected(-5, 40_000, taxOn(QUEBEC)).totalCents).toBe(0);
    expect(splitCollected(5_000, 0, taxOn(QUEBEC)).totalCents).toBe(0);
  });
});
