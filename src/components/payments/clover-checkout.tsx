"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";

// ============================================================================
// Clover's hosted card fields, inside our own checkout.
//
// ── THE CARD NUMBER NEVER TOUCHES THIS PAGE ───────────────────────────────
//
// Each field below is an IFRAME served by Clover, mounted into an empty div we
// own. React renders the container; Clover renders what is inside it, and the
// digits the customer types are in a different origin. `createToken()` returns
// a `clv_` reference, and that is the only thing our code ever sees or sends.
//
// This is the whole reason Yipyy is not in full PCI scope. A single "let me
// just read the value out of the field" would undo it, which is why there is no
// state here holding anything card-shaped.
//
// ── THE AMOUNT IS DISPLAY ONLY ────────────────────────────────────────────
//
// `amountCents` renders the button label. It is NOT sent — the server derives
// what is owed from the booking. If the two ever disagree, the server is right
// and the customer is charged correctly regardless of what this said.
// ============================================================================

interface CloverElement {
  mount: (selector: string | HTMLElement) => void;
  addEventListener?: (
    event: string,
    handler: (payload: unknown) => void,
  ) => void;
}

interface CloverElements {
  create: (kind: string, styles?: Record<string, unknown>) => CloverElement;
}

interface CloverInstance {
  elements: () => CloverElements;
  createToken: () => Promise<{
    token?: string;
    errors?: Record<string, string>;
  }>;
}

declare global {
  interface Window {
    Clover?: new (
      apiAccessKey: string,
      options?: { merchantId?: string },
    ) => CloverInstance;
  }
}

const FIELDS = [
  { kind: "CARD_NUMBER", id: "clover-card-number", label: "Card number" },
  { kind: "CARD_DATE", id: "clover-card-date", label: "Expiry" },
  { kind: "CARD_CVV", id: "clover-card-cvv", label: "CVV" },
  { kind: "CARD_POSTAL_CODE", id: "clover-card-postal", label: "Postal code" },
] as const;

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
  const clover = useRef<CloverInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Synchronising with an external system — Clover's SDK and the iframes it
    // mounts. setState happens in the load callback, never in the effect body.
    const mount = () => {
      if (cancelled || !window.Clover || clover.current) return;
      try {
        const instance = new window.Clover(publicApiKey, { merchantId });
        const elements = instance.elements();
        for (const field of FIELDS) {
          const node = document.getElementById(field.id);
          if (node) elements.create(field.kind).mount(node);
        }
        clover.current = instance;
        setReady(true);
      } catch {
        setProblem(
          "The payment form could not be loaded. Refresh and try again.",
        );
      }
    };

    if (window.Clover) {
      mount();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${sdkUrl}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.src = sdkUrl;
    script.async = true;
    script.addEventListener("load", mount);
    script.addEventListener("error", () =>
      setProblem("Could not reach the payment provider."),
    );
    if (!existing) document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", mount);
    };
  }, [publicApiKey, merchantId, sdkUrl]);

  const pay = useCallback(async () => {
    if (!clover.current) return;
    setBusy(true);
    setProblem(null);
    try {
      const result = await clover.current.createToken();
      if (!result.token) {
        const first = result.errors ? Object.values(result.errors)[0] : null;
        setProblem(first ?? "Check the card details and try again.");
        return;
      }

      const response = await fetch("/api/payments/clover/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The token and the tip. Never an amount — the server owns that.
        body: JSON.stringify({ bookingId, source: result.token, tipCents }),
      });
      const payload = (await response.json().catch(() => null)) as {
        paid?: boolean;
        paymentId?: string;
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
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.id}
            className={field.kind === "CARD_NUMBER" ? "sm:col-span-2" : ""}
          >
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {field.label}
            </label>
            {/* Empty on purpose: Clover mounts an iframe here. */}
            <div
              id={field.id}
              className="bg-background h-10 rounded-md border px-3 py-2"
            />
          </div>
        ))}
      </div>

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

      <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
        <Lock className="size-3" />
        Card details go straight to Clover. They never reach Yipyy.
      </p>
    </div>
  );
}
