import { describe, expect, test } from "bun:test";

import { taxToAddCents } from "@/lib/payments/booking-tax";
import {
  carriesTip,
  cashQuickAmounts,
  submitWording,
  tillBlock,
  workOutTill,
  type TillFigures,
} from "@/lib/payments/take-payment-math";
import { NO_TAX, type TaxConfig } from "@/lib/settings/tax";

// ============================================================================
// The Take payment dialog's arithmetic (the client's mock, 2026-10-03): every
// leg carries its share of supply, tax and tip, and the shares add back to
// exactly what is collected.
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
const bill = { total_cost: 400, extras_total: 0, taxable: true };
const quebecTax = (cents: number) => taxToAddCents(QUEBEC, cents, bill);
const noTax = () => 0;

const base = {
  supplyOwedCents: 40_000,
  taxFor: quebecTax,
  mode: "full" as const,
  customCents: null,
  creditAvailableCents: 0,
  useCredit: false,
  tipCents: 0,
  method: "cash" as const,
  second: null,
};

const sumLegs = (f: TillFigures) =>
  f.legs.reduce(
    (sum, leg) => ({
      supply: sum.supply + leg.subtotalCents,
      tax: sum.tax + leg.taxCents,
      tip: sum.tip + leg.tipCents,
      total: sum.total + leg.totalCents,
    }),
    { supply: 0, tax: 0, tip: 0, total: 0 },
  );

describe("the balance and the full payment", () => {
  test("the balance carries the facility's tax", () => {
    const f = workOutTill(base);
    expect(f.balanceCents).toBe(40_000 + quebecTax(40_000));
    expect(f.dueCents).toBe(f.balanceCents);
    expect(f.legs).toHaveLength(1);
    expect(f.legs[0]).toMatchObject({
      method: "cash",
      subtotalCents: 40_000,
      taxCents: quebecTax(40_000),
      tipCents: 0,
    });
    expect(f.remainingCents).toBe(0);
  });

  test("nothing owed is nothing to collect", () => {
    const f = workOutTill({ ...base, supplyOwedCents: 0 });
    expect(f.balanceCents).toBe(0);
    expect(f.dueCents).toBe(0);
    expect(f.legs).toHaveLength(0);
  });
});

describe("account credit", () => {
  test("is taken first, up to what is collected, with its share of tax", () => {
    const f = workOutTill({
      ...base,
      creditAvailableCents: 5_000,
      useCredit: true,
    });
    expect(f.credit.usedCents).toBe(5_000);
    expect(f.credit.subtotalCents + f.credit.taxCents).toBe(5_000);
    expect(f.dueCents).toBe(f.balanceCents - 5_000);
    const legs = sumLegs(f);
    // Credit and the method add back to the whole balance, to the cent.
    expect(legs.supply + f.credit.subtotalCents).toBe(40_000);
    expect(legs.tax + f.credit.taxCents).toBe(quebecTax(40_000));
  });

  test("more credit than the bill pays the bill and leaves the rest", () => {
    const f = workOutTill({
      ...base,
      creditAvailableCents: 100_000,
      useCredit: true,
    });
    expect(f.credit.usedCents).toBe(f.balanceCents);
    expect(f.dueCents).toBe(0);
    expect(f.legs).toHaveLength(0);
    expect(submitWording(f, "cash")).toEqual({
      key: "applyCredit",
      amountCents: f.balanceCents,
    });
  });

  test("switched off, none is used", () => {
    const f = workOutTill({ ...base, creditAvailableCents: 5_000 });
    expect(f.credit.usedCents).toBe(0);
    expect(f.dueCents).toBe(f.balanceCents);
  });
});

describe("a custom amount", () => {
  test("is read back into supply and tax, never above what was typed", () => {
    const f = workOutTill({ ...base, mode: "custom", customCents: 10_000 });
    expect(f.collect.totalCents).toBeLessThanOrEqual(10_000);
    expect(f.collect.subtotalCents + quebecTax(f.collect.subtotalCents)).toBe(
      f.collect.totalCents,
    );
    expect(f.remainingCents).toBe(f.balanceCents - f.collect.totalCents);
  });

  test("above the balance is the balance", () => {
    const f = workOutTill({ ...base, mode: "custom", customCents: 999_999 });
    expect(f.collect.totalCents).toBe(f.balanceCents);
    expect(f.remainingCents).toBe(0);
  });

  test("empty blocks with 'Enter an amount'", () => {
    const f = workOutTill({ ...base, mode: "custom", customCents: null });
    expect(
      tillBlock({
        figures: f,
        mode: "custom",
        creditUndecided: false,
        method: "cash",
        giftChecked: false,
        needsSecond: false,
        secondMethod: null,
        cashGivenCents: null,
        cardChosen: false,
        cardReady: false,
        readerChosen: false,
      }),
    ).toEqual({ key: "enterAmount" });
  });
});

describe("the tip", () => {
  test("is on top, and only a card or an e-transfer carries one", () => {
    expect(carriesTip("card")).toBe(true);
    expect(carriesTip("etransfer")).toBe(true);
    expect(carriesTip("cash")).toBe(false);
    expect(carriesTip("terminal")).toBe(false);
    expect(carriesTip("gift")).toBe(false);
    const f = workOutTill({ ...base, method: "card", tipCents: 6_000 });
    expect(f.dueCents).toBe(f.balanceCents + 6_000);
    expect(f.legs[0].tipCents).toBe(6_000);
  });
});

describe("two methods", () => {
  test("a split gives each leg its share, and they add back exactly", () => {
    const f = workOutTill({
      ...base,
      taxFor: quebecTax,
      method: "card",
      tipCents: 1_234,
      second: { method: "etransfer", firstCents: 20_000 },
    });
    expect(f.legs.map((leg) => leg.method)).toEqual(["card", "etransfer"]);
    expect(f.legs[0].totalCents).toBe(20_000);
    const legs = sumLegs(f);
    expect(legs.total).toBe(f.dueCents);
    expect(legs.supply).toBe(40_000);
    expect(legs.tax).toBe(quebecTax(40_000));
    expect(legs.tip).toBe(1_234);
  });

  test("a gift card covering part asks how to pay the rest", () => {
    const f = workOutTill({
      ...base,
      taxFor: noTax,
      method: "gift",
      second: { method: null, firstCents: 7_500 },
    });
    expect(f.legs).toHaveLength(1);
    expect(f.legs[0].totalCents).toBe(7_500);
    expect(
      tillBlock({
        figures: f,
        mode: "full",
        creditUndecided: false,
        method: "gift",
        giftChecked: true,
        needsSecond: true,
        secondMethod: null,
        cashGivenCents: null,
        cardChosen: false,
        cardReady: false,
        readerChosen: false,
      }),
    ).toEqual({ key: "chooseSecond", amountCents: 32_500 });
  });
});

describe("what stops the button, and what it says", () => {
  const blocked = (over: Partial<Parameters<typeof tillBlock>[0]>) =>
    tillBlock({
      figures: workOutTill({ ...base, taxFor: noTax }),
      mode: "full",
      creditUndecided: false,
      method: "cash",
      giftChecked: false,
      needsSecond: false,
      secondMethod: null,
      cashGivenCents: null,
      cardChosen: false,
      cardReady: false,
      readerChosen: false,
      ...over,
    });

  test("credit in 'ask' mode is asked about first", () => {
    expect(blocked({ creditUndecided: true })).toEqual({ key: "askCredit" });
  });
  test("cash short of the amount", () => {
    expect(blocked({ cashGivenCents: 100 })).toEqual({ key: "cashShort" });
    expect(blocked({ cashGivenCents: 40_000 })).toBeNull();
  });
  test("a gift card is checked before it is redeemed", () => {
    expect(
      blocked({
        method: "gift",
        figures: workOutTill({ ...base, taxFor: noTax, method: "gift" }),
      }),
    ).toEqual({ key: "checkGift" });
  });
  test("a terminal needs a reader", () => {
    expect(
      blocked({
        method: "terminal",
        figures: workOutTill({ ...base, taxFor: noTax, method: "terminal" }),
      }),
    ).toEqual({ key: "chooseReader" });
  });
  test("the words follow the method", () => {
    const f = workOutTill({ ...base, taxFor: noTax });
    expect(submitWording(f, "card")).toEqual({
      key: "charge",
      amountCents: 40_000,
    });
    expect(submitWording(f, "terminal")).toEqual({
      key: "sendToReader",
      amountCents: 40_000,
    });
    expect(submitWording(f, "etransfer")).toEqual({ key: "recordETransfer" });
  });
});

describe("cash quick amounts", () => {
  test("exact, then up to 5, 20 and 50, each once", () => {
    // $376.70: up to $5 and up to $20 are both $380, offered once.
    expect(cashQuickAmounts(37_670)).toEqual([37_670, 38_000, 40_000]);
    expect(cashQuickAmounts(4_100)).toEqual([4_100, 4_500, 6_000, 5_000]);
    expect(cashQuickAmounts(4_000)).toEqual([4_000, 5_000]);
    expect(cashQuickAmounts(0)).toEqual([]);
  });
});
