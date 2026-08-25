/**
 * Fiserv Payment Service
 *
 * Service layer for processing payments through Fiserv API
 * Handles tokenization, charges, refunds, and card management
 */

import {
  FiservPaymentRequest,
  FiservPaymentResponse,
  FiservRefundRequest,
  FiservRefundResponse,
} from "@/data/fiserv-payments";

// Re-export types for convenience
export type {
  FiservPaymentRequest,
  FiservPaymentResponse,
  FiservRefundRequest,
  FiservRefundResponse,
};

/**
 * There is no `processFiservPayment`, and there should not be one.
 *
 * It lived here until 2026-08-25 and it was a simulator: a 500 ms sleep,
 * `Math.random() > 0.1` for the outcome, and an invented
 * `fiserv_<timestamp>` id. Its callers were the retail checkout, which told
 * facilities a card had been charged when nothing had been contacted — and
 * declined one sale in ten on behalf of a processor that does not exist.
 *
 * There is no Fiserv account. Real card payments are Clover:
 * `/api/payments/retail/charge` for a counter sale, `/api/payments/clover/*`
 * for a booking. Card-not-present needs a `clv_` token from the hosted fields;
 * a card number must never reach a server here.
 */

/**
 * There is no `processFiservRefund`, and there should not be one.
 *
 * It lived here until 2026-08-25 and it was a simulator: a 500 ms sleep,
 * `Math.random() > 0.05` for the outcome, and an invented
 * `fiserv_refund_<timestamp>` id. Its one caller — the retail returns screen —
 * printed "Return processed successfully" on the strength of it.
 *
 * Real refunds are `src/app/api/payments/clover/refund/route.ts`, against a
 * real merchant, reconciled from what Clover says happened. Do not add a
 * stand-in beside it: a fake that answers is harder to notice than a gap.
 */

/**
 * Detect card brand from card number
 */
function detectCardBrand(
  cardNumber: string,
): "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unknown" {
  const cleaned = cardNumber.replace(/\s/g, "");

  if (/^4/.test(cleaned)) return "visa";
  if (/^5[1-5]/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";
  if (/^6(?:011|5)/.test(cleaned)) return "discover";
  if (/^35/.test(cleaned)) return "jcb";
  if (/^3[0689]/.test(cleaned)) return "diners";

  return "unknown";
}

/**
 * Validate card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, "");

  if (!/^\d{13,19}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Format card number for display (e.g., "4242 4242 4242 4242")
 */
export function formatCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, "");
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleaned;
}

/**
 * Mask card number for display (e.g., "**** **** **** 4242")
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, "");
  if (cleaned.length < 4) return "****";
  return `**** **** **** ${cleaned.slice(-4)}`;
}

// ---- Card-on-file tokenization (Clover Fiserv) ---------------------------
//
// The subscription card is tokenized by Clover Fiserv (the primary processor).
// In production the PAN is captured by Clover's hosted fields and never reaches
// Yipyy — PCI DSS is Clover's responsibility. This mock simulates the token
// exchange and returns ONLY the Clover token plus last 4 + expiry (+ brand and
// cardholder name) for display; the raw number is discarded, never persisted.

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners",
  unknown: "Card",
};

/** Human-readable brand for a card number (e.g. "Visa"). */
export function displayCardBrand(cardNumber: string): string {
  return BRAND_LABEL[detectCardBrand(cardNumber)] ?? "Card";
}

export interface TokenizeCardRequest {
  facilityId: number;
  /** Raw PAN — used only to obtain a token; never returned or stored. */
  number: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
}

export interface TokenizedCard {
  /** Clover-issued token — the only card reference Yipyy persists. */
  token: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
}

// ---- Platform-level Clover Fiserv setup (System Config) -----------------
//
// `testCloverConnection` and `sendCloverTestCharge` used to live here. Neither
// contacted Clover.
//
// The first slept 500ms and reported "Connected to Clover Fiserv (sandbox)" if
// three form fields were non-empty — so typing nonsense into all three passed.
// The second slept, invented `txn_test_<timestamp>` and `refund_test_<timestamp>`
// and announced that $0.01 had been charged and immediately refunded. No card
// was ever charged, and the button could not fail.
//
// That is the check somebody runs to satisfy themselves that payments work
// before going live, so a version that always passes is worse than no version:
// it converts an unknown into a false confidence. Deleted rather than fixed —
// the real charge and refund paths exist (src/lib/clover/) and are exercised
// against live Clover, and a second, simulated pretender beside them is only a
// way to be misled.
//
// What the system-config screen shows instead is what the DEPLOYMENT actually
// has: /api/payments/clover/platform, booleans only.

/** Tokenize a card through Clover Fiserv. Returns display-safe fields only. */
export async function tokenizeCard(
  request: TokenizeCardRequest,
): Promise<TokenizedCard> {
  const digits = request.number.replace(/\D/g, "");
  // Simulate the Clover tokenization round-trip.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return {
    token: `clover_tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    brand: displayCardBrand(digits),
    last4: digits.slice(-4),
    expMonth: request.expMonth,
    expYear: request.expYear,
    cardholderName: request.cardholderName,
  };
}
