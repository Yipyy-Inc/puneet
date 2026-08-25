/**
 * Clover Terminal Service
 *
 * Handles communication with Fiserv Clover physical terminals
 * Supports Tap/Chip/Swipe payments and receipt printing
 */

import {
  CloverTerminalConfig,
  getCloverTerminal,
} from "@/data/fiserv-payments";

export interface CloverPaymentRequest {
  facilityId: number;
  terminalId: string;
  amount: number;
  currency: "USD" | "CAD";
  tipAmount?: number;
  description: string;
  // Linking
  invoiceId?: string;
  customerId?: number;
  bookingId?: number;
  // Receipt settings
  printReceipt: boolean;
  printCustomerCopy?: boolean;
  printMerchantCopy?: boolean;
}

export interface CloverPaymentResponse {
  success: boolean;
  transactionId: string;
  cloverTransactionId: string;
  amount: number;
  tipAmount?: number;
  totalAmount: number;
  currency: "USD" | "CAD";
  // Payment method used
  paymentMethod: "tap" | "chip" | "swipe";
  cardBrand?: string;
  cardLast4?: string;
  // Status
  status: "completed" | "pending" | "failed" | "cancelled";
  // Receipt
  receiptPrinted: boolean;
  receiptData?: string;
  // Error
  error?: {
    code: string;
    message: string;
  };
  processedAt: string;
}

/**
 * There is no `processCloverPayment` here, and there should not be one.
 *
 * It lived in this file until 2026-08-25 and it never contacted Clover: a
 * sleep, a random "payment method detected", and a `clover_txn_<timestamp>` id.
 * It sat beside a REAL Clover integration (`src/lib/clover/`) sharing its name,
 * which is the worst place for a pretender to stand.
 *
 * A card-present sale is `chargeOnTerminal` in `src/lib/clover/terminal.ts`,
 * reached from retail through `/api/payments/retail/charge`. It needs the
 * device's SERIAL, which this file's fixture terminals never had.
 */

/**
 * Print receipt on Clover terminal
 */
async function printReceiptOnTerminal(
  terminal: CloverTerminalConfig,
  receiptData: string,
  _options: {
    printCustomerCopy: boolean;
    printMerchantCopy: boolean;
  },
): Promise<boolean> {
  // Simulate terminal printing
  // In production, this would send print command to Clover device
  console.log(`Printing receipt on terminal ${terminal.terminalName}...`);
  console.log(`Receipt data:\n${receiptData}`);

  // Simulate print delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // In production, check if print was successful
  return true;
}

/**
 * Generate receipt data for printing
 */
function generateReceiptData(data: {
  transactionId: string;
  amount: number;
  tipAmount?: number;
  totalAmount: number;
  paymentMethod: "tap" | "chip" | "swipe";
  description: string;
  terminalName: string;
  customerId?: number;
  invoiceId?: string;
  bookingId?: number;
}): string {
  const date = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const receipt = `
================================
        RECEIPT
================================
Date: ${date}
Transaction: ${data.transactionId}
Terminal: ${data.terminalName}
--------------------------------
Description: ${data.description}
${data.invoiceId ? `Invoice: ${data.invoiceId}\n` : ""}
${data.bookingId ? `Booking: #${data.bookingId}\n` : ""}
--------------------------------
Subtotal:        $${data.amount.toFixed(2)}
${data.tipAmount ? `Tip:              $${data.tipAmount.toFixed(2)}\n` : ""}
--------------------------------
TOTAL:           $${data.totalAmount.toFixed(2)}
--------------------------------
Payment Method: ${data.paymentMethod.toUpperCase()}
${data.paymentMethod === "tap" ? "Contactless Payment" : data.paymentMethod === "chip" ? "Chip Card" : "Swipe Card"}
--------------------------------
Thank you for your business!
================================
`;

  return receipt.trim();
}

/**
 * Re-print receipt on terminal
 */
export async function reprintReceiptOnTerminal(
  facilityId: number,
  terminalId: string,
  transactionId: string,
): Promise<boolean> {
  const terminal = getCloverTerminal(facilityId, terminalId);
  if (!terminal || !terminal.isOnline) {
    return false;
  }

  // In production, retrieve transaction and reprint
  // For now, simulate reprint
  console.log(
    `Re-printing receipt for transaction ${transactionId} on terminal ${terminal.terminalName}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return true;
}

/**
 * Check terminal status
 */
export async function checkTerminalStatus(
  facilityId: number,
  terminalId: string,
): Promise<{
  isOnline: boolean;
  isReady: boolean;
  lastSeen?: string;
}> {
  const terminal = getCloverTerminal(facilityId, terminalId);

  if (!terminal) {
    return {
      isOnline: false,
      isReady: false,
    };
  }

  // In production, ping terminal to check status
  // For now, use stored status
  return {
    isOnline: terminal.isOnline,
    isReady: terminal.isOnline && terminal.isActive,
    lastSeen: terminal.lastSeen,
  };
}
