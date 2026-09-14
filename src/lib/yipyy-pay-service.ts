/**
 * Yipyy Pay / Tap to Pay Service
 *
 * Handles contactless card payments via iPhone (Tap to Pay)
 * No physical terminal needed - uses iPhone's NFC capability
 */

import { getYipyyPayDevice } from "@/data/fiserv-payments";

export interface YipyyPayRequest {
  facilityId: number;
  deviceId: string;
  amount: number;
  currency: "USD" | "CAD";
  tipAmount?: number;
  description: string;
  // Linking
  invoiceId?: string;
  customerId?: number;
  bookingId?: number;
  // Receipt settings
  sendReceipt: boolean;
  // Metadata
  processedBy?: string;
  processedById?: number;
}

export interface YipyyPayResponse {
  success: boolean;
  transactionId: string;
  yipyyTransactionId: string;
  amount: number;
  tipAmount?: number;
  totalAmount: number;
  currency: "USD" | "CAD";
  // Payment method (always "tap" for Tap to Pay)
  paymentMethod: "tap";
  cardBrand?: string;
  cardLast4?: string;
  // Status
  status: "completed" | "pending" | "failed" | "cancelled";
  // Receipt
  receiptSent: boolean;
  receiptData?: string;
  // Error
  error?: {
    code: string;
    message: string;
  };
  processedAt: string;
}

/**
 * Process payment via Yipyy Pay / Tap to Pay on iPhone
 */
// ── NOTHING TAKES A TAP YET ──────────────────────────────────────────────
//
// This simulated a Tap to Pay charge: it waited three seconds and approved
// nine payments in ten with an invented Visa transaction, and the till then
// recorded the sale as paid. No money moved. There is no in-person tap
// processor connected, so every request is refused, with the way to take the
// card instead. The till checks `success` before recording anything.
export async function processYipyyPay(
  request: YipyyPayRequest,
): Promise<YipyyPayResponse> {
  return {
    success: false,
    transactionId: "",
    yipyyTransactionId: "",
    amount: request.amount,
    totalAmount: request.amount + (request.tipAmount || 0),
    currency: request.currency,
    paymentMethod: "tap",
    status: "failed",
    receiptSent: false,
    error: {
      code: "TAP_TO_PAY_NOT_CONNECTED",
      message:
        "Tap to Pay on iPhone is not connected to a payment processor. Take the card on the Clover terminal, or type it in.",
    },
    processedAt: new Date().toISOString(),
  };
}

export async function checkDeviceReady(
  facilityId: number,
  deviceId: string,
): Promise<{
  isReady: boolean;
  isAuthorized: boolean;
  error?: string;
}> {
  const device = getYipyyPayDevice(facilityId, deviceId);

  if (!device) {
    return {
      isReady: false,
      isAuthorized: false,
      error: "Device not found",
    };
  }

  if (!device.isAuthorized) {
    return {
      isReady: false,
      isAuthorized: false,
      error: "Device is not authorized",
    };
  }

  if (!device.isActive) {
    return {
      isReady: false,
      isAuthorized: true,
      error: "Device is not active",
    };
  }

  // In production, check if iPhone NFC is enabled and ready
  return {
    isReady: true,
    isAuthorized: true,
  };
}
