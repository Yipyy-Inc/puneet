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

// ============================================================================
// A FEE THAT IS NOT A SUPPLY — `taxableExtrasTotal`, added 2026-09-23.
//
// "Extras always are [taxed]" was the rule until a service charge needed to
// say otherwise: a late-payment charge or a no-show penalty is not a sale in
// every jurisdiction, and folding it into the service price to dodge the
// question is exactly what Decision 3 of 20260806820000 forbids.
//
// The first block is the one that matters. Everything written before this
// field existed must answer identically, because `service-tax.ts` is built on
// the asymmetry that under-charging tax is the facility's own money.
// ============================================================================

describe("a bill written before fees could be exempt", () => {
  test("an absent taxable share means every extra is taxed", () => {
    expect(
      taxableFraction({
        totalCost: 100,
        extrasTotal: 50,
        serviceTaxable: false,
      }),
    ).toBeCloseTo(50 / 150, 10);
    expect(
      taxableFraction({
        totalCost: 100,
        extrasTotal: 50,
        serviceTaxable: true,
      }),
    ).toBe(1);
  });

  test("and saying so explicitly gives the same answer", () => {
    // The migration backfills taxable_extras_total = extras_total, so this is
    // what every existing booking will actually send.
    expect(
      taxableFraction({
        totalCost: 100,
        extrasTotal: 50,
        taxableExtrasTotal: 50,
        serviceTaxable: false,
      }),
    ).toBeCloseTo(50 / 150, 10);
    expect(
      taxableFraction({
        totalCost: 100,
        extrasTotal: 50,
        taxableExtrasTotal: 50,
        serviceTaxable: true,
      }),
    ).toBe(1);
  });
});

describe("an exempt fee on a taxed service", () => {
  test("the service is still taxed and the fee is not", () => {
    // $200 service, $15 exempt fee: tax applies to 200 of 215.
    expect(
      taxableFraction({
        totalCost: 200,
        extrasTotal: 15,
        taxableExtrasTotal: 0,
        serviceTaxable: true,
      }),
    ).toBeCloseTo(200 / 215, 10);
  });

  test("a mixture of taxed and exempt extras is split by value", () => {
    // $100 service, $40 of extras of which $10 is exempt.
    expect(
      taxableFraction({
        totalCost: 100,
        extrasTotal: 40,
        taxableExtrasTotal: 30,
        serviceTaxable: true,
      }),
    ).toBeCloseTo(130 / 140, 10);
  });

  test("an exempt fee on an exempt service is taxed on nothing", () => {
    expect(
      taxableFraction({
        totalCost: 100,
        extrasTotal: 25,
        taxableExtrasTotal: 0,
        serviceTaxable: false,
      }),
    ).toBe(0);
    expect(
      taxableOwedCents(12_500, {
        totalCost: 100,
        extrasTotal: 25,
        taxableExtrasTotal: 0,
        serviceTaxable: false,
      }),
    ).toBe(0);
  });

  test("the money owed follows the split, to the cent", () => {
    // 200/215 of a $215 balance is $200.00 of taxable base.
    expect(
      taxableOwedCents(21_500, {
        totalCost: 200,
        extrasTotal: 15,
        taxableExtrasTotal: 0,
        serviceTaxable: true,
      }),
    ).toBe(20_000);
  });
});

describe("a corrupted taxable share never taxes more than the bill", () => {
  test("a share larger than the extras is clamped, not trusted", () => {
    // A row claiming $999 of taxable extras inside $15 of extras is broken.
    // Clamping to the extras keeps the old answer; believing it would tax a
    // base bigger than the charge it sits on.
    expect(
      taxableFraction({
        totalCost: 200,
        extrasTotal: 15,
        taxableExtrasTotal: 999,
        serviceTaxable: true,
      }),
    ).toBe(1);
  });

  test("a negative or non-finite share falls back to taxing the extras", () => {
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        taxableFraction({
          totalCost: 200,
          extrasTotal: 15,
          taxableExtrasTotal: bad,
          serviceTaxable: true,
        }),
        `taxableExtrasTotal=${bad}`,
      ).toBe(1);
    }
  });

  test("the fraction stays inside [0, 1] whatever it is handed", () => {
    const inputs = [
      { totalCost: -50, extrasTotal: 20, taxableExtrasTotal: 10 },
      { totalCost: 0, extrasTotal: 0, taxableExtrasTotal: 0 },
      { totalCost: 100, extrasTotal: -10, taxableExtrasTotal: 5 },
    ];
    for (const bill of inputs) {
      for (const serviceTaxable of [true, false]) {
        const f = taxableFraction({ ...bill, serviceTaxable });
        expect(
          f,
          JSON.stringify({ ...bill, serviceTaxable }),
        ).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });
});
