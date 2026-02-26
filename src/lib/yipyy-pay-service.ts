/**
 * Yipyy Pay / Tap to Pay Service
 * 
 * Handles contactless card payments via iPhone (Tap to Pay)
 * No physical terminal needed - uses iPhone's NFC capability
 */

import {
  YipyyPayConfig,
  YipyyPayDevice,
  YipyyPayTransaction,
  getYipyyPayConfig,
  getYipyyPayDevice,
  addYipyyPayTransaction,
} from "@/data/fiserv-payments";

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
export async function processYipyyPay(
  request: YipyyPayRequest
): Promise<YipyyPayResponse> {
  const config = getYipyyPayConfig(request.facilityId);
  
  if (!config || !config.enabled) {
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
        code: "YIPYY_PAY_DISABLED",
        message: "Yipyy Pay / Tap to Pay is not enabled for this facility",
      },
      processedAt: new Date().toISOString(),
    };
  }

  const device = getYipyyPayDevice(request.facilityId, request.deviceId);
  
  if (!device) {
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
        code: "DEVICE_NOT_FOUND",
        message: "Authorized iPhone device not found",
      },
      processedAt: new Date().toISOString(),
    };
  }

  if (!device.isAuthorized || !device.isActive) {
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
        code: "DEVICE_NOT_AUTHORIZED",
        message: "iPhone device is not authorized for Tap to Pay",
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Check transaction limits
  const totalAmount = request.amount + (request.tipAmount || 0);
  if (config.maxTransactionAmount && totalAmount > config.maxTransactionAmount) {
    return {
      success: false,
      transactionId: "",
      yipyyTransactionId: "",
      amount: request.amount,
      totalAmount,
      currency: request.currency,
      paymentMethod: "tap",
      status: "failed",
      receiptSent: false,
      error: {
        code: "AMOUNT_EXCEEDS_LIMIT",
        message: `Transaction amount exceeds maximum limit of $${config.maxTransactionAmount}`,
      },
      processedAt: new Date().toISOString(),
    };
  }

  if (config.minTransactionAmount && totalAmount < config.minTransactionAmount) {
    return {
      success: false,
      transactionId: "",
      yipyyTransactionId: "",
      amount: request.amount,
      totalAmount,
      currency: request.currency,
      paymentMethod: "tap",
      status: "failed",
      receiptSent: false,
      error: {
        code: "AMOUNT_BELOW_MINIMUM",
        message: `Transaction amount is below minimum of $${config.minTransactionAmount}`,
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Simulate Tap to Pay processing
  // In production, this would:
  // 1. Initiate NFC payment on iPhone
  // 2. Wait for customer to tap their card/phone
  // 3. Process payment through Yipyy Pay API
  const transactionId = `yipyy_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const yipyyTransactionId = `yipyy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Simulate processing delay (NFC interaction)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Simulate success/failure (90% success rate)
  const success = Math.random() > 0.1;

  if (!success) {
    const failedTransaction: YipyyPayTransaction = {
      id: transactionId,
      facilityId: request.facilityId,
      deviceId: request.deviceId,
      deviceName: device.deviceName,
      yipyyTransactionId,
      amount: request.amount,
      currency: request.currency,
      tipAmount: request.tipAmount,
      totalAmount,
      paymentMethod: "tap",
      status: "failed",
      receiptSent: false,
      invoiceId: request.invoiceId,
      customerId: request.customerId,
      bookingId: request.bookingId,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      processedBy: request.processedBy,
      processedById: request.processedById,
      errorMessage: "Payment was declined or cancelled",
    };
    addYipyyPayTransaction(failedTransaction);

    return {
      success: false,
      transactionId,
      yipyyTransactionId,
      amount: request.amount,
      tipAmount: request.tipAmount,
      totalAmount,
      currency: request.currency,
      paymentMethod: "tap",
      status: "failed",
      receiptSent: false,
      error: {
        code: "DECLINED",
        message: "Payment was declined or cancelled by customer",
      },
      processedAt: new Date().toISOString(),
    };
  }

  // Generate receipt data
  const receiptData = generateReceiptData({
    transactionId,
    amount: request.amount,
    tipAmount: request.tipAmount,
    totalAmount,
    description: request.description,
    deviceName: device.deviceName,
    customerId: request.customerId,
    invoiceId: request.invoiceId,
    bookingId: request.bookingId,
  });

  // Send receipt if requested
  let receiptSent = false;
  if (request.sendReceipt && config.autoSendReceipt) {
    receiptSent = await sendReceipt(request.customerId, receiptData);
  }

  // Record successful transaction
  const transaction: YipyyPayTransaction = {
    id: transactionId,
    facilityId: request.facilityId,
    deviceId: request.deviceId,
    deviceName: device.deviceName,
    yipyyTransactionId,
    amount: request.amount,
    currency: request.currency,
    tipAmount: request.tipAmount,
    totalAmount,
    paymentMethod: "tap",
    cardBrand: "visa", // Mock - would come from Yipyy Pay
    cardLast4: "4242", // Mock - would come from Yipyy Pay
    status: "completed",
    receiptSent,
    receiptSentAt: receiptSent ? new Date().toISOString() : undefined,
    receiptData,
    invoiceId: request.invoiceId,
    customerId: request.customerId,
    bookingId: request.bookingId,
    processedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    processedBy: request.processedBy,
    processedById: request.processedById,
  };
  addYipyyPayTransaction(transaction);

  // Update device last used timestamp
  device.lastUsedAt = new Date().toISOString();

  return {
    success: true,
    transactionId,
    yipyyTransactionId,
    amount: request.amount,
    tipAmount: request.tipAmount,
    totalAmount,
    currency: request.currency,
    paymentMethod: "tap",
    cardBrand: "visa",
    cardLast4: "4242",
    status: "completed",
    receiptSent,
    receiptData,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Generate receipt data
 */
function generateReceiptData(data: {
  transactionId: string;
  amount: number;
  tipAmount?: number;
  totalAmount: number;
  description: string;
  deviceName: string;
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
Device: ${data.deviceName}
Payment: Tap to Pay (iPhone)
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
Payment Method: TAP TO PAY
Contactless Payment via iPhone
--------------------------------
Thank you for your business!
================================
`;

  return receipt.trim();
}

/**
 * Send receipt to customer
 */
async function sendReceipt(
  customerId: number | undefined,
  receiptData: string
): Promise<boolean> {
  if (!customerId) {
    return false;
  }

  // Simulate sending receipt via email/SMS
  // In production, this would send receipt to customer's email or phone
  console.log(`Sending receipt to customer ${customerId}...`);
  console.log(`Receipt data:\n${receiptData}`);
  
  await new Promise((resolve) => setTimeout(resolve, 500));
  return true;
}

/**
 * Check if device is ready for Tap to Pay
 */
export async function checkDeviceReady(
  facilityId: number,
  deviceId: string
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
