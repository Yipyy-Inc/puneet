import { describe, expect, test } from "bun:test";

import { estimateTotals } from "@/lib/api/mappers/estimate";

// ============================================================================
// A quote that does not tax what the facility does not tax.
//
// `estimateTotals` is the authority: POST /api/estimates recomputes every
// quote with it and never stores a client-sent total. So these are the numbers
// the customer actually receives, not a preview.
//
// ── WHY PER LINE ──────────────────────────────────────────────────────────
//
// A booking splits cleanly — `total_cost` and `extras_total` are separate
// columns, so "service exempt, extras taxed" is two numbers. An estimate's
// `line_items` is one flat array of {label, amount, quantity}, with no
// service/extras boundary for an estimate-level flag to apply to. Per line is
// the only shape that fits, and it is what retail already does per product.
// ============================================================================

const line = (amount: number, quantity = 1, taxable?: boolean) => ({
  amount,
  quantity,
  ...(taxable === undefined ? {} : { taxable }),
});

const GST_QST = 0.14975;

describe("estimateTotals — nothing changes for an ordinary quote", () => {
  test("every line taxed is the arithmetic it always was", () => {
    const t = estimateTotals({
      lineItems: [line(100, 2), line(50)],
      discount: 0,
      taxRate: 0.05,
    });
    expect(t.subtotal).toBe(250);
    expect(t.taxAmount).toBe(12.5);
    expect(t.total).toBe(262.5);
  });

  test("a line with no `taxable` field is taxed", () => {
    // Every estimate written before the field existed. It must quote exactly
    // what it quoted yesterday.
    const withField = estimateTotals({
      lineItems: [line(200, 1, true)],
      discount: 0,
      taxRate: 0.1,
    });
    const without = estimateTotals({
      lineItems: [line(200)],
      discount: 0,
      taxRate: 0.1,
    });
    expect(without).toEqual(withField);
    expect(without.taxAmount).toBe(20);
  });
});

describe("estimateTotals — a tax-free line is not taxed", () => {
  test("only the taxable lines carry tax", () => {
    // $300 tax-free training, $100 of taxable extras.
    const t = estimateTotals({
      lineItems: [line(300, 1, false), line(100)],
      discount: 0,
      taxRate: 0.1,
    });
    expect(t.subtotal).toBe(400);
    expect(t.taxAmount).toBe(10);
    expect(t.total).toBe(410);
  });

  test("an entirely tax-free quote carries no tax at all", () => {
    const t = estimateTotals({
      lineItems: [line(300, 1, false), line(100, 2, false)],
      discount: 0,
      taxRate: GST_QST,
    });
    expect(t.subtotal).toBe(500);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(500);
  });

  test("the total always equals subtotal - discount + tax", () => {
    // The invariant a customer checks with a calculator.
    for (const discount of [0, 25, 100]) {
      const t = estimateTotals({
        lineItems: [line(300, 1, false), line(100)],
        discount,
        taxRate: 0.1,
      });
      expect(t.total).toBeCloseTo(t.subtotal - t.discount + t.taxAmount, 10);
    }
  });
});

describe("estimateTotals — a discount comes off both, in proportion", () => {
  test("a discount reduces the taxable share proportionally", () => {
    // $300 exempt + $100 taxed = $400, so a quarter of the bill is taxable.
    // A $200 discount leaves $200, of which a quarter — $50 — is taxable.
    const t = estimateTotals({
      lineItems: [line(300, 1, false), line(100)],
      discount: 200,
      taxRate: 0.1,
    });
    expect(t.subtotal).toBe(400);
    expect(t.discount).toBe(200);
    expect(t.taxAmount).toBe(5);
    expect(t.total).toBe(205);
  });

  test("a discount larger than the bill is capped, not negative", () => {
    const t = estimateTotals({
      lineItems: [line(100)],
      discount: 500,
      taxRate: 0.2,
    });
    expect(t.discount).toBe(100);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(0);
  });

  test("an empty quote is zero, not a division by zero", () => {
    const t = estimateTotals({ lineItems: [], discount: 0, taxRate: 0.15 });
    expect(t.subtotal).toBe(0);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe("estimateTotals — the rate keeps all five decimals", () => {
  test("GST + QST is 14.975%, not 15%", () => {
    // `estimates.tax_rate` was numeric(6,3), which stored 0.14975 as 0.150 and
    // over-quoted every Quebec estimate. Widened to numeric(8,5) on
    // 2026-09-21; this is the arithmetic that column has to be able to hold.
    const t = estimateTotals({
      lineItems: [line(2000)],
      discount: 0,
      taxRate: GST_QST,
    });
    expect(t.taxAmount).toBe(299.5);
    expect(t.taxAmount).not.toBe(300);
    expect(t.total).toBe(2299.5);
  });
});
