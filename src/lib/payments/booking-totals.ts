import { balanceOf } from "@/lib/api/booking-money";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";

// ============================================================================
// A booking's total and balance, one answer for every place that shows them.
//
// The booking page's header showed `invoice?.total ?? totalCost` — the PRICE,
// from a fixture blob no real booking carries — while the Payment Summary
// beside it showed the price plus added items, tax and tip. Two totals on one
// screen, disagreeing as soon as anything was added to the bill.
//
//   cost     `amount_due`: price + extras, derived by the database
//   paid     `amount_paid`: from the payments ledger, netted of refunds
//   owed     balanceOf(): cost − paid, never negative
//   tax      on what is still OWED — a payment charges tax on what it
//            collects, so taxing the whole bill would tax a deposit twice
//   total    cost + that tax (unless prices include it) + the pledged tip
//   balance  owed + its tax — what "Accept payment" will ask for
// ============================================================================

export interface BookingMoneyInput {
  totalCost: number;
  amountDue?: number;
  amountPaid?: number;
  tipAmount?: number;
}

export interface BookingTotals {
  cost: number;
  paid: number;
  owed: number;
  taxCents: number;
  tip: number;
  total: number;
  balance: number;
}

const cents = (value: number) => Math.round(value * 100);

export function bookingTotals(
  booking: BookingMoneyInput,
  taxConfig: TaxConfig,
): BookingTotals {
  const cost = booking.amountDue ?? booking.totalCost;
  const paid = booking.amountPaid ?? 0;
  const owed = balanceOf(booking);
  const tip = booking.tipAmount ?? 0;
  const taxCents = computeTax(cents(owed), taxConfig).totalCents;
  const added = taxConfig.pricesIncludeTax ? 0 : taxCents;
  return {
    cost,
    paid,
    owed,
    taxCents,
    tip,
    total: (cents(cost) + added + cents(tip)) / 100,
    balance: (cents(owed) + added) / 100,
  };
}
