"use client";

import { useCallback, useRef, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CloverCardFields,
  type CloverCardFieldsHandle,
} from "@/components/payments/clover-card-fields";
import { SavedCardPicker } from "@/components/payments/saved-card-picker";
import { savedCardKeys } from "@/lib/api/saved-cards";
import { useQueryClient } from "@tanstack/react-query";

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
//
// ── A CARD THEY ALREADY GAVE US, OR A NEW ONE ─────────────────────────────
//
// When `clientId` is supplied, the customer's stored cards are offered first
// and the hosted fields are hidden until they choose "use a new card" — a card
// on file exists to save somebody typing sixteen digits, so making them look at
// the form anyway defeats it.
//
// ── AND CONSENT IS ASKED, NOT ASSUMED ─────────────────────────────────────
//
// The "save this card" box is UNTICKED and stays that way unless somebody
// deliberately ticks it. Clover requires explicit cardholder consent before a
// credential may be stored and reused, and a pre-ticked box is not consent in
// any jurisdiction that has thought about it. The row records when and by whom;
// a card with no consent recorded is refused by the charge route.
//
// Saving happens BEFORE the charge, because Clover's tokenizer returns a
// SINGLE-PAY token: spending it on a charge and then offering the same token to
// POST /v1/customers cannot work, and that is the order this shipped with on
// 2026-08-26. Token -> customer -> charge the customer id is the documented
// order and the one used here.
//
// The consequence is worth stating plainly: a card is kept even if the charge
// is then DECLINED. That is defensible — agreeing to store a card is a separate
// decision from whether one payment succeeded, and the customer can remove it —
// but it is a real behaviour, not an accident.
//
// A vault failure never costs the payment: the charge falls back to the token,
// which is still unspent, and the customer is told the card was not kept.
// ============================================================================

export interface CloverCheckoutProps {
  bookingId: string;
  /**
   * Whose cards to offer, and whose card to save.
   *
   * Omit it and this behaves exactly as it did before saved cards existed: the
   * hosted fields, and no offer to keep anything.
   */
  clientId?: string | null;
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
  clientId = null,
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
  /**
   * The card could not be kept, but the payment is unaffected.
   *
   * Separate from `problem` on purpose: one of these stops the payment and
   * the other does not, and showing them in the same red sentence would
   * make a customer think their money had not gone through.
   */
  const [notSaved, setNotSaved] = useState<string | null>(null);
  /** null = pay with a new card. Otherwise a `saved_cards.id`. */
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const fields = useRef<CloverCardFieldsHandle | null>(null);
  const queryClient = useQueryClient();

  const pay = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    setNotSaved(null);
    try {
      // ── ONE OF TWO BODIES ───────────────────────────────────────────────
      //
      // A stored card is charged by naming it; the route resolves it to
      // Clover's customer id and flags the charge as a stored credential. The
      // hosted fields are not even mounted in that case, so there is nothing
      // to tokenise.
      let body: Record<string, unknown>;

      if (savedCardId) {
        body = { bookingId, savedCardId, tipCents };
      } else {
        if (!fields.current) return;
        const tokenised = await fields.current.createToken();
        if (!tokenised.ok) {
          // Already shown against the offending field; nothing to add here.
          return;
        }

        // The token and the tip. Never an amount — the server owns that.
        body = { bookingId, source: tokenised.token, tipCents };

        // ── SAVING HAPPENS BEFORE THE CHARGE, AND IT HAS TO ───────────────
        //
        // Clover's tokenizer returns a SINGLE-PAY token. Spending it on a
        // charge and then handing the same token to POST /v1/customers is the
        // order this shipped with on 2026-08-26, and it could never have
        // worked: the second call is presented a token that no longer exists.
        //
        // The documented order is the other way round — token -> customer ->
        // charge the customer id — so that is what happens here. The charge
        // then goes through the `savedCardId` path, which is the same one a
        // returning customer uses, so there is one way to charge a stored
        // card rather than two.
        //
        // A vault failure must NOT cost the payment. If the card cannot be
        // stored — the app lacks the Ecommerce "Write customers" permission,
        // Clover is unreachable — the charge falls back to the token that is
        // still unspent, and the customer is told the card was not kept.
        if (saveCard && clientId) {
          const saved = await fetch("/api/payments/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: tokenised.token,
              clientId,
              consent: true,
            }),
          }).catch(() => null);

          const savedBody = (await saved?.json().catch(() => null)) as {
            card?: { id?: string };
            error?: string;
          } | null;

          if (saved?.ok && savedBody?.card?.id) {
            // The token is now spent on the customer, so the charge must name
            // the stored card rather than the token.
            body = { bookingId, savedCardId: savedBody.card.id, tipCents };
            void queryClient.invalidateQueries({
              queryKey: savedCardKeys.forClient(clientId),
            });
          } else {
            setNotSaved(
              savedBody?.error ??
                "The card could not be saved, so it was not kept for next time.",
            );
          }
        }
      }

      const response = await fetch("/api/payments/clover/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [
    bookingId,
    tipCents,
    amountCents,
    onPaid,
    savedCardId,
    saveCard,
    clientId,
    queryClient,
  ]);

  // A stored card needs no hosted fields, so the pay button must not wait on
  // them becoming ready — they are not mounted.
  const canPay = savedCardId !== null || ready;

  return (
    <div className="space-y-4">
      <SavedCardPicker
        clientId={clientId}
        selectedId={savedCardId}
        onSelect={setSavedCardId}
      />

      {savedCardId === null && (
        <>
          <CloverCardFields
            ref={fields}
            publicApiKey={publicApiKey}
            merchantId={merchantId}
            sdkUrl={sdkUrl}
            onReadyChange={setReady}
          />

          {clientId && (
            <label className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                checked={saveCard}
                onCheckedChange={(next) => setSaveCard(next === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                Save this card for future payments
                {/* The wording is the consent. It has to say that the card is
                    kept and may be charged again, because that is what is
                    being agreed to — "save this card" alone does not. */}
                <span className="text-muted-foreground block text-xs">
                  The card is stored securely by our payment processor so this
                  facility can charge it again. You can remove it at any time.
                </span>
              </span>
            </label>
          )}
        </>
      )}

      {problem && (
        <p className="text-destructive text-sm" role="alert">
          {problem}
        </p>
      )}

      {/* Not an error, and deliberately not red: the payment is unaffected.
          Saying "something went wrong" here would have a customer checking
          their bank for a charge that went through perfectly. */}
      {notSaved && (
        <p className="text-muted-foreground text-sm" role="status">
          {notSaved}
        </p>
      )}

      <Button
        onClick={pay}
        disabled={!canPay || busy}
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
