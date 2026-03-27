import { z } from "zod";

// ============================================================================
// Payment Method (billing)
// ============================================================================

export const cardBrandEnum = z.enum(["visa", "mastercard", "amex", "discover"]);

export const paymentMethodSchema = z.object({
  id: z.string(),
  clientId: z.number(),
  type: z.enum(["card", "bank_account"]),
  isDefault: z.boolean(),
  cardBrand: cardBrandEnum.optional(),
  cardLast4: z.string().optional(),
  cardExpMonth: z.number().optional(),
  cardExpYear: z.number().optional(),
  cardholderName: z.string().optional(),
  bankName: z.string().optional(),
  accountLast4: z.string().optional(),
  createdAt: z.string(),
  stripePaymentMethodId: z.string().optional(),
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// ============================================================================
// Payment
// ============================================================================

export const paymentStatusEnum = z.enum([
  "pending",
  "completed",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const paymentMethodTypeEnum = z.enum([
  "card",
  "cash",
  "gift_card",
  "credit",
  "bank_transfer",
]);

export const currencyEnum = z.enum(["USD", "CAD"]);

export const paymentSchema = z
  .object({
    id: z.string(),
    facilityId: z.number(),
    clientId: z.number(),
    bookingId: z.number().optional(),
    invoiceId: z.string().optional(),
    amount: z.number(),
    tipAmount: z.number().optional(),
    totalAmount: z.number(),
    currency: currencyEnum,
    paymentMethod: paymentMethodTypeEnum,
    status: paymentStatusEnum,
    cardBrand: z.string().optional(),
    cardLast4: z.string().optional(),
    stripeChargeId: z.string().optional(),
    stripePaymentIntentId: z.string().optional(),
    giftCardId: z.string().optional(),
    creditUsed: z.number().optional(),
    refundAmount: z.number().optional(),
    refundReason: z.string().optional(),
    refundedAt: z.string().optional(),
    description: z.string(),
    receiptUrl: z.string().optional(),
    createdAt: z.string(),
    processedBy: z.string(),
    processedById: z.number(),
    notes: z.string().optional(),
  })
  .passthrough();
export type Payment = z.infer<typeof paymentSchema>;

// ============================================================================
// Invoice
// ============================================================================

export const invoiceStatusEnum = z.enum([
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

export const invoiceItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
  taxable: z.boolean(),
});
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z
  .object({
    id: z.string(),
    invoiceNumber: z.string(),
    facilityId: z.number(),
    clientId: z.number(),
    bookingId: z.number().optional(),
    status: invoiceStatusEnum,
    dueDate: z.string(),
    issuedDate: z.string(),
    paidDate: z.string().optional(),
    items: z.array(invoiceItemSchema),
    subtotal: z.number(),
    tax: z.number(),
    taxRate: z.number(),
    discount: z.number(),
    discountType: z.enum(["percentage", "fixed"]).optional(),
    discountReason: z.string().optional(),
    total: z.number(),
    amountPaid: z.number(),
    amountDue: z.number(),
    paymentIds: z.array(z.string()).optional(),
    isRecurring: z.boolean(),
    recurringFrequency: z
      .enum(["weekly", "monthly", "quarterly", "yearly"])
      .optional(),
    nextInvoiceDate: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
    createdBy: z.string(),
    createdById: z.number(),
    sentAt: z.string().optional(),
    reminderSentAt: z.string().optional(),
    reminderCount: z.number(),
  })
  .passthrough();
export type Invoice = z.infer<typeof invoiceSchema>;

// ============================================================================
// Gift Card (unified from payments.ts + retail.ts)
// ============================================================================

export const giftCardTransactionSchema = z.object({
  id: z.string(),
  giftCardId: z.string(),
  type: z.enum(["purchase", "redemption", "refund"]),
  amount: z.number(),
  balanceAfter: z.number(),
  paymentId: z.string().optional(),
  timestamp: z.string(),
  notes: z.string().optional(),
});
export type GiftCardTransaction = z.infer<typeof giftCardTransactionSchema>;

export const giftCardSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  // Billing fields (required — primary shape from payments.ts)
  code: z.string(),
  type: z.enum(["online", "physical"]),
  initialAmount: z.number(),
  currentBalance: z.number(),
  currency: currencyEnum,
  status: z.enum(["active", "redeemed", "expired", "cancelled"]),
  purchasedBy: z.string().optional(),
  purchasedByClientId: z.number().optional(),
  purchaseDate: z.string(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().optional(),
  message: z.string().optional(),
  expiryDate: z.string().optional(),
  neverExpires: z.boolean(),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
  transactionHistory: z.array(giftCardTransactionSchema),
  // Retail POS fields (optional — secondary shape from retail.ts)
  cardNumber: z.string().optional(),
  pin: z.string().optional(),
  amount: z.number().optional(),
  balance: z.number().optional(),
  issuedFrom: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type GiftCard = z.infer<typeof giftCardSchema>;

// ============================================================================
// Customer Credit
// ============================================================================

export const customerCreditSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  clientId: z.number(),
  amount: z.number(),
  remainingAmount: z.number(),
  currency: currencyEnum,
  reason: z.enum(["refund", "promotion", "compensation", "prepaid", "other"]),
  status: z.enum(["active", "fully_used", "expired", "cancelled"]),
  expiryDate: z.string().optional(),
  neverExpires: z.boolean(),
  description: z.string(),
  createdAt: z.string(),
  createdBy: z.string(),
  createdById: z.number(),
  lastUsedAt: z.string().optional(),
  notes: z.string().optional(),
});
export type CustomerCredit = z.infer<typeof customerCreditSchema>;

// ============================================================================
// Transaction (from transactions.ts)
// ============================================================================

export const transactionPaymentMethodEnum = z.enum([
  "credit_card",
  "debit_card",
  "bank_transfer",
  "paypal",
  "stripe",
  "other",
]);

export const transactionSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  facilityName: z.string(),
  transactionDate: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentMethod: transactionPaymentMethodEnum,
  paymentProvider: z.string(),
  status: z.enum(["success", "failed", "pending", "refunded"]),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  description: z.string(),
  processingFee: z.number(),
  netAmount: z.number(),
  refundAmount: z.number().optional(),
  refundDate: z.string().optional(),
  failureReason: z.string().optional(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const paymentProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["stripe", "paypal", "square", "braintree", "custom"]),
  isActive: z.boolean(),
  facilities: z.array(z.number()),
  processingFeePercentage: z.number(),
  fixedFee: z.number(),
  currency: z.string(),
  configuration: z.object({
    apiKey: z.string().optional(),
    publicKey: z.string().optional(),
    webhookUrl: z.string().optional(),
    supportedMethods: z.array(transactionPaymentMethodEnum),
  }),
  statistics: z.object({
    totalTransactions: z.number(),
    successfulTransactions: z.number(),
    failedTransactions: z.number(),
    totalVolume: z.number(),
    averageTransactionValue: z.number(),
  }),
});
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

// ============================================================================
// Fiserv / Clover / YipyyPay Types
// ============================================================================

export const autoPayServiceEnum = z.enum([
  "grooming",
  "membership",
  "package",
  "boarding",
  "daycare",
  "training",
]);
export type AutoPayService = z.infer<typeof autoPayServiceEnum>;

export const cloverTerminalConfigSchema = z.object({
  facilityId: z.number(),
  terminalId: z.string(),
  terminalName: z.string(),
  terminalSerialNumber: z.string(),
  connectionType: z.enum(["wifi", "ethernet", "bluetooth"]),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  isActive: z.boolean(),
  isOnline: z.boolean(),
  lastSeen: z.string().optional(),
  autoPrintReceipts: z.boolean(),
  printCustomerCopy: z.boolean(),
  printMerchantCopy: z.boolean(),
  supportsTap: z.boolean(),
  supportsChip: z.boolean(),
  supportsSwipe: z.boolean(),
  location: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CloverTerminalConfig = z.infer<typeof cloverTerminalConfigSchema>;

export const yipyyPayDeviceSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  deviceName: z.string(),
  deviceId: z.string(),
  deviceType: z.literal("iphone"),
  isActive: z.boolean(),
  isAuthorized: z.boolean(),
  authorizedBy: z.string().optional(),
  authorizedAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  createdAt: z.string(),
});
export type YipyyPayDevice = z.infer<typeof yipyyPayDeviceSchema>;

export const yipyyPayConfigSchema = z.object({
  facilityId: z.number(),
  enabled: z.boolean(),
  merchantId: z.string().optional(),
  apiKey: z.string().optional(),
  authorizedDevices: z.array(yipyyPayDeviceSchema),
  requireReceipt: z.boolean(),
  autoSendReceipt: z.boolean(),
  maxTransactionAmount: z.number().optional(),
  minTransactionAmount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type YipyyPayConfig = z.infer<typeof yipyyPayConfigSchema>;

export const yipyyPayTransactionSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  deviceId: z.string(),
  deviceName: z.string(),
  yipyyTransactionId: z.string(),
  amount: z.number(),
  currency: currencyEnum,
  tipAmount: z.number().optional(),
  totalAmount: z.number(),
  paymentMethod: z.literal("tap"),
  cardBrand: z.string().optional(),
  cardLast4: z.string().optional(),
  status: z.enum(["pending", "completed", "failed", "cancelled"]),
  invoiceId: z.string().optional(),
  customerId: z.number().optional(),
  bookingId: z.number().optional(),
  receiptSent: z.boolean(),
  receiptSentAt: z.string().optional(),
  receiptData: z.string().optional(),
  processedAt: z.string(),
  createdAt: z.string(),
  processedBy: z.string().optional(),
  processedById: z.number().optional(),
  errorMessage: z.string().optional(),
});
export type YipyyPayTransaction = z.infer<typeof yipyyPayTransactionSchema>;

export const extendedCardBrandEnum = z.enum([
  "visa",
  "mastercard",
  "amex",
  "discover",
  "jcb",
  "diners",
  "unknown",
]);

export const tokenizedCardSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  clientId: z.number(),
  fiservToken: z.string(),
  cardBrand: extendedCardBrandEnum,
  cardLast4: z.string(),
  cardExpMonth: z.number(),
  cardExpYear: z.number(),
  cardholderName: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isExpired: z.boolean(),
  autoPayEnabled: z.boolean(),
  autoPayServices: z.array(autoPayServiceEnum),
  billingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string(),
    })
    .optional(),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});
export type TokenizedCard = z.infer<typeof tokenizedCardSchema>;

// FiservPaymentConfig, CloverTerminalTransaction, FiservPaymentRequest/Response,
// FiservRefundRequest/Response, InPersonPaymentMethods — these are interfaces
// kept as-is since they're complex nested configs

export interface InPersonPaymentMethods {
  cloverTerminal: boolean;
  payWithiPhone: boolean;
  manualCardEntry: boolean;
  cash: boolean;
  storeCredit: boolean;
  giftCard: boolean;
  iphoneSettings?: {
    enabledLocations: string[];
    restrictedRoles?: string[];
    deviceRequirements: {
      minIOSVersion: string;
      supportedModels: string[];
    };
  };
  manualCardEntrySettings?: {
    adminOnly: boolean;
    requireCvv: boolean;
    requireZipCode: boolean;
  };
}

export interface FiservPaymentConfig {
  facilityId: number;
  apiKey: string;
  merchantId: string;
  terminalId?: string;
  inPersonMethods?: InPersonPaymentMethods;
  cloverTerminal?: {
    enabled: boolean;
    terminalId?: string;
    autoPrintReceipts: boolean;
    defaultPaymentMethod: "terminal" | "web" | "both";
  };
  yipyyPay?: {
    enabled: boolean;
    requireReceipt: boolean;
    autoSendReceipt: boolean;
  };
  environment: "sandbox" | "production";
  enabledPaymentMethods: {
    card: boolean;
    cardOnFile: boolean;
    autoPay: boolean;
    cash: boolean;
    giftCard: boolean;
    storeCredit: boolean;
    bankTransfer: boolean;
  };
  autoPaySettings: {
    enabled: boolean;
    requireConsent: boolean;
    defaultToAutoPay: boolean;
    allowedServices: AutoPayService[];
  };
  cardOnFileSettings: {
    enabled: boolean;
    requireCvv: boolean;
    allowMultipleCards: boolean;
    defaultCardBehavior:
      | "use_default"
      | "prompt_selection"
      | "require_selection";
  };
  processingSettings: {
    allowPartialPayments: boolean;
    allowSplitPayments: boolean;
    requireTip: boolean;
    tipOptions: number[];
    captureMethod: "automatic" | "manual";
    refundPolicy: "full_refund" | "partial_refund" | "store_credit_only";
    splitPaymentRefundPolicy: "proportional" | "last_payment_first";
  };
  refundMethods: {
    originalPayment: boolean;
    cash: boolean;
    storeCredit: boolean;
    giftCard: boolean;
    custom: boolean;
  };
  refundRules: {
    managerApprovalRequired: boolean;
    managerApprovalThreshold?: number;
    requireReason: boolean;
    requireNotes: boolean;
    allowOverride: boolean;
  };
  storeCreditSettings: {
    enabled: boolean;
    expiryEnabled: boolean;
    defaultExpiryDays?: number;
    allowTransfer: boolean;
    minAmount?: number;
    maxAmount?: number;
  };
  giftCardSettings: {
    enabled: boolean;
    expiryEnabled: boolean;
    defaultExpiryDays?: number;
    allowReload: boolean;
    minAmount?: number;
    maxAmount?: number;
    requireActivation: boolean;
  };
  integrationSettings: {
    posEnabled: boolean;
    onlineEnabled: boolean;
    invoiceEnabled: boolean;
    membershipEnabled: boolean;
    recurringGroomingEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CloverTerminalTransaction {
  id: string;
  facilityId: number;
  terminalId: string;
  terminalName: string;
  cloverTransactionId: string;
  amount: number;
  currency: "USD" | "CAD";
  tipAmount?: number;
  totalAmount: number;
  paymentMethod: "tap" | "chip" | "swipe";
  cardBrand?: string;
  cardLast4?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  invoiceId?: string;
  customerId?: number;
  bookingId?: number;
  receiptPrinted: boolean;
  receiptPrintedAt?: string;
  receiptData?: string;
  processedAt: string;
  createdAt: string;
  errorMessage?: string;
}

export interface FiservPaymentRequest {
  facilityId: number;
  clientId: number;
  amount: number;
  currency: "USD" | "CAD";
  paymentSource:
    | "new_card"
    | "tokenized_card"
    | "cash"
    | "gift_card"
    | "store_credit"
    | "split"
    | "clover_terminal";
  cloverTerminalId?: string;
  cloverPaymentMethod?: "tap" | "chip" | "swipe";
  tokenizedCardId?: string;
  newCard?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvv: string;
    cardholderName: string;
    billingAddress?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    saveToAccount?: boolean;
    setAsDefault?: boolean;
  };
  splitPayments?: Array<{
    method: "card" | "cash" | "gift_card" | "store_credit";
    amount: number;
    tokenizedCardId?: string;
    newCard?: FiservPaymentRequest["newCard"];
  }>;
  tipAmount?: number;
  description: string;
  context:
    | "pos"
    | "online"
    | "invoice"
    | "membership"
    | "recurring_grooming"
    | "booking";
  bookingId?: number;
  invoiceId?: string;
  membershipId?: string;
  metadata?: Record<string, unknown>;
}

export interface FiservPaymentResponse {
  success: boolean;
  transactionId: string;
  fiservTransactionId: string;
  amount: number;
  currency: "USD" | "CAD";
  status: "completed" | "pending" | "failed" | "declined";
  cardBrand?: string;
  cardLast4?: string;
  tokenizedCardId?: string;
  fiservToken?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  receiptUrl?: string;
  processedAt: string;
}

export interface FiservRefundRequest {
  facilityId: number;
  originalTransactionId: string;
  fiservTransactionId: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface FiservRefundResponse {
  success: boolean;
  refundId: string;
  fiservRefundId: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  error?: {
    code: string;
    message: string;
  };
  processedAt: string;
}

// ============================================================================
// Payment Audit
// ============================================================================

export const auditActionTypeEnum = z.enum([
  "payment_capture",
  "refund",
  "void",
  "method_override",
  "manual_card_entry",
  "card_saved",
  "card_deleted",
]);
export type AuditActionType = z.infer<typeof auditActionTypeEnum>;

export const paymentAuditLogSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  action: auditActionTypeEnum,
  transactionId: z.string().optional(),
  transactionNumber: z.string().optional(),
  amount: z.number().optional(),
  paymentMethod: z.string().optional(),
  originalPaymentMethod: z.string().optional(),
  overrideMethod: z.string().optional(),
  processorTransactionId: z.string().optional(),
  staffId: z.string(),
  staffName: z.string(),
  staffRole: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});
export type PaymentAuditLog = z.infer<typeof paymentAuditLogSchema>;

// ============================================================================
// Payment Method Info (from payment-method-utils)
// ============================================================================

export interface PaymentMethodInfo {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  transactionId?: string;
  processor?: string;
}
