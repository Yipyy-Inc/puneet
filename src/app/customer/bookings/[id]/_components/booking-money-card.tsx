"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { customerBookingQueries } from "@/lib/api/customer-bookings";
import {
  balanceDue,
  isAwaitingConfirmation,
  isPayable,
} from "@/lib/bookings/booking-timing";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney } from "@/lib/i18n/format";
import type { Booking } from "@/types/booking";

// ============================================================================
// What the booking costs, what was paid, and what is left — from the booking
// row and its lines.
//
// It read `booking.invoice`, a fixture blob no real booking carries, so a
// customer never saw a price at all. The numbers here are the database's:
// base price and discount on the row, the lines from booking_line_items, the
// total (`amountDue`) and what the ledger has taken (`amountPaid`), both
// derived by the database. A request shows the quote it was sent with and
// says the facility confirms the price — it is not a bill yet.
// ============================================================================

export function BookingMoneyCard({ booking }: { booking: Booking }) {
  const { t, fill, locale } = useCustomerText("bookingDetail");
  const money = (n: number) => formatMoney(n, locale);
  const awaiting = isAwaitingConfirmation(booking);
  const lines = useQuery({
    ...customerBookingQueries.lineItems(booking.id),
    enabled: !awaiting,
  });

  if (awaiting) {
    const quoted = booking.requestedQuote?.totalCost;
    return (
      <section className="bg-card border-line shadow-card rounded-3xl border p-5">
        <h2 className="text-heading text-[17px] font-bold">
          {t("moneyTitle")}
        </h2>
        <p className="text-ink-secondary mt-2 text-[14.5px]">
          {quoted
            ? fill("moneyQuoted", { amount: money(quoted) })
            : t("moneyNotPriced")}
        </p>
      </section>
    );
  }

  const total = booking.amountDue ?? booking.totalCost;
  const paid = booking.amountPaid ?? 0;
  const owed = balanceDue(booking);
  const payable = isPayable(booking);

  return (
    <section className="bg-card border-line shadow-card rounded-3xl border p-5">
      <h2 className="text-heading text-[17px] font-bold">{t("moneyTitle")}</h2>
      <dl className="mt-3 space-y-1.5 text-[14.5px]">
        {/* total_cost is the price before the discount: amount_due is
            total_cost - discount + extras (20260819210000), so this is the
            line the breakdown adds up from. */}
        <Line label={t("moneyPrice")} value={money(booking.totalCost)} />
        {booking.discount > 0 && (
          <Line label={t("discount")} value={`−${money(booking.discount)}`} />
        )}
        {lines.isPending ? (
          <Skeleton className="h-5 w-full rounded-xl" />
        ) : lines.isError ? (
          <p className="text-ink-tertiary text-[13.5px]">
            {t("moneyLinesFailed")}
          </p>
        ) : (
          (lines.data ?? []).map((line) => (
            <Line
              key={line.id}
              label={
                line.quantity > 1
                  ? fill("moneyLineQty", {
                      name: line.name,
                      n: line.quantity,
                    })
                  : line.name
              }
              value={money(line.price)}
            />
          ))
        )}
        <div className="border-line my-2 border-t" />
        <Line label={t("total")} value={money(total)} strong />
        {paid > 0 && <Line label={t("moneyPaid")} value={`−${money(paid)}`} />}
        <Line
          label={t("balance")}
          value={owed > 0 ? money(owed) : money(0)}
          strong
        />
      </dl>
      {payable ? (
        <Button asChild className="mt-4 w-full sm:w-auto">
          <Link href={`/pay/${booking.id}`}>
            <CreditCard className="size-4" aria-hidden />
            {fill("payAmount", { amount: money(owed) })}
          </Link>
        </Button>
      ) : (
        paid > 0 &&
        owed === 0 && (
          <p className="text-success mt-3 flex items-center gap-2 text-[14.5px] font-semibold">
            <CheckCircle2 className="size-4" aria-hidden />
            {t("paidInFull")}
          </p>
        )
      )}
    </section>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={
          strong ? "text-body-ink font-semibold" : "text-ink-secondary"
        }
      >
        {label}
      </dt>
      <dd
        className={
          strong
            ? "text-body-ink font-semibold tabular-nums"
            : "text-body-ink tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
