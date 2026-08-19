"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { balanceOf } from "@/lib/api/booking-money";
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
//   balance          balanceOf(), the same helper the "Pay by card" button
//                    uses, so the two figures on this screen cannot disagree
//
// ── AND NO TAX LINE, DELIBERATELY ─────────────────────────────────────────
//
// The fixture invoice showed GST 5% and QST 9.975%. There is no tax
// configuration anywhere real: `facility_settings` has six domains and none of
// them is tax. Rendering a tax line would mean choosing a rate on the
// facility's behalf and putting it on something they hand to a customer, so
// this shows what is charged and stays quiet about how it is composed until
// the facility can say.
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
  const balance = balanceOf(booking);

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

          <div className="py-1">
            <Line label="Total" value={total + tip} bold />
          </div>

          {paid > 0 && (
            <div className="py-1">
              <Line label="Paid" value={-paid} tone="text-emerald-600" />
            </div>
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
