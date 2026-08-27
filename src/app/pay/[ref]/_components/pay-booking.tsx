"use client";

import { useCallback, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  startAt: string | null;
  amountCents: number;
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
}

interface Paid {
  paymentId: string;
  reference: string | null;
  amountCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function serviceLabel(service: string | null, serviceType: string | null) {
  const base = service ? service.replace(/_/g, " ") : "Booking";
  const sub = serviceType ? serviceType.replace(/_/g, " ") : null;
  return sub ? `${base} — ${sub}` : base;
}

export function PayBooking({
  bookingId,
  bookingRef,
  clientId,
  facilityName,
  service,
  serviceType,
  startAt,
  amountCents,
  currency,
  merchantId,
  publicApiKey,
  sdkUrl,
  tipConfig,
}: PayBookingProps) {
  const [tipCents, setTipCents] = useState(0);
  const [paid, setPaid] = useState<Paid | null>(null);

  const onPaid = useCallback((result: Paid) => setPaid(result), []);

  if (paid) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <CheckCircle2 className="size-6" />
            </div>
            <p className="text-lg font-semibold">
              {money(paid.amountCents, currency)} paid
            </p>
            <p className="text-muted-foreground text-sm/relaxed">
              Booking #{bookingRef} at {facilityName}
              {paid.cardLast4
                ? ` · ${paid.cardBrand ?? "Card"} ···${paid.cardLast4}`
                : ""}
            </p>
            {/* CLOVER's reference, not our ledger id. It is what the facility
                and their processor can both look this payment up by; our uuid
                means nothing to either of them. */}
            {paid.reference && (
              <p className="text-muted-foreground font-mono text-xs">
                {paid.reference}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Pay {facilityName}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm capitalize">
          {serviceLabel(service, serviceType)}
          {startAt
            ? ` · ${new Date(startAt).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`
            : ""}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="bg-muted/30 rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">
              Balance on booking #{bookingRef}
            </p>
            <p className="font-[tabular-nums] text-3xl font-bold">
              {money(amountCents, currency)}
            </p>
          </div>

          {/* The facility's OWN tips — this page hardcoded 10/15/20 until
              2026-08-26, so a customer paying by link was offered a different
              set from the one the facility configured and from the one the
              counter offered. Absent entirely when they offer no tips, rather
              than shown as an empty row. */}
          {tipConfig && (
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                Add a tip (optional)
              </p>
              <TipSelector
                tipConfig={tipConfig}
                subtotal={amountCents / 100}
                tipAmount={tipCents / 100}
                onTipChange={(dollars) =>
                  setTipCents(Math.round(dollars * 100))
                }
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
        </CardContent>
      </Card>
    </div>
  );
}
