"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { balanceOf } from "@/lib/api/booking-money";
import { bookingMoney, paymentQueries } from "@/lib/api/payments";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import type { BookingLineItem } from "@/app/api/bookings/[ref]/line-items/route";
import type { Booking } from "@/types/booking";

// ============================================================================
// What this booking costs, line by line.
//
// ── WHAT IT REPLACED ──────────────────────────────────────────────────────
//
// Two rows — "Base Price" and "Total" — shown whenever `booking.invoice` was
// absent. That blob only exists on the 26 migrated fixture bookings, so every
// booking made since the migration rendered the stub. Reported from the running
// app: "in here we are supposed to have all the breakdown".
//
// ── EVERY LINE HERE HAS A SOURCE ──────────────────────────────────────────
//
//   the service      bookings.base_price
//   added lines      booking_line_items (a bag of food, a late fee) —
//                    GET /api/bookings/<ref>/line-items
//   discount         bookings.discount
//   tip              bookings.tip_amount
//   total            bookings.amount_due — which is what it COSTS, price plus
//                    extras, NOT the outstanding balance. The name is a trap:
//                    booking 569 carries amount_paid 200 AND amount_due 200.
//   paid             bookings.amount_paid, derived by the database from the
//                    payments ledger (20260806680000) — never computed here
//   refunded         the booking's own negative ledger rows, GET /api/payments
//                    ?bookingRef=<ref>. Shown SEPARATELY and above the net,
//                    because `amount_paid` sums signed rows: $800 taken and
//                    $200 given back reads "Paid $600", which is exactly what
//                    a booking that only ever paid $600 reads, and one of the
//                    two has a refund somebody has to account for. This is the
//                    same reason `facility_takings` reports gross, refunded
//                    AND net rather than the last one alone.
//   balance          balanceOf(), the same helper the "Pay by card" button
//                    uses, so the two figures on this screen cannot disagree
//
// ── AND THE TAX IS THE FACILITY'S OWN ─────────────────────────────────────
//
// There used to be no tax line here at all, and the reason was sound: nothing
// stored a rate, so showing one meant choosing it on the facility's behalf and
// putting it on something they hand to a customer.
//
// `tax_config` stores it now. It is read here rather than assumed, and a
// facility that has configured none still sees no tax line.
//
// It is shown for the same reason the terminal charges it: the card is charged
// subtotal + tax, so a panel that stopped at the subtotal would tell staff
// $49.01 while the terminal asked the customer for $56.35.
// ============================================================================

interface BookingPaymentBreakdownProps {
  booking: Booking;
  /**
   * Incident-care charges, which come from `src/data/incidents` rather than
   * from `booking_line_items`. Passed in rather than read here so this
   * component keeps one source per line and the fixture stays visible at the
   * call site until incidents are rows.
   */
  incidentCareTotal?: number;
  /** Rendered under the totals — the existing Accept Payment control. */
  action?: React.ReactNode;
}

function Money({ value, bold }: { value: number; bold?: boolean }) {
  return (
    <span
      className={bold ? "text-base font-bold" : "text-muted-foreground text-sm"}
    >
      {value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)}
    </span>
  );
}

function Line({
  label,
  hint,
  value,
  bold,
  tone,
}: {
  label: string;
  hint?: string;
  value: number;
  bold?: boolean;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <span className={bold ? "text-sm font-semibold" : "text-sm"}>
          {label}
        </span>
        {hint && (
          <span className="text-muted-foreground ml-2 text-xs">{hint}</span>
        )}
      </div>
      <span className={tone}>
        <Money value={value} bold={bold} />
      </span>
    </div>
  );
}

export function BookingPaymentBreakdown({
  booking,
  incidentCareTotal = 0,
  action,
}: BookingPaymentBreakdownProps) {
  const { data: lineItems, isPending } = useQuery({
    queryKey: ["bookings", booking.id, "line-items"],
    queryFn: async (): Promise<BookingLineItem[]> => {
      const response = await fetch(`/api/bookings/${booking.id}/line-items`);
      if (!response.ok) throw new Error("Could not read the bill.");
      return (await response.json()) as BookingLineItem[];
    },
    staleTime: 30_000,
  });

  // The booking's own ledger rows, only so the panel can separate what was
  // taken from what was given back. It never replaces `booking.amountPaid` as
  // the balance figure — that stays the database's, so this panel and the "Pay
  // by card" button cannot disagree about what is owed.
  const { data: ledger } = useQuery(paymentQueries.byBooking(booking.id));
  const money = bookingMoney(ledger ?? []);

  const settings = useFacilitySettings();
  const taxConfig = settings.settings.tax_config.value as TaxConfig;

  const items = lineItems ?? [];
  const extras = items.reduce((sum, i) => sum + i.price, 0);
  const discount = booking.discount ?? 0;
  const tip = booking.tipAmount ?? 0;

  // `amountDue` and `amountPaid` are the database's, derived from the payments
  // ledger. The subtotal is the only figure assembled here, and only so the
  // lines above it add up on screen.
  // The subtotal is the only figure assembled here, and only so the lines
  // above it add up on screen. The total and the balance are the database's.
  const subtotal = booking.basePrice + extras + incidentCareTotal - discount;
  const paid = booking.amountPaid ?? 0;
  // NOT `booking.amountDue` for the balance — that column is the COST, not
  // what is owed. Using it would have shown "Balance due $200" on a booking
  // paid in full (booking 569 carries amount_paid 200 AND amount_due 200).
  // balanceOf() is what the "Pay by card" button uses, so the two figures on
  // this screen cannot disagree.
  const total = booking.amountDue ?? subtotal;
  const outstanding = balanceOf(booking);
  // Tax on what is still OWED, which is what a payment will charge — not on the
  // whole bill, or a part-paid booking would be taxed twice.
  const tax = computeTax(Math.round(outstanding * 100), taxConfig);
  const taxTotal = tax.totalCents / 100;
  // A tax-inclusive facility's tax is already inside the price, so it is broken
  // out rather than added.
  const balance = taxConfig.pricesIncludeTax
    ? outstanding
    : outstanding + taxTotal;

  // `service` is stored lowercase ("boarding"); `serviceType` is the named
  // package when there is one. Either way it is the thing being charged for,
  // so it reads as a line on a bill rather than as a column value.
  const raw = booking.serviceType || booking.service;
  const serviceLabel = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <Card>
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="text-xs font-semibold tracking-wider uppercase">
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="divide-y">
          <div className="pb-1">
            <Line
              label={serviceLabel}
              hint="Service"
              value={booking.basePrice}
            />
          </div>

          {isPending ? (
            <div className="py-2">
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : items.length > 0 ? (
            <div className="py-1">
              {items.map((item) => (
                <Line
                  key={item.id}
                  label={item.name}
                  hint={
                    item.quantity > 1
                      ? `${item.quantity} × $${item.unitPrice.toFixed(2)}`
                      : item.kind === "fee"
                        ? "Fee"
                        : undefined
                  }
                  value={item.price}
                />
              ))}
            </div>
          ) : null}

          {incidentCareTotal > 0 && (
            <div className="py-1">
              <Line
                label="Incident care"
                hint="From an incident report"
                value={incidentCareTotal}
              />
            </div>
          )}

          {discount > 0 && (
            <div className="py-1">
              <Line
                label="Discount"
                hint={booking.discountReason}
                value={-discount}
                tone="text-emerald-600"
              />
            </div>
          )}

          <div className="py-1">
            <Line label="Subtotal" value={subtotal} bold />
          </div>

          {tip > 0 && (
            <div className="py-1">
              <Line label="Tip" value={tip} />
            </div>
          )}

          {tax.lines.length > 0 && (
            <div className="py-1">
              {tax.lines.map((line) => (
                <Line
                  key={line.name}
                  label={line.name}
                  hint={`${Number((line.rate * 100).toFixed(4))}%`}
                  value={line.amountCents / 100}
                />
              ))}
            </div>
          )}

          <div className="py-1">
            <Line
              label="Total"
              value={
                (taxConfig.pricesIncludeTax ? total : total + taxTotal) + tip
              }
              bold
            />
          </div>

          {/* GROSS, REFUNDED, NET — never the net on its own. `paid` is the
              database's netted figure and stays the one the balance is built
              from; these two lines only say what it is made of. When nothing
              was refunded the middle line is absent and this reads exactly as
              it always did. */}
          {money.refunded > 0 ? (
            <div className="space-y-0.5 py-1">
              <Line label="Paid" value={-money.gross} tone="text-emerald-600" />
              <Line
                label={
                  money.refunds.length > 1
                    ? `Refunded (${money.refunds.length})`
                    : "Refunded"
                }
                value={money.refunded}
                tone="text-rose-600"
              />
              {/* The reason, where there is one. It is the whole point of
                  asking for it — a refund a year old that cannot say why is
                  a number somebody has to go and reconstruct. */}
              {money.refunds
                .filter((refund) => refund.note)
                .map((refund) => (
                  <p
                    key={refund.id}
                    className="text-muted-foreground pl-1 text-xs italic"
                  >
                    {refund.note}
                  </p>
                ))}
              <Line
                label="Net paid"
                value={-money.net}
                tone="text-emerald-700"
              />
            </div>
          ) : (
            paid > 0 && (
              <div className="py-1">
                <Line label="Paid" value={-paid} tone="text-emerald-600" />
              </div>
            )
          )}

          <div className="pt-1">
            <Line
              label={balance > 0 ? "Balance due" : "Settled"}
              value={balance}
              bold
              tone={balance > 0 ? "text-amber-700" : "text-emerald-600"}
            />
          </div>
        </div>

        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

/** The Accept Payment control, unchanged, for the parent to pass in. */
export function AcceptPaymentButton({
  onClick,
  busy,
  amount,
}: {
  onClick: () => void;
  busy?: boolean;
  amount: number;
}) {
  return (
    <Button className="w-full gap-2" onClick={onClick} disabled={busy}>
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" />
      )}
      Accept Payment{amount > 0 ? ` — $${amount.toFixed(2)}` : ""}
    </Button>
  );
}
