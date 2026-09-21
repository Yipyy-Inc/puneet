import { describe, expect, test } from "bun:test";

import {
  chargesTax,
  taxableFraction,
  taxableOwedCents,
} from "@/lib/payments/service-tax";

// ============================================================================
// A service that is not taxed, and a balance that is partly both.
//
// The client, 2026-09-21: "if they want to skip taxes for any service we can
// unselect taxes". These are the two things that can go wrong with that.
//
// FIRST, the default. Every one of these schemas made `taxable` optional, and
// an optional boolean read the wrong way round stops a facility collecting tax
// it owes — silently, on every booking, until their accountant finds it. So
// the absent, null, undefined and malformed cases are asserted explicitly
// rather than left to read as obvious.
//
// SECOND, the split. `amount_due` is the service PLUS whatever was added at
// the counter, and a payment does not say which part it settled. A treat sold
// alongside a tax-free service is still taxable.
// ============================================================================

describe("chargesTax — only `false` stops the tax", () => {
  test("an explicit false is the one way out", () => {
    expect(chargesTax({ taxable: false })).toBe(false);
  });

  test("true charges tax", () => {
    expect(chargesTax({ taxable: true })).toBe(true);
  });

  test("a rate saved before the field existed charges tax", () => {
    expect(chargesTax({})).toBe(true);
  });

  test("a rate that no longer exists charges tax", () => {
    // Every caller is looking something up that may have been deleted. A
    // deleted rate is not a reason to stop taxing a booking that used it.
    expect(chargesTax(null)).toBe(true);
    expect(chargesTax(undefined)).toBe(true);
  });

  test("a value that is not a boolean charges tax", () => {
    // Postgres jsonb and a hand-edited settings row can both produce these.
    // Anything that is not literally `false` is taxed.
    const junk = [0, "", "false", "no", null] as unknown[];
    for (const taxable of junk) {
      expect(chargesTax({ taxable } as { taxable?: boolean })).toBe(true);
    }
  });
});

describe("taxableFraction — extras are not the service", () => {
  test("a taxable service taxes the whole bill", () => {
    expect(
      taxableFraction({
        totalCost: 80,
        extrasTotal: 20,
        serviceTaxable: true,
      }),
    ).toBe(1);
  });

  test("an exempt service with nothing added taxes nothing", () => {
    expect(
      taxableFraction({
        totalCost: 80,
        extrasTotal: 0,
        serviceTaxable: false,
      }),
    ).toBe(0);
  });

  test("an exempt service with extras taxes only the extras", () => {
    // $80 tax-free training, a $20 bag of food at the counter. The food is a
    // supply of its own and the retail counter would tax it, so this does too.
    expect(
      taxableFraction({
        totalCost: 80,
        extrasTotal: 20,
        serviceTaxable: false,
      }),
    ).toBeCloseTo(0.2, 10);
  });

  test("a bill of nothing is taxable rather than a division by zero", () => {
    expect(
      taxableFraction({ totalCost: 0, extrasTotal: 0, serviceTaxable: false }),
    ).toBe(1);
  });

  test("a negative price cannot make the fraction negative", () => {
    // A credit or a correction should never produce a NEGATIVE tax base, which
    // would turn a charge into a refund of tax nobody paid.
    const f = taxableFraction({
      totalCost: -50,
      extrasTotal: 10,
      serviceTaxable: false,
    });
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(1);
  });

  test("NaN is treated as nothing, not as a fraction of NaN", () => {
    const f = taxableFraction({
      totalCost: Number.NaN,
      extrasTotal: 20,
      serviceTaxable: false,
    });
    expect(Number.isFinite(f)).toBe(true);
    expect(f).toBe(1);
  });
});

describe("taxableOwedCents — a part payment is split in proportion", () => {
  const exemptWithExtras = {
    totalCost: 80,
    extrasTotal: 20,
    serviceTaxable: false,
  };

  test("a fully taxable booking is returned to the cent, unchanged", () => {
    // The overwhelmingly common case: every facility that never opens the
    // switch. It must not move by a rounding error.
    for (const owed of [1, 7, 99, 4999, 123_457]) {
      expect(
        taxableOwedCents(owed, {
          totalCost: 80,
          extrasTotal: 20,
          serviceTaxable: true,
        }),
      ).toBe(owed);
    }
  });

  test("the whole balance of an exempt bill taxes only the extras", () => {
    expect(taxableOwedCents(10_000, exemptWithExtras)).toBe(2_000);
  });

  test("half the balance taxes half the extras", () => {
    expect(taxableOwedCents(5_000, exemptWithExtras)).toBe(1_000);
  });

  test("two half payments tax the same as one whole one", () => {
    // A booking paid in two goes must not collect more or less tax than the
    // same booking paid once. Rounding is the only thing that could break it.
    const whole = taxableOwedCents(10_000, exemptWithExtras);
    const halves =
      taxableOwedCents(5_000, exemptWithExtras) +
      taxableOwedCents(5_000, exemptWithExtras);
    expect(halves).toBe(whole);
  });

  test("nothing owed is nothing taxed", () => {
    expect(taxableOwedCents(0, exemptWithExtras)).toBe(0);
    expect(taxableOwedCents(-500, exemptWithExtras)).toBe(0);
  });

  test("the taxable base never exceeds what is owed", () => {
    // The invariant that stops a tax line larger than the charge it sits on.
    for (const owed of [1, 3, 17, 999, 100_001]) {
      expect(taxableOwedCents(owed, exemptWithExtras)).toBeLessThanOrEqual(
        owed,
      );
    }
  });

  test("an exempt service with no extras is charged no tax at all", () => {
    expect(
      taxableOwedCents(9_900, {
        totalCost: 99,
        extrasTotal: 0,
        serviceTaxable: false,
      }),
    ).toBe(0);
  });
});
