// ============================================================================
// Dividing one checkout across the tenders a customer paid with.
//
// "Split Payment" collected rows — Cash $40, Card $30 — and sent none of them:
// one payment was recorded for the whole amount under the main tender, and
// the rows only reached the printed receipt. Each part is its own payment now,
// and this is the arithmetic that says what each one records.
//
// ── SUPPLY, TAX AND TIP ARE KEPT APART ────────────────────────────────────
//
// A booking's balance is the pre-tax supply; tax and tip live on the payment
// (20260819210000). So every part carries its proportional share of all
// three, and the shares add back to exactly what was owed — the part's own
// supply is what is left of its typed amount after its tax and tip, so no
// cent of rounding goes missing or appears twice.
//
// ── A CARD TAKES THE REST ─────────────────────────────────────────────────
//
// The terminal and the saved-card route never take an amount: the server
// reads what the booking still owes and charges that (plus its own tax). So a
// card part cannot be "$30" — it can only be LAST, after the typed parts have
// been recorded, taking whatever remains. At most one per checkout.
// ============================================================================

export type SplitMethod =
  | "cash"
  | "e_transfer"
  | "store_credit"
  | "terminal"
  | "card_on_file";

/** Tenders whose amount the server decides — they can only take the rest. */
export const TAKES_THE_REST: ReadonlySet<SplitMethod> = new Set([
  "terminal",
  "card_on_file",
]);

export interface SplitRow {
  method: SplitMethod;
  /** Dollars typed by staff. Ignored for a tender that takes the rest. */
  amount: number;
}

export interface PlannedPart {
  method: SplitMethod;
  subtotal: number;
  tax: number;
  tip: number;
  /** subtotal + tax + tip */
  total: number;
  /** True for the card part: the server decides its figures. */
  takesTheRest: boolean;
}

export type SplitPlan =
  | { ok: true; parts: PlannedPart[] }
  | { ok: false; problem: string };

const cents = (dollars: number) => Math.round(dollars * 100);
const dollars = (c: number) => c / 100;

export function planSplit(input: {
  subtotal: number;
  tax: number;
  tip: number;
  rows: SplitRow[];
}): SplitPlan {
  const subC = cents(input.subtotal);
  const taxC = cents(input.tax);
  const tipC = cents(input.tip);
  const totalC = subC + taxC + tipC;
  if (totalC <= 0) return { ok: false, problem: "There is nothing to pay." };

  const rest = input.rows.filter((r) => TAKES_THE_REST.has(r.method));
  if (rest.length > 1) {
    return { ok: false, problem: "Only one card can take the rest." };
  }
  const typed = input.rows.filter((r) => !TAKES_THE_REST.has(r.method));
  if (typed.some((r) => !(r.amount > 0))) {
    return { ok: false, problem: "Every part needs an amount." };
  }
  const typedC = typed.map((r) => cents(r.amount));
  const typedTotal = typedC.reduce((s, c) => s + c, 0);

  if (rest.length === 1) {
    if (typedTotal >= totalC) {
      return {
        ok: false,
        problem: "The other parts already cover the bill — remove the card.",
      };
    }
  } else if (Math.abs(typedTotal - totalC) > 1) {
    return {
      ok: false,
      problem:
        typedTotal < totalC
          ? `$${dollars(totalC - typedTotal).toFixed(2)} is still to be split.`
          : `The parts add up to $${dollars(typedTotal - totalC).toFixed(2)} more than the bill.`,
    };
  }

  const parts: PlannedPart[] = [];
  let usedSub = 0;
  let usedTax = 0;
  let usedTip = 0;
  typed.forEach((row, i) => {
    const isLastOverall = rest.length === 0 && i === typed.length - 1;
    let sub: number;
    let tax: number;
    let tip: number;
    if (isLastOverall) {
      // The last part takes the remainder of each figure, so the parts add
      // back to exactly the bill.
      sub = subC - usedSub;
      tax = taxC - usedTax;
      tip = tipC - usedTip;
    } else {
      const share = typedC[i] / totalC;
      tax = Math.round(taxC * share);
      tip = Math.round(tipC * share);
      sub = typedC[i] - tax - tip;
    }
    usedSub += sub;
    usedTax += tax;
    usedTip += tip;
    parts.push({
      method: row.method,
      subtotal: dollars(sub),
      tax: dollars(tax),
      tip: dollars(tip),
      total: dollars(sub + tax + tip),
      takesTheRest: false,
    });
  });

  if (rest.length === 1) {
    const sub = subC - usedSub;
    const tax = taxC - usedTax;
    const tip = tipC - usedTip;
    parts.push({
      method: rest[0].method,
      subtotal: dollars(sub),
      tax: dollars(tax),
      tip: dollars(tip),
      total: dollars(sub + tax + tip),
      takesTheRest: true,
    });
  }

  return { ok: true, parts };
}
