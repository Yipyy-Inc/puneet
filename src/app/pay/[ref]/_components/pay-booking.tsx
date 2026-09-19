"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatCalendarDayLong, formatMoney } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { CloverCheckout } from "@/components/payments/clover-checkout";
import { TipSelector } from "@/components/bookings/TipSelector";
import type { TipConfig } from "@/types/facility";

// ============================================================================
// The paying half of /pay/[ref].
//
// A client component because a card form is interactive and a tip is a choice.
// Everything it knows was decided on the server: the amount, the currency, the
// merchant. It adds exactly one number of its own — the tip — and that is the
// one number the payer is genuinely entitled to choose.
//
// ── THE AMOUNT IS NOT SENT ────────────────────────────────────────────────
//
// `amountCents` is here to be READ, not transmitted. CloverCheckout sends the
// token and the tip; the server reads what is owed again when the token
// arrives. If a payment lands at the counter while this page is open, the
// server charges the new balance and the figure on this page was simply out of
// date — which is the right way round.
// ============================================================================

export interface PayBookingProps {
  bookingId: string;
  bookingRef: number;
  /**
   * Whose booking this is. Their saved cards are offered, and a card saved
   * here is saved against them. Null means no card can be offered or kept.
   */
  clientId: string | null;
  facilityName: string;
  service: string | null;
  serviceType: string | null;
  /** The booking's first day on the facility's clock, "YYYY-MM-DD". */
  startDay: string | null;
  /** The booking, where this person reads it. */
  backHref: string;
  /** What the card will be charged before any tip: the balance plus its tax. */
  amountCents: number;
  /** The tax inside `amountCents`; zero where prices include it or none is set. */
  taxCents: number;
  currency: string;
  merchantId: string;
  publicApiKey: string;
  sdkUrl: string;
  /**
   * The facility's own tips, or null when it offers none.
   *
   * Read on the server — a customer cannot see `facility_settings` under
   * RLS, so this cannot be fetched from here.
   */
  tipConfig: TipConfig | null;
  /**
   * The tip the booking carries that no payment has collected — the owner's
   * pledge from the pre-arrival form. The tip starts at it; zero when there is
   * none or the facility offers no tips.
   */
  pledgedTipCents?: number;
}

interface Paid {
  paymentId: string;
  reference: string | null;
  amountCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
}

export function PayBooking({
  bookingId,
  bookingRef,
  clientId,
  facilityName,
  service,
  serviceType,
  startDay,
  backHref,
  amountCents,
  taxCents,
  currency,
  merchantId,
  publicApiKey,
  sdkUrl,
  tipConfig,
  pledgedTipCents = 0,
}: PayBookingProps) {
  const { t, fill, locale } = useCustomerText("pay");
  const money = (cents: number, code: string) =>
    formatMoney(cents / 100, locale, { currency: code });
  const [tipCents, setTipCents] = useState(pledgedTipCents);
  const [paid, setPaid] = useState<Paid | null>(null);

  const onPaid = useCallback((result: Paid) => setPaid(result), []);

  if (paid) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <section className="bg-card border-line shadow-card flex flex-col items-center gap-3 rounded-3xl border px-6 py-10 text-center">
          <CheckCircle2 className="text-success size-6" aria-hidden />
          <h1 className="text-heading text-[19px] font-bold">
            {fill("paidAmount", { amount: money(paid.amountCents, currency) })}
          </h1>
          <p className="text-ink-secondary text-[14.5px]">
            {fill("paidFor", { ref: bookingRef, facility: facilityName })}
            {paid.cardLast4
              ? ` · ${paid.cardBrand ?? t("card")} ···${paid.cardLast4}`
              : ""}
          </p>
          {/* CLOVER's reference, not our ledger id. It is what the facility
                and their processor can both look this payment up by; our uuid
                means nothing to either of them. */}
          {paid.reference && (
            <p className="text-ink-tertiary font-mono text-xs">
              {paid.reference}
            </p>
          )}
          <Button variant="outline" asChild className="mt-2">
            <Link href={backHref}>{t("backToBooking")}</Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToBooking")}
        </Link>
      </Button>
      <div className="text-center">
        <h1 className="text-heading text-[24px] font-bold">
          {fill("payTitle", { facility: facilityName })}
        </h1>
        <p className="text-ink-secondary mt-1 text-[14.5px]">
          {service
            ? serviceTypeLabel(locale, serviceType || service)
            : t("booking")}
          {startDay ? ` · ${formatCalendarDayLong(startDay, locale)}` : ""}
        </p>
      </div>

      <section className="bg-card border-line shadow-card space-y-5 rounded-3xl border p-5">
        <div className="border-line rounded-2xl border p-4 text-center">
          <p className="text-ink-tertiary text-[13.5px]">
            {fill("balanceOn", { ref: bookingRef })}
          </p>
          <p className="text-body-ink text-3xl font-bold tabular-nums">
            {money(amountCents, currency)}
          </p>
          {taxCents > 0 && (
            <p className="text-ink-tertiary mt-1 text-xs tabular-nums">
              {fill("includesTax", { amount: money(taxCents, currency) })}
            </p>
          )}
        </div>

        {/* The facility's OWN tips — this page hardcoded 10/15/20 until
              2026-08-26, so a customer paying by link was offered a different
              set from the one the facility configured and from the one the
              counter offered. Absent entirely when they offer no tips, rather
              than shown as an empty row. */}
        {tipConfig && (
          <div>
            <p className="text-ink-tertiary mb-2 text-[12px] font-bold tracking-[.06em] uppercase">
              {t("addTip")}
            </p>
            {pledgedTipCents > 0 && tipCents === pledgedTipCents && (
              <p className="text-ink-secondary mb-2 text-xs">
                {fill("pledgedTip", {
                  amount: money(pledgedTipCents, currency),
                })}
              </p>
            )}
            <TipSelector
              tipConfig={tipConfig}
              // Pre-tax: a gratuity on top of sales tax is not what "20%"
              // means to the person pressing it (the terminal's convention).
              subtotal={(amountCents - taxCents) / 100}
              tipAmount={tipCents / 100}
              onTipChange={(dollars) => setTipCents(Math.round(dollars * 100))}
            />
          </div>
        )}

        <Separator />

        <CloverCheckout
          bookingId={bookingId}
          clientId={clientId}
          publicApiKey={publicApiKey}
          merchantId={merchantId}
          sdkUrl={sdkUrl}
          amountCents={amountCents}
          currency={currency}
          tipCents={tipCents}
          onPaid={onPaid}
        />
      </section>
    </main>
  );
}
