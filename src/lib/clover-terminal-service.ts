/**
 * Clover Terminal Service
 * 
 * Handles communication with Fiserv Clover physical terminals
 * Supports Tap/Chip/Swipe payments and receipt printing
 */

import {
  CloverTerminalConfig,
  CloverTerminalTransaction,
  getCloverTerminal,
  addCloverTransaction,
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
 * Process payment through Clover terminal
 */
export async function processCloverPayment(
  request: CloverPaymentRequest
): Promise<CloverPaymentResponse> {
  const terminal = getCloverTerminal(request.facilityId, request.terminalId);
  
  if (!terminal) {
    return {
      success: false,
      transactionId: "",
      cloverTransactionId: "",
      amount: request.amount,
      totalAmount: request.amount + (request.tipAmount || 0),
      currency: request.currency,
      paymentMethod: "chip",
      status: "failed",
      receiptPrinted: false,
      error: {
        code: "TERMINAL_NOT_FOUND",
        message: "Clover terminal not found or not active",
      },
      processedAt: new Date().toISOString(),
    };
  }

  if (!terminal.isOnline) {
    return {
      success: false,
      transactionId: "",
      cloverTransactionId: "",
      amount: request.amount,
      totalAmount: request.amount + (request.tipAmount || 0),
      currency: request.currency,
      paymentMethod: "chip",
      status: "failed",
      receiptPrinted: false,
      error: {
        code: "TERMINAL_OFFLINE",
        message: "Clover terminal is offline",
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Simulate Clover terminal payment processing
  // In production, this would communicate with the Clover device via API
  const transactionId = `clover_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const cloverTransactionId = `clv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Simulate processing delay (terminal interaction)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Simulate payment method detection (random for demo)
  const paymentMethods: ("tap" | "chip" | "swipe")[] = ["tap", "chip", "swipe"];
  const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

  // Simulate success/failure (90% success rate)
  const success = Math.random() > 0.1;

  if (!success) {
    const failedTransaction: CloverTerminalTransaction = {
      id: transactionId,
      facilityId: request.facilityId,
      terminalId: request.terminalId,
      terminalName: terminal.terminalName,
      cloverTransactionId,
      amount: request.amount,
      currency: request.currency,
      tipAmount: request.tipAmount,
      totalAmount: request.amount + (request.tipAmount || 0),
      paymentMethod,
      status: "failed",
      receiptPrinted: false,
      invoiceId: request.invoiceId,
      customerId: request.customerId,
      bookingId: request.bookingId,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      errorMessage: "Payment was declined",
    };
    addCloverTransaction(failedTransaction);

    return {
      success: false,
      transactionId,
      cloverTransactionId,
      amount: request.amount,
      tipAmount: request.tipAmount,
      totalAmount: request.amount + (request.tipAmount || 0),
      currency: request.currency,
      paymentMethod,
      status: "failed",
      receiptPrinted: false,
      error: {
        code: "DECLINED",
        message: "Payment was declined by the card issuer",
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Generate receipt data
  const receiptData = generateReceiptData({
    transactionId,
    amount: request.amount,
    tipAmount: request.tipAmount,
    totalAmount: request.amount + (request.tipAmount || 0),
    paymentMethod,
    description: request.description,
    terminalName: terminal.terminalName,
    customerId: request.customerId,
    invoiceId: request.invoiceId,
    bookingId: request.bookingId,
  });

  // Print receipt on terminal if requested
  let receiptPrinted = false;
  if (request.printReceipt) {
    receiptPrinted = await printReceiptOnTerminal(terminal, receiptData, {
      printCustomerCopy: request.printCustomerCopy ?? terminal.printCustomerCopy,
      printMerchantCopy: request.printMerchantCopy ?? terminal.printMerchantCopy,
    });
  }

  // Record successful transaction
  const transaction: CloverTerminalTransaction = {
    id: transactionId,
    facilityId: request.facilityId,
    terminalId: request.terminalId,
    terminalName: terminal.terminalName,
    cloverTransactionId,
    amount: request.amount,
    currency: request.currency,
    tipAmount: request.tipAmount,
    totalAmount: request.amount + (request.tipAmount || 0),
    paymentMethod,
    cardBrand: "visa", // Mock - would come from terminal
    cardLast4: "4242", // Mock - would come from terminal
    status: "completed",
    receiptPrinted,
    receiptPrintedAt: receiptPrinted ? new Date().toISOString() : undefined,
    receiptData,
    invoiceId: request.invoiceId,
    customerId: request.customerId,
    bookingId: request.bookingId,
    processedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  addCloverTransaction(transaction);

  return {
    success: true,
    transactionId,
    cloverTransactionId,
    amount: request.amount,
    tipAmount: request.tipAmount,
    totalAmount: request.amount + (request.tipAmount || 0),
    currency: request.currency,
    paymentMethod,
    cardBrand: "visa",
    cardLast4: "4242",
    status: "completed",
    receiptPrinted,
    receiptData,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Print receipt on Clover terminal
 */
async function printReceiptOnTerminal(
  terminal: CloverTerminalConfig,
  receiptData: string,
  options: {
    printCustomerCopy: boolean;
    printMerchantCopy: boolean;
  }
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

  let receipt = `
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
  transactionId: string
): Promise<boolean> {
  const terminal = getCloverTerminal(facilityId, terminalId);
  if (!terminal || !terminal.isOnline) {
    return false;
  }

  // In production, retrieve transaction and reprint
  // For now, simulate reprint
  console.log(`Re-printing receipt for transaction ${transactionId} on terminal ${terminal.terminalName}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return true;
}

/**
 * Check terminal status
 */
export async function checkTerminalStatus(
  facilityId: number,
  terminalId: string
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
