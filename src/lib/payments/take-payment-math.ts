import { splitCollected } from "@/lib/payments/split-collected";

// ============================================================================
// The Take payment dialog's arithmetic — the client's mock (2026-10-03), in
// cents, with the supply, its tax and the tip kept apart the way the ledger
// keeps them (20260819210000).
//
//   Balance due        what is owed now, tax included
//   Collecting now     all of it, or the custom amount (never more)
//   Account credit     taken first, up to what is being collected
//   Tip                on top, on the pre-tax supply being paid
//   Total to collect   what the method(s) take: collecting − credit + tip
//
// One method, or two: a split with a typed first share, or a gift card that
// covers only part. Each leg carries its share of the supply, the tax and the
// tip, and the shares add back to exactly the total — the last leg takes the
// remainder of each figure, so no cent goes missing or appears twice.
//
// A promo code is a LINE on the bill the moment it is applied, so the balance
// already carries it. Nothing here subtracts it a second time.
// ============================================================================

export type PayMethod = "card" | "terminal" | "cash" | "gift" | "etransfer";

/**
 * Which methods can take a tip picked on this screen. The terminal asks the
 * customer itself, cash leaves the change to the customer, and a gift card
 * cannot pay a tip at all (`pay_booking_with_gift_card` refuses one).
 */
export function carriesTip(method: PayMethod | null | undefined): boolean {
  return method === "card" || method === "etransfer";
}

export interface TillLeg {
  method: PayMethod;
  totalCents: number;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
}

export interface TillFigures {
  /** Owed now, tax included — the dialog's "Balance due". */
  balanceCents: number;
  /** What is paid now, before the credit and the tip. */
  collect: { subtotalCents: number; taxCents: number; totalCents: number };
  credit: { usedCents: number; subtotalCents: number; taxCents: number };
  tipCents: number;
  /** What the method(s) take: collecting − credit + tip. */
  dueCents: number;
  legs: TillLeg[];
  /** Owed once this payment lands, tax included. */
  remainingCents: number;
}

export function workOutTill(input: {
  /** The pre-tax supply owed now, after the discounts the till applies. */
  supplyOwedCents: number;
  /** The facility's tax on a supply of so many cents. */
  taxFor: (supplyCents: number) => number;
  mode: "full" | "custom";
  /** The custom amount typed, tax included. */
  customCents: number | null;
  creditAvailableCents: number;
  useCredit: boolean;
  tipCents: number;
  method: PayMethod | null;
  /** A second method: the split, or the rest of a gift card's share. */
  second: { method: PayMethod | null; firstCents: number } | null;
}): TillFigures {
  const supplyOwed = Math.max(0, Math.round(input.supplyOwedCents));
  const taxOwed = supplyOwed > 0 ? input.taxFor(supplyOwed) : 0;
  const balanceCents = supplyOwed + taxOwed;

  const collect =
    input.mode === "full"
      ? {
          subtotalCents: supplyOwed,
          taxCents: taxOwed,
          totalCents: balanceCents,
        }
      : splitCollected(input.customCents ?? 0, supplyOwed, input.taxFor);

  const usedCents = input.useCredit
    ? Math.max(0, Math.min(input.creditAvailableCents, collect.totalCents))
    : 0;
  const creditTax =
    collect.totalCents > 0
      ? Math.round((collect.taxCents * usedCents) / collect.totalCents)
      : 0;
  const credit = {
    usedCents,
    subtotalCents: usedCents - creditTax,
    taxCents: creditTax,
  };

  const methodSupply = collect.subtotalCents - credit.subtotalCents;
  const methodTax = collect.taxCents - credit.taxCents;
  const tipCents = Math.max(0, Math.round(input.tipCents));
  const dueCents = methodSupply + methodTax + tipCents;

  // The legs' totals: one method takes it all, or the first takes its typed
  // share and the second the rest.
  const totals: { method: PayMethod; totalCents: number }[] = [];
  if (dueCents > 0 && input.method) {
    const first = input.second
      ? Math.max(0, Math.min(dueCents, Math.round(input.second.firstCents)))
      : dueCents;
    totals.push({ method: input.method, totalCents: first });
    if (input.second && dueCents - first > 0 && input.second.method) {
      totals.push({
        method: input.second.method,
        totalCents: dueCents - first,
      });
    }
  }

  const legs: TillLeg[] = [];
  let usedSupply = 0;
  let usedTax = 0;
  let usedTip = 0;
  const allocated = totals.reduce((sum, leg) => sum + leg.totalCents, 0);
  totals.forEach((leg, i) => {
    const last = i === totals.length - 1 && allocated === dueCents;
    let tax: number;
    let tip: number;
    let supply: number;
    if (last) {
      tax = methodTax - usedTax;
      tip = tipCents - usedTip;
      supply = methodSupply - usedSupply;
    } else {
      const share = dueCents > 0 ? leg.totalCents / dueCents : 0;
      tax = Math.round(methodTax * share);
      tip = Math.round(tipCents * share);
      supply = leg.totalCents - tax - tip;
    }
    usedSupply += supply;
    usedTax += tax;
    usedTip += tip;
    legs.push({
      method: leg.method,
      totalCents: supply + tax + tip,
      subtotalCents: supply,
      taxCents: tax,
      tipCents: tip,
    });
  });

  return {
    balanceCents,
    collect,
    credit,
    tipCents,
    dueCents,
    legs,
    remainingCents: Math.max(0, balanceCents - collect.totalCents),
  };
}

/**
 * The quick amounts under "Amount received": exact, then rounded up to the
 * next 5, 20 and 50 — each once, as the mock offers them.
 */
export function cashQuickAmounts(amountCents: number): number[] {
  if (amountCents <= 0) return [];
  const up = (step: number) => Math.ceil(amountCents / step) * step;
  return [amountCents, up(500), up(2000), up(5000)].filter(
    (value, i, all) => value > 0 && all.indexOf(value) === i,
  );
}

export type TillBlock =
  | { key: "enterAmount" }
  | { key: "askCredit" }
  | { key: "chooseMethod" }
  | { key: "checkGift" }
  | { key: "chooseSecond"; amountCents: number }
  | { key: "cashShort" }
  | { key: "chooseCard" }
  | { key: "chooseReader" }
  | { key: "cardNotReady" };

/**
 * Why the payment cannot be taken yet, in the mock's order — or null. The
 * button stays disabled while there is one, and the reason is said beside it.
 */
export function tillBlock(input: {
  figures: TillFigures;
  mode: "full" | "custom";
  creditUndecided: boolean;
  method: PayMethod | null;
  giftChecked: boolean;
  /** A split, or a gift card that covers only part. */
  needsSecond: boolean;
  secondMethod: PayMethod | null;
  cashGivenCents: number | null;
  cardChosen: boolean;
  cardReady: boolean;
  readerChosen: boolean;
}): TillBlock | null {
  const f = input.figures;
  if (input.creditUndecided) return { key: "askCredit" };
  if (input.mode === "custom" && f.collect.totalCents <= 0) {
    return { key: "enterAmount" };
  }
  if (f.dueCents > 0 && !input.method) return { key: "chooseMethod" };
  if (f.dueCents <= 0) return null;
  if (input.method === "gift" && !input.giftChecked)
    return { key: "checkGift" };
  const rest = f.dueCents - (f.legs[0]?.totalCents ?? 0);
  if (input.needsSecond && rest > 0 && !input.secondMethod) {
    return { key: "chooseSecond", amountCents: rest };
  }
  const usesCard = f.legs.some((leg) => leg.method === "card");
  if (usesCard && !input.cardChosen) return { key: "chooseCard" };
  if (usesCard && !input.cardReady) return { key: "cardNotReady" };
  if (f.legs.some((leg) => leg.method === "terminal") && !input.readerChosen) {
    return { key: "chooseReader" };
  }
  const cash = f.legs.find((leg) => leg.method === "cash");
  if (
    cash &&
    input.cashGivenCents !== null &&
    input.cashGivenCents < cash.totalCents
  ) {
    return { key: "cashShort" };
  }
  return null;
}

/** The submit button's words, as the mock says them per method. */
export function submitWording(
  figures: TillFigures,
  method: PayMethod | null,
):
  | { key: "applyCredit"; amountCents: number }
  | { key: "confirm" }
  | { key: "collect"; amountCents: number }
  | { key: "charge"; amountCents: number }
  | { key: "sendToReader"; amountCents: number }
  | { key: "recordCash"; amountCents: number }
  | { key: "redeem"; amountCents: number }
  | { key: "recordETransfer" } {
  const due = figures.dueCents;
  if (due <= 0) {
    return figures.credit.usedCents > 0
      ? { key: "applyCredit", amountCents: figures.credit.usedCents }
      : { key: "confirm" };
  }
  if (figures.legs.length > 1) return { key: "collect", amountCents: due };
  switch (method) {
    case "card":
      return { key: "charge", amountCents: due };
    case "terminal":
      return { key: "sendToReader", amountCents: due };
    case "cash":
      return { key: "recordCash", amountCents: due };
    case "gift":
      return { key: "redeem", amountCents: due };
    case "etransfer":
      return { key: "recordETransfer" };
    default:
      return { key: "collect", amountCents: due };
  }
}
