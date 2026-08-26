"use client";

import { useCallback, useRef, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CloverCardFields,
  type CloverCardFieldsHandle,
} from "@/components/payments/clover-card-fields";

// ============================================================================
// Paying a booking by card.
//
// ── THE FIELDS ARE NOT HERE ANY MORE ──────────────────────────────────────
//
// Mounting Clover's hosted iframes, loading their SDK and turning what is typed
// into a `clv_` token now live in `clover-card-fields.tsx`, because the shop
// counter needs exactly the same thing. What is left here is what is actually
// about a booking: the button, the amount it displays, and the charge route it
// posts the token to.
//
// ── THE AMOUNT IS DISPLAY ONLY ────────────────────────────────────────────
//
// `amountCents` renders the button label. It is NOT sent — the server derives
// what is owed from the booking. If the two ever disagree, the server is right
// and the customer is charged correctly regardless of what this said.
// ============================================================================

export interface CloverCheckoutProps {
  bookingId: string;
  publicApiKey: string;
  merchantId: string;
  /** Clover's SDK URL for this environment. */
  sdkUrl: string;
  amountCents: number;
  currency: string;
  tipCents?: number;
  onPaid: (result: {
    paymentId: string;
    /** Clover's id for the charge — what their dashboard is searched by. */
    reference: string | null;
    amountCents: number;
    cardBrand: string | null;
    cardLast4: string | null;
  }) => void;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency || "CAD",
  }).format(cents / 100);
}

export function CloverCheckout({
  bookingId,
  publicApiKey,
  merchantId,
  sdkUrl,
  amountCents,
  currency,
  tipCents = 0,
  onPaid,
}: CloverCheckoutProps) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fields = useRef<CloverCardFieldsHandle | null>(null);

  const pay = useCallback(async () => {
    if (!fields.current) return;
    setBusy(true);
    setProblem(null);
    try {
      const tokenised = await fields.current.createToken();
      if (!tokenised.ok) {
        // Already shown against the offending field; nothing to add here.
        return;
      }

      const response = await fetch("/api/payments/clover/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The token and the tip. Never an amount — the server owns that.
        body: JSON.stringify({ bookingId, source: tokenised.token, tipCents }),
      });
      const payload = (await response.json().catch(() => null)) as {
        paid?: boolean;
        paymentId?: string;
        reference?: string | null;
        amountCents?: number;
        cardBrand?: string | null;
        cardLast4?: string | null;
        error?: string;
      } | null;

      if (!response.ok || !payload?.paid) {
        setProblem(payload?.error ?? "The payment did not go through.");
        return;
      }

      onPaid({
        paymentId: payload.paymentId!,
        reference: payload.reference ?? null,
        amountCents: payload.amountCents ?? amountCents,
        cardBrand: payload.cardBrand ?? null,
        cardLast4: payload.cardLast4 ?? null,
      });
    } catch {
      // The charge may or may not have happened. Say so — "try again" here
      // would invite a double payment, and the server's idempotency key only
      // covers a retry of the SAME attempt.
      setProblem(
        "We lost contact while taking the payment. Do not retry — check with the facility before paying again.",
      );
    } finally {
      setBusy(false);
    }
  }, [bookingId, tipCents, amountCents, onPaid]);

  return (
    <div className="space-y-4">
      <CloverCardFields
        ref={fields}
        publicApiKey={publicApiKey}
        merchantId={merchantId}
        sdkUrl={sdkUrl}
        onReadyChange={setReady}
      />

      {problem && (
        <p className="text-destructive text-sm" role="alert">
          {problem}
        </p>
      )}

      <Button
        onClick={pay}
        disabled={!ready || busy}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {busy ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 size-4" />
        )}
        {busy
          ? "Taking payment…"
          : `Pay ${money(amountCents + tipCents, currency)}`}
      </Button>
    </div>
  );
}
