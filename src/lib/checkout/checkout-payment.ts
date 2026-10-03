import type { SplitRow } from "@/lib/checkout/plan-split";
import type { PaymentMethod } from "@/lib/invoice-lifecycle";

// ============================================================================
// What the payment dialog hands the checkout, and what it hands back.
//
// Types only. They lived in `PaymentCheckoutFlow.tsx`, the dialog the client's
// Take payment mock replaced (2026-10-03); the contract outlived it, so it
// moved somewhere both ends can import without importing a screen.
// ============================================================================

/** One priced line on the printed receipt — the service, an item, a fee. */
export interface ReceiptDetailLine {
  label: string;
  amount: number;
}

/**
 * What the dialog hands its caller. Supply, tax and tip are APART, because the
 * ledger records them apart: a booking's balance is the pre-tax supply
 * (20260819210000), and a single `amount` with the tax folded in was refused
 * as "more than is owed" at every facility that charges tax.
 */
export interface CheckoutPayment {
  method: PaymentMethod;
  /** The supply being paid for — what is owed, less the discounts shown. */
  subtotal: number;
  tax: number;
  tip: number;
  /** subtotal + tax + tip: the figure on the button. */
  amount: number;
  /** Cash handed over, when the tender is cash. */
  cashReceived?: number;
  changeAsCredit: boolean;
  changeAmount: number;
  /** Set in split mode: each part, planned by lib/checkout/plan-split. */
  splits?: SplitRow[];
  /**
   * Each leg already worked out — account credit, then one or two methods —
   * by the Take payment dialog (lib/payments/take-payment-math). Used as
   * given, in order. A card or the terminal is sent its OWN share unless it
   * is the last leg of a full payment, which still takes whatever is left on
   * the server. An empty list moves no money: the bill's lines are written
   * and nothing is charged (an e-transfer that has not arrived yet).
   */
  parts?: CheckoutLeg[];
  /** Only PART of the balance is paid now: every leg is sent its share. */
  partial?: boolean;
  /** Which terminal to charge on, when a terminal is involved. */
  deviceSerial?: string;
  /** The card to charge, when the tender is `gift_card`. */
  giftCardCode?: string;
  /** The stored card to charge, when a saved card is involved. */
  savedCardId?: string;
  /** A card typed now: the `clv_` token from Clover's hosted fields. */
  cardSource?: string;
  /** The payment note, which goes on the ledger row — not only on paper. */
  note?: string;
}

/** One leg of a payment, with its own supply, tax and tip. */
export interface CheckoutLeg {
  method: PaymentMethod;
  subtotal: number;
  tax: number;
  tip: number;
  /** Cash handed over, for a cash leg. */
  cashReceived?: number;
}

/**
 * What actually happened, so the dialog reports THAT rather than the total it
 * was showing. `stillOwed` is set when only part of the bill was covered —
 * store credit that did not stretch, say.
 */
export interface CheckoutResult {
  taken: number;
  stillOwed?: number;
  /** Said instead of "Payment complete" — e.g. nothing could be charged. */
  message?: string;
}
