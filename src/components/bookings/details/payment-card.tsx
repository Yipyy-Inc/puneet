"use client";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { paymentQueries, type ClientPayment } from "@/lib/api/payments";
import {
  formatDateShort,
  formatDuration,
  formatMoney,
  formatPercent,
} from "@/lib/i18n/format";
import { bookingTotals } from "@/lib/payments/booking-totals";
import { taxableOwedForBooking } from "@/lib/payments/service-tax";
import { computeTax } from "@/lib/settings/tax";
import { cn } from "@/lib/utils";

import { DetailsCard } from "./details-card";
import type { BookingDetails } from "./use-booking-details";
import type { BookingTill } from "./use-booking-till";
import type { ServiceFacts } from "./use-service-facts";
import { usePendingTransfers } from "./take-payment/use-pending-transfers";

// ============================================================================
// The money, as the mock draws it beside the booking: what is still owed, big,
// with Paid · Partly paid · Unpaid; every line of the bill; the subtotal, the
// facility's taxes by name, the total; each payment that came off it, in
// green; and one blue button to take the rest.
//
// ── IT ADDS UP, TO THE CENT ────────────────────────────────────────────────
//
// Each payment on the ledger carries its own tax (20260819210000), and the
// balance is what is owed plus the tax on THAT. So the taxes shown are the
// tax already paid plus the tax still to pay — worked out as
//   balance + Σ payments (less tips) − subtotal
// which makes Total − payments = Balance due exactly, and keeps Balance due
// the figure the till charges (`bookingTotals`, the one helper every screen
// takes it from). The facility's rates split that sum line by line.
// ============================================================================

const cents = (value: number) => Math.round(value * 100);

export function PaymentCard({
  d,
  till,
  facts,
}: {
  d: BookingDetails;
  till: BookingTill;
  facts: ServiceFacts;
}) {
  const { t, fill, locale } = d.text;
  const booking = d.booking;
  const { data: ledger } = useQuery({
    ...paymentQueries.byBooking(booking?.id ?? 0),
    enabled: Boolean(booking),
  });
  const pending = usePendingTransfers(booking?.id ?? null);
  if (!booking) return null;

  const money = (n: number) =>
    `${n < 0 ? "−" : ""}${formatMoney(Math.abs(n), locale)}`;
  const totals = bookingTotals(booking, d.taxConfig);
  const balance = totals.balance;
  const subtotal =
    booking.amountDue ??
    booking.totalCost + (booking.extrasTotal ?? 0) - (booking.discount ?? 0);
  const payments = (ledger ?? []) as ClientPayment[];
  const paidGross = payments.reduce(
    (sum, p) => sum + cents(p.amount) - cents(p.tip),
    0,
  );
  // Tax paid plus tax still to pay; see the banner.
  const taxCents = d.taxConfig.pricesIncludeTax
    ? 0
    : Math.max(0, cents(balance) + paidGross - cents(subtotal));
  const rateLines = computeTax(
    taxableOwedForBooking(booking, cents(subtotal)),
    d.taxConfig,
  ).lines;
  const rateTotal = rateLines.reduce((sum, l) => sum + l.amountCents, 0);
  // Each rate's share of the tax; the last takes the remainder, so the lines
  // add up to the tax exactly.
  const shares = rateLines.map((line) =>
    rateTotal > 0 ? Math.round((taxCents * line.amountCents) / rateTotal) : 0,
  );
  const taxLines = rateLines.map((line, i) => ({
    name: line.name,
    rate: line.rate,
    amount:
      (i === rateLines.length - 1
        ? taxCents - shares.slice(0, i).reduce((sum, c) => sum + c, 0)
        : shares[i]) / 100,
  }));
  const total = (cents(subtotal) + taxCents) / 100;

  const rate = (value: number) => {
    const pct = Number((value * 100).toFixed(3));
    const digits = Number.isInteger(pct) ? 0 : String(pct).split(".")[1].length;
    return formatPercent(pct, locale, digits);
  };

  // The bill's lines: the service, then what was added to it.
  const nights = Math.max(
    0,
    Math.round(
      (Date.parse(`${booking.endDate}T00:00:00Z`) -
        Date.parse(`${booking.startDate}T00:00:00Z`)) /
        86_400_000,
    ),
  );
  // Under the service, as the mock writes it: the nights and their price, or
  // the groomer and how long ("Maya R. · 1h 30m").
  const groom = facts.grooming;
  const serviceSub =
    d.kind === "boarding" && nights > 0
      ? fill("nightsTimes", {
          n: nights,
          price: formatMoney(booking.totalCost / nights, locale),
        })
      : d.kind === "grooming" && groom
        ? [
            groom.stylistName,
            groom.serviceDurationMin
              ? formatDuration(groom.serviceDurationMin, locale)
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "";
  const lines = [
    {
      key: "service",
      label: [d.serviceLabel, booking.serviceType].filter(Boolean).join(" · "),
      sub: serviceSub,
      amount: booking.totalCost,
    },
    // As the mock writes them: a charge counted in units says how many at
    // what ("1 meal × $3.50", "18 × $0.75") even for one; a single add-on
    // says it is one ("Add-on").
    ...d.lineItems.map((item) => ({
      key: item.id,
      label: item.name,
      sub:
        item.quantity > 1 || item.kind === "fee"
          ? fill("quantityTimesPrice", {
              n: item.quantity,
              price: formatMoney(item.unitPrice, locale),
            })
          : item.kind === "add_on"
            ? t("addOn")
            : "",
      amount: item.price,
    })),
    ...((booking.discount ?? 0) > 0
      ? [
          {
            key: "discount",
            label: t("discount"),
            sub: booking.discountReason ?? "",
            amount: -(booking.discount ?? 0),
          },
        ]
      : []),
  ];

  const paymentLabel = (p: ClientPayment) => {
    const card =
      p.cardLast4 &&
      (p.cardBrand || p.method.includes("card") || p.method === "terminal")
        ? `${p.cardBrand ?? t("payCard")} ${p.cardLast4}`
        : null;
    const method =
      card ??
      {
        cash: t("payCash"),
        "e-transfer": t("payETransfer"),
        "gift-card": t("payGiftCard"),
        "store-credit": t("payCredit"),
        "package-pass": t("payPass"),
        ach: t("payAch"),
        terminal: t("payTerminal"),
        "card-on-file": t("payCard"),
        "new-card": t("payCard"),
      }[p.method] ??
      p.method;
    return [
      p.amount < 0 ? t("refund") : null,
      // "Deposit", as the mock labels one — the payment's own note.
      p.note?.trim() || null,
      method,
      formatDateShort(p.createdAt, locale),
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const status =
    balance <= 0.005 && total > 0
      ? "paid"
      : paidGross > 0
        ? "partly"
        : "unpaid";
  const leavingToday =
    d.kind === "boarding" && booking.endDate === d.logDay && balance > 0;
  const open = booking.status !== "cancelled" && booking.status !== "declined";

  return (
    <DetailsCard>
      <div className="border-line-soft flex flex-col gap-1 border-b px-5 py-[18px]">
        <span className="text-ink-tertiary text-[13px]">{t("balanceDue")}</span>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[30px] font-bold tracking-[-0.01em] tabular-nums">
            {formatMoney(balance, locale)}
          </span>
          <Chip
            tone={
              status === "paid"
                ? "success"
                : status === "partly"
                  ? "warning"
                  : "bd-danger"
            }
            size="bd-pet"
          >
            {t(
              status === "paid"
                ? "statusPaid"
                : status === "partly"
                  ? "statusPartlyPaid"
                  : "statusUnpaid",
            )}
          </Chip>
        </div>
        {leavingToday ? (
          <span className="text-warning text-[13px]">
            {t("balanceDueAtCheckoutToday")}
          </span>
        ) : null}
        {pending.transfers.map((transfer) => (
          <span key={transfer.id} className="text-warning text-[13px]">
            {fill("eTransferPendingLine", {
              amount: formatMoney(transfer.total, locale),
            })}
          </span>
        ))}
      </div>

      <div className="border-line-soft flex flex-col gap-2 border-b px-5 py-3">
        {lines.map((line) => (
          <div
            key={line.key}
            className="flex justify-between gap-3 text-[14px]"
          >
            <span className="flex min-w-0 flex-col gap-px">
              <span>{line.label}</span>
              {line.sub ? (
                <span className="text-ink-disabled text-[12px]">
                  {line.sub}
                </span>
              ) : null}
            </span>
            <span className="font-medium whitespace-nowrap tabular-nums">
              {line.amount === 0 ? t("included") : money(line.amount)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-line-soft flex flex-col gap-1.5 border-b px-5 py-3">
        <Row label={t("subtotal")} value={money(subtotal)} />
        {taxLines.map((line) => (
          <Row
            key={line.name}
            label={`${line.name} ${rate(line.rate)}`}
            value={money(line.amount)}
          />
        ))}
        <Row label={t("total")} value={money(total)} strong />
        {payments.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex justify-between gap-3 text-[13px]",
              p.amount < 0 ? "text-bad" : "text-success",
            )}
          >
            <span className="min-w-0 truncate">{paymentLabel(p)}</span>
            <span className="tabular-nums">{money(-(p.amount - p.tip))}</span>
          </div>
        ))}
        {(d.tips?.tipCollected ?? 0) > 0 ? (
          <Row
            label={t("tipCollected")}
            value={formatMoney(d.tips?.tipCollected ?? 0, locale)}
          />
        ) : null}
      </div>

      {open && d.permissions.canTakePayment ? (
        <div className="flex flex-col gap-2.5 px-5 py-4">
          {balance > 0.005 ? (
            <Button
              variant="bd-cta"
              size="bd-52"
              className="shadow-(--bd-sh-pay)"
              onClick={till.toPayment}
            >
              {fill("takePaymentAmount", {
                amount: formatMoney(balance, locale),
              })}
            </Button>
          ) : (
            <Button
              variant="flat"
              size="bd-52"
              disabled
              className="[&:disabled:not([data-loading])]:bg-wash-success [&:disabled:not([data-loading])]:text-success"
            >
              {t("paidInFull")}
            </Button>
          )}
          {d.storeCreditBalance > 0 && balance > 0.005 ? (
            <span className="text-success text-center text-[13px]">
              {fill("creditFirst", {
                amount: formatMoney(d.storeCreditBalance, locale),
              })}
            </span>
          ) : null}
        </div>
      ) : null}
    </DetailsCard>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between",
        strong
          ? "text-body-ink text-[15px] font-semibold"
          : "text-ink-secondary text-[14px]",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
