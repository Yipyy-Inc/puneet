import { describe, expect, test } from "bun:test";

import { planSplit } from "@/lib/checkout/plan-split";

const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100);

describe("planSplit", () => {
  test("two typed parts carry their share of tax and tip, and add back exactly", () => {
    // $100 supply, $14.98 tax, $10 tip = $124.98, paid $60 cash + the rest by e-transfer.
    const plan = planSplit({
      subtotal: 100,
      tax: 14.98,
      tip: 10,
      rows: [
        { method: "cash", amount: 60 },
        { method: "e_transfer", amount: 64.98 },
      ],
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const [a, b] = plan.parts;
    expect(a.total).toBe(60);
    expect(b.total).toBe(64.98);
    expect(sum([a.subtotal, b.subtotal])).toBe(10000);
    expect(sum([a.tax, b.tax])).toBe(1498);
    expect(sum([a.tip, b.tip])).toBe(1000);
  });

  test("a card takes the rest, last, whatever order it was typed in", () => {
    const plan = planSplit({
      subtotal: 80,
      tax: 0,
      tip: 0,
      rows: [
        { method: "terminal", amount: 0 },
        { method: "cash", amount: 30 },
      ],
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.parts.map((p) => p.method)).toEqual(["cash", "terminal"]);
    expect(plan.parts[1].takesTheRest).toBe(true);
    expect(plan.parts[1].subtotal).toBe(50);
  });

  test("typed parts must add up to the bill when no card takes the rest", () => {
    const short = planSplit({
      subtotal: 50,
      tax: 0,
      tip: 0,
      rows: [{ method: "cash", amount: 20 }],
    });
    expect(short.ok).toBe(false);
    const over = planSplit({
      subtotal: 50,
      tax: 0,
      tip: 0,
      rows: [
        { method: "cash", amount: 30 },
        { method: "e_transfer", amount: 30 },
      ],
    });
    expect(over.ok).toBe(false);
  });

  test("two cards, or a card with nothing left for it, is refused", () => {
    expect(
      planSplit({
        subtotal: 50,
        tax: 0,
        tip: 0,
        rows: [
          { method: "terminal", amount: 0 },
          { method: "card_on_file", amount: 0 },
        ],
      }).ok,
    ).toBe(false);
    expect(
      planSplit({
        subtotal: 50,
        tax: 0,
        tip: 0,
        rows: [
          { method: "cash", amount: 50 },
          { method: "terminal", amount: 0 },
        ],
      }).ok,
    ).toBe(false);
  });

  test("three thirds of an odd cent still add back to the bill", () => {
    const plan = planSplit({
      subtotal: 10,
      tax: 1.5,
      tip: 0,
      rows: [
        { method: "cash", amount: 3.83 },
        { method: "cash", amount: 3.83 },
        { method: "e_transfer", amount: 3.84 },
      ],
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(sum(plan.parts.map((p) => p.total))).toBe(1150);
    expect(sum(plan.parts.map((p) => p.tax))).toBe(150);
    expect(plan.parts.every((p) => p.subtotal >= 0 && p.tip >= 0)).toBe(true);
  });
});
