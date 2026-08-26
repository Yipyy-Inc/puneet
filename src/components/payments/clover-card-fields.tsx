"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Lock } from "lucide-react";

// ============================================================================
// Clover's hosted card fields. The only place a card is typed in this app.
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
// ── WHY THIS IS ITS OWN COMPONENT ─────────────────────────────────────────
//
// It was the body of `clover-checkout.tsx`, which pays a BOOKING. The shop
// counter needs the same fields against a different route, and the retail
// checkout used to collect a raw PAN into React state instead — which is the
// exact thing the iframes exist to prevent. One implementation, so there is one
// place where this can be got right or wrong.
// ============================================================================

interface CloverElement {
  /** A CSS SELECTOR, not a node — see the mount effect below. */
  mount: (selector: string) => void;
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
  { kind: "CARD_NUMBER", slug: "number", label: "Card number" },
  { kind: "CARD_DATE", slug: "date", label: "Expiry" },
  { kind: "CARD_CVV", slug: "cvv", label: "CVV" },
  { kind: "CARD_POSTAL_CODE", slug: "postal", label: "Postal code" },
] as const;

export type TokenResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export interface CloverCardFieldsHandle {
  /**
   * Turn whatever is in the iframes into a `clv_` token.
   *
   * Never throws — a caller mid-way through a split payment must be able to
   * stop without unwinding instalments that already charged.
   */
  createToken: () => Promise<TokenResult>;
}

export interface CloverCardFieldsProps {
  publicApiKey: string;
  merchantId: string;
  /** Clover's SDK URL for this environment. */
  sdkUrl: string;
  /** Told when the iframes are actually usable, so a caller can gate a button. */
  onReadyChange?: (ready: boolean) => void;
  className?: string;
}

export const CloverCardFields = forwardRef<
  CloverCardFieldsHandle,
  CloverCardFieldsProps
>(function CloverCardFields(
  { publicApiKey, merchantId, sdkUrl, onReadyChange, className },
  ref,
) {
  const [problem, setProblem] = useState<string | null>(null);
  const clover = useRef<CloverInstance | null>(null);

  // ── THE IDS MUST BE UNIQUE AND MUST BE VALID CSS ─────────────────────────
  //
  // `mount()` takes a SELECTOR, so two instances sharing a hardcoded id would
  // have the second one mount into the first one's div. `useId()` fixes the
  // uniqueness — but it returns something like `:r1:`, and a bare `#:r1:` is a
  // syntax error in a selector, so the punctuation is stripped rather than
  // escaped.
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "");
  const idFor = (slug: string) => `clover-${instance}-${slug}`;

  const readyChanged = useRef(onReadyChange);
  readyChanged.current = onReadyChange;

  useEffect(() => {
    let cancelled = false;

    // Synchronising with an external system — Clover's SDK and the iframes it
    // mounts. setState happens in the load callback, never in the effect body.
    const mount = () => {
      if (cancelled || !window.Clover || clover.current) return;
      try {
        const created = new window.Clover(publicApiKey, { merchantId });
        const elements = created.elements();
        for (const field of FIELDS) {
          // A CSS SELECTOR, not the node. Clover's SDK resolves the target
          // itself and throws on anything else — passing the HTMLElement (which
          // reads more naturally, and is what this did first) fails the whole
          // mount, so all four fields are missing and the only evidence is the
          // generic message below.
          elements.create(field.kind).mount(`#${idFor(field.slug)}`);
        }
        clover.current = created;
        readyChanged.current?.(true);
      } catch (error) {
        // The customer gets a sentence they can act on; whoever is looking at
        // the console gets the reason. Without this the two are the same string
        // and the actual fault is unknowable from outside.
        console.error("Clover's card fields could not be mounted.", error);
        setProblem(
          "The payment form could not be loaded. Refresh and try again.",
        );
        readyChanged.current?.(false);
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
    // `idFor` is derived from `instance`, which is stable for this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicApiKey, merchantId, sdkUrl, instance]);

  const createToken = useCallback(async (): Promise<TokenResult> => {
    if (!clover.current) {
      return { ok: false, message: "The card form is not ready yet." };
    }
    setProblem(null);
    try {
      const result = await clover.current.createToken();
      if (!result.token) {
        // Clover reports per-field problems; the first is the one to fix.
        const first = result.errors ? Object.values(result.errors)[0] : null;
        const message = first ?? "Check the card details and try again.";
        setProblem(message);
        return { ok: false, message };
      }
      return { ok: true, token: result.token };
    } catch {
      const message = "The card could not be read. Try again.";
      setProblem(message);
      return { ok: false, message };
    }
  }, []);

  useImperativeHandle(ref, () => ({ createToken }), [createToken]);

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.slug}
            className={field.kind === "CARD_NUMBER" ? "sm:col-span-2" : ""}
          >
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {field.label}
            </label>
            {/* Empty on purpose: Clover mounts an iframe here.
             *
             * `data-clover-field` is the STABLE handle. The id has to be
             * unique per instance, so it is generated and cannot be written
             * down in a test — `clover-pay.spec.ts` asserted the old hardcoded
             * ids and would have started failing silently, since it skips
             * without a fixture and no CI suite runs it. */}
            <div
              id={idFor(field.slug)}
              data-clover-field={field.slug}
              className="bg-background h-10 rounded-md border px-3 py-2"
            />
          </div>
        ))}
      </div>

      {problem && (
        <p className="text-destructive mt-3 text-sm" role="alert">
          {problem}
        </p>
      )}

      <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-xs">
        <Lock className="size-3" />
        Card details go straight to Clover. They never reach Yipyy.
      </p>
    </div>
  );
});
