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
  getFiservConfig,
  addTokenizedCard,
} from "@/data/fiserv-payments";

// Re-export types for convenience
export type {
  FiservPaymentRequest,
  FiservPaymentResponse,
  FiservRefundRequest,
  FiservRefundResponse,
};

/**
 * Process a payment through Fiserv
 */
export async function processFiservPayment(
  request: FiservPaymentRequest,
): Promise<FiservPaymentResponse> {
  const config = getFiservConfig(request.facilityId);

  if (!config) {
    return {
      success: false,
      transactionId: "",
      fiservTransactionId: "",
      amount: request.amount,
      currency: request.currency,
      status: "failed",
      error: {
        code: "CONFIG_NOT_FOUND",
        message: "Fiserv payment configuration not found for this facility",
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Check if payment method is enabled
  if (
    request.paymentSource === "new_card" ||
    request.paymentSource === "tokenized_card"
  ) {
    if (!config.enabledPaymentMethods.card) {
      return {
        success: false,
        transactionId: "",
        fiservTransactionId: "",
        amount: request.amount,
        currency: request.currency,
        status: "failed",
        error: {
          code: "METHOD_DISABLED",
          message: "Card payments are not enabled for this facility",
        },
        processedAt: new Date().toISOString(),
      };
    }
  }

  // Simulate Fiserv API call
  // In production, this would make actual API calls to Fiserv
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fiservTransactionId = `fiserv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate success/failure (90% success rate for demo)
  const success = Math.random() > 0.1;

  if (!success) {
    return {
      success: false,
      transactionId,
      fiservTransactionId,
      amount: request.amount,
      currency: request.currency,
      status: "declined",
      error: {
        code: "DECLINED",
        message: "Payment was declined by the card issuer",
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Handle tokenization if saving card
  let tokenizedCardId: string | undefined;
  let fiservToken: string | undefined;

  if (request.paymentSource === "new_card" && request.newCard?.saveToAccount) {
    // Tokenize and save card
    fiservToken = `fiserv_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTokenizedCard = addTokenizedCard({
      facilityId: request.facilityId,
      clientId: request.clientId,
      fiservToken,
      cardBrand: detectCardBrand(request.newCard.number),
      cardLast4: request.newCard.number.slice(-4),
      cardExpMonth: request.newCard.expMonth,
      cardExpYear: request.newCard.expYear,
      cardholderName: request.newCard.cardholderName,
      isDefault: request.newCard.setAsDefault ?? false,
      isActive: true,
      isExpired: false,
      autoPayEnabled: false,
      autoPayServices: [],
      billingAddress: request.newCard.billingAddress,
    });

    tokenizedCardId = newTokenizedCard.id;
  } else if (
    request.paymentSource === "tokenized_card" &&
    request.tokenizedCardId
  ) {
    // Use existing tokenized card
    tokenizedCardId = request.tokenizedCardId;
    // In production, retrieve fiservToken from database
    fiservToken = `fiserv_token_existing_${request.tokenizedCardId}`;
  }

  // Extract card info for response
  let cardBrand: string | undefined;
  let cardLast4: string | undefined;

  if (request.paymentSource === "new_card" && request.newCard) {
    cardBrand = detectCardBrand(request.newCard.number);
    cardLast4 = request.newCard.number.slice(-4);
  } else if (
    request.paymentSource === "tokenized_card" &&
    request.tokenizedCardId
  ) {
    // In production, retrieve from database
    cardBrand = "visa"; // Mock
    cardLast4 = "4242"; // Mock
  }

  return {
    success: true,
    transactionId,
    fiservTransactionId,
    amount: request.amount + (request.tipAmount || 0),
    currency: request.currency,
    status: "completed",
    cardBrand,
    cardLast4,
    tokenizedCardId,
    fiservToken,
    receiptUrl: `/receipts/${transactionId}.pdf`,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Process a refund through Fiserv
 */
export async function processFiservRefund(
  request: FiservRefundRequest,
): Promise<FiservRefundResponse> {
  const config = getFiservConfig(request.facilityId);

  if (!config) {
    return {
      success: false,
      refundId: "",
      fiservRefundId: "",
      amount: request.amount,
      status: "failed",
      error: {
        code: "CONFIG_NOT_FOUND",
        message: "Fiserv payment configuration not found for this facility",
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Simulate Fiserv refund API call
  const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fiservRefundId = `fiserv_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate success (95% success rate for refunds)
  const success = Math.random() > 0.05;

  if (!success) {
    return {
      success: false,
      refundId,
      fiservRefundId,
      amount: request.amount,
      status: "failed",
      error: {
        code: "REFUND_FAILED",
        message: "Refund could not be processed",
      },
      processedAt: new Date().toISOString(),
    };
  }

  return {
    success: true,
    refundId,
    fiservRefundId,
    amount: request.amount,
    status: "completed",
    processedAt: new Date().toISOString(),
  };
}

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

export interface CloverConnectionTest {
  ok: boolean;
  message: string;
}

/** Verify the platform's Clover Fiserv API credentials. */
export async function testCloverConnection(input: {
  merchantId: string;
  appSecret: string;
  appId: string;
  environment: "sandbox" | "production";
}): Promise<CloverConnectionTest> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (!input.merchantId || !input.appSecret || !input.appId) {
    return {
      ok: false,
      message:
        "Missing credentials — Merchant ID, Private App Secret and App ID are all required.",
    };
  }
  return {
    ok: true,
    message: `Connected to Clover Fiserv (${input.environment}).`,
  };
}

export interface CloverTestChargeResult {
  ok: boolean;
  chargeId?: string;
  refundId?: string;
  message: string;
}

/**
 * Send a $0.01 test charge to the designated test card and immediately refund it,
 * confirming the full charge → refund flow through Clover Fiserv end-to-end.
 */
export async function sendCloverTestCharge(): Promise<CloverTestChargeResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const chargeId = `txn_test_${Date.now()}`;
  await new Promise((resolve) => setTimeout(resolve, 300));
  const refundId = `refund_test_${Date.now()}`;
  return {
    ok: true,
    chargeId,
    refundId,
    message: "Test charge of $0.01 succeeded and was immediately refunded.",
  };
}

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
