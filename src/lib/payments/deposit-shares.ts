import { allocateDeposit } from "@/lib/bookings/booking-parts";
import {
  computeDepositAmount,
  findApplicableDepositRule,
  type DepositRule,
  type DepositRuleSet,
} from "@/lib/settings/deposits";

// ============================================================================
// What a booking owes as a deposit, and on which of its parts (the booking
// wizard's Confirm, 2026-10-02: "Charge Visa •••• 4242", "Send payment link",
// and a customer's saved card charged when their booking is confirmed).
//
// The SAME arithmetic the wizard showed and the cash path records
// (POST /api/bookings, `recordDeposit`): the facility's rule on the whole
// request's price, before tax; less what has been paid already; spread over
// the parts in order, none past what it still owes (`allocateDeposit`). Tax
// goes on top of each share where it is charged, as on every other payment.
// ============================================================================

export interface DepositBooking {
  id: string;
  ref: number;
  service: string;
  /** What it costs, before tax: the service and its own lines. */
  due: number;
  /** What has been paid on it. */
  paid: number;
}

export interface DepositShare {
  bookingId: string;
  ref: number;
  /** Before tax. */
  amount: number;
}

export interface DepositPlan {
  rule: DepositRule | null;
  /** What the rule asks for the whole request. */
  amount: number;
  /** What is left of it to collect, in shares by part. */
  shares: DepositShare[];
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function depositPlan(input: {
  rules: DepositRuleSet;
  bookings: readonly DepositBooking[];
}): DepositPlan {
  const bookings = input.bookings;
  if (bookings.length === 0) return { rule: null, amount: 0, shares: [] };
  const total = cents(bookings.reduce((sum, b) => sum + Math.max(0, b.due), 0));
  const rule = findApplicableDepositRule(
    bookings[0]!.service,
    total,
    input.rules,
  );
  if (!rule) return { rule: null, amount: 0, shares: [] };
  const amount = computeDepositAmount(rule, total);
  const paid = cents(bookings.reduce((sum, b) => sum + Math.max(0, b.paid), 0));
  const left = Math.max(0, cents(amount - paid));
  const { shares } = allocateDeposit(
    left,
    bookings.map((b) => Math.max(0, cents(b.due - b.paid))),
  );
  return {
    rule,
    amount,
    shares: bookings.flatMap((b, i) =>
      (shares[i] ?? 0) > 0
        ? [{ bookingId: b.id, ref: b.ref, amount: shares[i]! }]
        : [],
    ),
  };
}
