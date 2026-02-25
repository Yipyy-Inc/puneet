/**
 * Fiserv Payment Integration
 * 
 * Handles all payment processing through Fiserv with:
 * - Tokenized card storage (card on file)
 * - Online payments
 * - Auto-pay for recurring services
 * - POS checkout integration
 * - Booking invoice payments
 * - Membership/package payments
 */

export interface CloverTerminalConfig {
  facilityId: number;
  // Terminal identification
  terminalId: string;
  terminalName: string;
  terminalSerialNumber: string;
  // Connection settings
  connectionType: "wifi" | "ethernet" | "bluetooth";
  ipAddress?: string;
  macAddress?: string;
  // Status
  isActive: boolean;
  isOnline: boolean;
  lastSeen?: string;
  // Printing settings
  autoPrintReceipts: boolean;
  printCustomerCopy: boolean;
  printMerchantCopy: boolean;
  // Payment methods supported
  supportsTap: boolean;
  supportsChip: boolean;
  supportsSwipe: boolean;
  // Metadata
  location?: string; // Physical location of terminal
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface YipyyPayConfig {
  facilityId: number;
  // Yipyy Pay / Tap to Pay settings
  enabled: boolean;
  merchantId?: string;
  apiKey?: string;
  // Device configuration
  authorizedDevices: YipyyPayDevice[];
  // Payment settings
  requireReceipt: boolean;
  autoSendReceipt: boolean;
  // Limits
  maxTransactionAmount?: number;
  minTransactionAmount?: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface YipyyPayDevice {
  id: string;
  facilityId: number;
  deviceName: string;
  deviceId: string; // iPhone device identifier
  deviceType: "iphone";
  isActive: boolean;
  isAuthorized: boolean;
  authorizedBy?: string;
  authorizedAt?: string;
  lastUsedAt?: string;
  // Metadata
  createdAt: string;
}

export interface YipyyPayTransaction {
  id: string;
  facilityId: number;
  // Device info
  deviceId: string;
  deviceName: string;
  // Transaction details
  yipyyTransactionId: string;
  amount: number;
  currency: "USD" | "CAD";
  tipAmount?: number;
  totalAmount: number;
  // Payment method used (always "tap" for Tap to Pay)
  paymentMethod: "tap";
  cardBrand?: string;
  cardLast4?: string;
  // Status
  status: "pending" | "completed" | "failed" | "cancelled";
  // Linking
  invoiceId?: string;
  customerId?: number;
  bookingId?: number;
  // Receipt
  receiptSent: boolean;
  receiptSentAt?: string;
  receiptData?: string;
  // Metadata
  processedAt: string;
  createdAt: string;
  processedBy?: string;
  processedById?: number;
  errorMessage?: string;
}

export interface InPersonPaymentMethods {
  // Payment method toggles
  cloverTerminal: boolean;
  payWithiPhone: boolean;
  manualCardEntry: boolean;
  cash: boolean;
  storeCredit: boolean;
  giftCard: boolean;
  // iPhone-specific settings
  iphoneSettings?: {
    enabledLocations: string[]; // Location IDs where iPhone payments are enabled
    restrictedRoles?: string[]; // Roles allowed to use iPhone payments (empty = all roles)
    deviceRequirements: {
      minIOSVersion: string;
      supportedModels: string[];
    };
  };
  // Manual card entry settings
  manualCardEntrySettings?: {
    adminOnly: boolean;
    requireCvv: boolean;
    requireZipCode: boolean;
  };
}

export interface FiservPaymentConfig {
  facilityId: number;
  // Fiserv API credentials
  apiKey: string;
  merchantId: string;
  terminalId?: string;
  // In-Person Payment Methods configuration
  inPersonMethods?: InPersonPaymentMethods;
  // Clover Terminal configuration
  cloverTerminal?: {
    enabled: boolean;
    terminalId?: string;
    autoPrintReceipts: boolean;
    defaultPaymentMethod: "terminal" | "web" | "both";
  };
  // Yipyy Pay / Tap to Pay configuration
  yipyyPay?: {
    enabled: boolean;
    requireReceipt: boolean;
    autoSendReceipt: boolean;
  };
  // Environment
  environment: "sandbox" | "production";
  // Payment method configuration
  enabledPaymentMethods: {
    card: boolean;
    cardOnFile: boolean;
    autoPay: boolean;
    cash: boolean;
    giftCard: boolean;
    storeCredit: boolean;
    bankTransfer: boolean;
  };
  // Auto-pay settings
  autoPaySettings: {
    enabled: boolean;
    requireConsent: boolean;
    defaultToAutoPay: boolean;
    allowedServices: ("grooming" | "membership" | "package" | "boarding" | "daycare" | "training")[];
  };
  // Card on file settings
  cardOnFileSettings: {
    enabled: boolean;
    requireCvv: boolean;
    allowMultipleCards: boolean;
    defaultCardBehavior: "use_default" | "prompt_selection" | "require_selection";
  };
  // Payment processing settings
  processingSettings: {
    allowPartialPayments: boolean;
    allowSplitPayments: boolean;
    requireTip: boolean;
    tipOptions: number[]; // Tip percentages
    captureMethod: "automatic" | "manual";
    refundPolicy: "full_refund" | "partial_refund" | "store_credit_only";
  };
  // Integration settings
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

export interface TokenizedCard {
  id: string;
  facilityId: number;
  clientId: number;
  // Fiserv token
  fiservToken: string; // Tokenized card reference from Fiserv
  // Card display info
  cardBrand: "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unknown";
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardholderName: string;
  // Card status
  isDefault: boolean;
  isActive: boolean;
  isExpired: boolean;
  // Auto-pay settings
  autoPayEnabled: boolean;
  autoPayServices: ("grooming" | "membership" | "package" | "boarding" | "daycare" | "training")[];
  // Billing address (optional, for AVS)
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  // Metadata
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string; // If card expires
}

export interface CloverTerminalTransaction {
  id: string;
  facilityId: number;
  // Terminal info
  terminalId: string;
  terminalName: string;
  // Transaction details
  cloverTransactionId: string;
  amount: number;
  currency: "USD" | "CAD";
  tipAmount?: number;
  totalAmount: number;
  // Payment method used
  paymentMethod: "tap" | "chip" | "swipe";
  cardBrand?: string;
  cardLast4?: string;
  // Status
  status: "pending" | "completed" | "failed" | "cancelled";
  // Linking
  invoiceId?: string;
  customerId?: number;
  bookingId?: number;
  // Receipt
  receiptPrinted: boolean;
  receiptPrintedAt?: string;
  receiptData?: string; // Receipt content
  // Metadata
  processedAt: string;
  createdAt: string;
  errorMessage?: string;
}

export interface FiservPaymentRequest {
  facilityId: number;
  clientId: number;
  amount: number;
  currency: "USD" | "CAD";
  // Payment source
  paymentSource: "new_card" | "tokenized_card" | "cash" | "gift_card" | "store_credit" | "split" | "clover_terminal";
  // Clover terminal payment
  cloverTerminalId?: string;
  cloverPaymentMethod?: "tap" | "chip" | "swipe";
  tokenizedCardId?: string; // If using card on file
  // New card details (if paymentSource is "new_card")
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
    saveToAccount?: boolean; // Save as card on file
    setAsDefault?: boolean;
  };
  // Split payment details
  splitPayments?: Array<{
    method: "card" | "cash" | "gift_card" | "store_credit";
    amount: number;
    tokenizedCardId?: string;
    newCard?: FiservPaymentRequest["newCard"];
  }>;
  // Additional details
  tipAmount?: number;
  description: string;
  // Context
  context: "pos" | "online" | "invoice" | "membership" | "recurring_grooming" | "booking";
  bookingId?: number;
  invoiceId?: string;
  membershipId?: string;
  // Metadata
  metadata?: Record<string, unknown>;
}

export interface FiservPaymentResponse {
  success: boolean;
  transactionId: string;
  fiservTransactionId: string; // Fiserv's transaction reference
  amount: number;
  currency: "USD" | "CAD";
  status: "completed" | "pending" | "failed" | "declined";
  // Card details (if applicable)
  cardBrand?: string;
  cardLast4?: string;
  // Tokenized card (if saved)
  tokenizedCardId?: string;
  fiservToken?: string;
  // Error details (if failed)
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  // Receipt
  receiptUrl?: string;
  // Timestamps
  processedAt: string;
}

export interface FiservRefundRequest {
  facilityId: number;
  originalTransactionId: string;
  fiservTransactionId: string;
  amount: number; // Partial refund amount, or full if not specified
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

// Mock data for development
export const mockFiservConfigs: FiservPaymentConfig[] = [
  {
    facilityId: 11,
    apiKey: "fiserv_api_key_12345",
    merchantId: "merchant_001",
    terminalId: "terminal_001",
    environment: "sandbox",
    enabledPaymentMethods: {
      card: true,
      cardOnFile: true,
      autoPay: true,
      cash: true,
      giftCard: true,
      storeCredit: true,
      bankTransfer: false,
    },
    autoPaySettings: {
      enabled: true,
      requireConsent: true,
      defaultToAutoPay: false,
      allowedServices: ["grooming", "membership", "package"],
    },
    cardOnFileSettings: {
      enabled: true,
      requireCvv: false,
      allowMultipleCards: true,
      defaultCardBehavior: "use_default",
    },
    processingSettings: {
      allowPartialPayments: true,
      allowSplitPayments: true,
      requireTip: false,
      tipOptions: [15, 18, 20, 25],
      captureMethod: "automatic",
      refundPolicy: "full_refund",
    },
    integrationSettings: {
      posEnabled: true,
      onlineEnabled: true,
      invoiceEnabled: true,
      membershipEnabled: true,
      recurringGroomingEnabled: true,
    },
    cloverTerminal: {
      enabled: true,
      terminalId: "clover_terminal_001",
      autoPrintReceipts: true,
      defaultPaymentMethod: "terminal",
    },
    yipyyPay: {
      enabled: true,
      requireReceipt: true,
      autoSendReceipt: true,
    },
    inPersonMethods: {
      cloverTerminal: true,
      payWithiPhone: true,
      manualCardEntry: false,
      cash: true,
      storeCredit: true,
      giftCard: true,
      iphoneSettings: {
        enabledLocations: ["loc-001", "loc-002"],
        restrictedRoles: [],
        deviceRequirements: {
          minIOSVersion: "16.0",
          supportedModels: [
            "iPhone XS",
            "iPhone XS Max",
            "iPhone XR",
            "iPhone 11",
            "iPhone 11 Pro",
            "iPhone 11 Pro Max",
            "iPhone 12",
            "iPhone 12 mini",
            "iPhone 12 Pro",
            "iPhone 12 Pro Max",
            "iPhone 13",
            "iPhone 13 mini",
            "iPhone 13 Pro",
            "iPhone 13 Pro Max",
            "iPhone 14",
            "iPhone 14 Plus",
            "iPhone 14 Pro",
            "iPhone 14 Pro Max",
            "iPhone 15",
            "iPhone 15 Plus",
            "iPhone 15 Pro",
            "iPhone 15 Pro Max",
            "iPhone 16",
            "iPhone 16 Plus",
            "iPhone 16 Pro",
            "iPhone 16 Pro Max",
          ],
        },
      },
      manualCardEntrySettings: {
        adminOnly: true,
        requireCvv: true,
        requireZipCode: true,
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const mockCloverTerminals: CloverTerminalConfig[] = [
  {
    facilityId: 11,
    terminalId: "clover_terminal_001",
    terminalName: "Front Counter Terminal",
    terminalSerialNumber: "CLV-2024-001",
    connectionType: "wifi",
    ipAddress: "192.168.1.100",
    macAddress: "00:1B:44:11:3A:B7",
    isActive: true,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    autoPrintReceipts: true,
    printCustomerCopy: true,
    printMerchantCopy: true,
    supportsTap: true,
    supportsChip: true,
    supportsSwipe: true,
    location: "Front Counter - Main POS",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    facilityId: 11,
    terminalId: "clover_terminal_002",
    terminalName: "Grooming Station Terminal",
    terminalSerialNumber: "CLV-2024-002",
    connectionType: "ethernet",
    ipAddress: "192.168.1.101",
    isActive: true,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    autoPrintReceipts: true,
    printCustomerCopy: true,
    printMerchantCopy: false,
    supportsTap: true,
    supportsChip: true,
    supportsSwipe: true,
    location: "Grooming Station",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
];

export const mockCloverTransactions: CloverTerminalTransaction[] = [];

// Yipyy Pay / Tap to Pay mock data
export const mockYipyyPayConfigs: YipyyPayConfig[] = [
  {
    facilityId: 11,
    enabled: true,
    merchantId: "yipyy_merchant_001",
    apiKey: "yipyy_api_key_12345",
    authorizedDevices: [],
    requireReceipt: true,
    autoSendReceipt: true,
    maxTransactionAmount: 10000,
    minTransactionAmount: 0.01,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const mockYipyyPayDevices: YipyyPayDevice[] = [
  {
    id: "device_001",
    facilityId: 11,
    deviceName: "Manager iPhone",
    deviceId: "iphone_device_001",
    deviceType: "iphone",
    isActive: true,
    isAuthorized: true,
    authorizedBy: "Admin",
    authorizedAt: "2024-01-01T00:00:00Z",
    lastUsedAt: new Date().toISOString(),
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "device_002",
    facilityId: 11,
    deviceName: "Front Desk iPhone",
    deviceId: "iphone_device_002",
    deviceType: "iphone",
    isActive: true,
    isAuthorized: true,
    authorizedBy: "Admin",
    authorizedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export const mockYipyyPayTransactions: YipyyPayTransaction[] = [];

export const mockTokenizedCards: TokenizedCard[] = [
  {
    id: "token-card-001",
    facilityId: 11,
    clientId: 15,
    fiservToken: "fiserv_token_abc123",
    cardBrand: "visa",
    cardLast4: "4242",
    cardExpMonth: 12,
    cardExpYear: 2025,
    cardholderName: "Alice Johnson",
    isDefault: true,
    isActive: true,
    isExpired: false,
    autoPayEnabled: true,
    autoPayServices: ["grooming", "membership"],
    billingAddress: {
      street: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zip: "94102",
      country: "US",
    },
    createdAt: "2024-01-15T10:00:00Z",
    lastUsedAt: "2024-02-15T14:30:00Z",
  },
  {
    id: "token-card-002",
    facilityId: 11,
    clientId: 15,
    fiservToken: "fiserv_token_def456",
    cardBrand: "mastercard",
    cardLast4: "5555",
    cardExpMonth: 8,
    cardExpYear: 2026,
    cardholderName: "Alice Johnson",
    isDefault: false,
    isActive: true,
    isExpired: false,
    autoPayEnabled: false,
    autoPayServices: [],
    createdAt: "2024-02-20T14:00:00Z",
  },
  {
    id: "token-card-003",
    facilityId: 11,
    clientId: 16,
    fiservToken: "fiserv_token_ghi789",
    cardBrand: "amex",
    cardLast4: "1001",
    cardExpMonth: 10,
    cardExpYear: 2025,
    cardholderName: "Bob Smith",
    isDefault: true,
    isActive: true,
    isExpired: false,
    autoPayEnabled: true,
    autoPayServices: ["grooming"],
    createdAt: "2024-01-10T09:00:00Z",
    lastUsedAt: "2024-02-20T11:00:00Z",
  },
];

// Helper functions
export function getFiservConfig(facilityId: number): FiservPaymentConfig | undefined {
  return mockFiservConfigs.find((config) => config.facilityId === facilityId);
}

export function getTokenizedCardsByClient(
  facilityId: number,
  clientId: number
): TokenizedCard[] {
  return mockTokenizedCards.filter(
    (card) => card.facilityId === facilityId && card.clientId === clientId && card.isActive && !card.isExpired
  );
}

export function getDefaultTokenizedCard(
  facilityId: number,
  clientId: number
): TokenizedCard | undefined {
  const cards = getTokenizedCardsByClient(facilityId, clientId);
  return cards.find((card) => card.isDefault) || cards[0];
}

export function addTokenizedCard(card: Omit<TokenizedCard, "id" | "createdAt">): TokenizedCard {
  const newCard: TokenizedCard = {
    ...card,
    id: `token-card-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  mockTokenizedCards.push(newCard);
  return newCard;
}

export function updateTokenizedCard(
  cardId: string,
  updates: Partial<TokenizedCard>
): TokenizedCard | undefined {
  const index = mockTokenizedCards.findIndex((card) => card.id === cardId);
  if (index === -1) return undefined;
  
  mockTokenizedCards[index] = {
    ...mockTokenizedCards[index],
    ...updates,
  };
  return mockTokenizedCards[index];
}

export function deleteTokenizedCard(cardId: string): boolean {
  const index = mockTokenizedCards.findIndex((card) => card.id === cardId);
  if (index === -1) return false;
  
  // Soft delete - mark as inactive
  mockTokenizedCards[index].isActive = false;
  return true;
}

// Clover Terminal helper functions
export function getCloverTerminal(
  facilityId: number,
  terminalId?: string
): CloverTerminalConfig | undefined {
  const terminals = mockCloverTerminals.filter(
    (t) => t.facilityId === facilityId && t.isActive
  );
  if (terminalId) {
    return terminals.find((t) => t.terminalId === terminalId);
  }
  return terminals[0]; // Return first active terminal
}

export function getCloverTerminalsByFacility(
  facilityId: number
): CloverTerminalConfig[] {
  return mockCloverTerminals.filter(
    (t) => t.facilityId === facilityId && t.isActive
  );
}

export function addCloverTerminal(
  terminal: Omit<CloverTerminalConfig, "id" | "createdAt" | "updatedAt">
): CloverTerminalConfig {
  const newTerminal: CloverTerminalConfig = {
    ...terminal,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockCloverTerminals.push(newTerminal);
  return newTerminal;
}

export function updateCloverTerminal(
  terminalId: string,
  updates: Partial<CloverTerminalConfig>
): CloverTerminalConfig | undefined {
  const index = mockCloverTerminals.findIndex((t) => t.terminalId === terminalId);
  if (index === -1) return undefined;
  
  mockCloverTerminals[index] = {
    ...mockCloverTerminals[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return mockCloverTerminals[index];
}

export function addCloverTransaction(
  transaction: Omit<CloverTerminalTransaction, "id" | "createdAt">
): CloverTerminalTransaction {
  const newTransaction: CloverTerminalTransaction = {
    ...transaction,
    id: `clover_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  mockCloverTransactions.push(newTransaction);
  return newTransaction;
}

export function getCloverTransactionsByInvoice(
  invoiceId: string
): CloverTerminalTransaction[] {
  return mockCloverTransactions.filter((t) => t.invoiceId === invoiceId);
}

export function getCloverTransactionsByCustomer(
  customerId: number
): CloverTerminalTransaction[] {
  return mockCloverTransactions.filter((t) => t.customerId === customerId);
}

export function getCloverTransactionsByBooking(
  bookingId: number
): CloverTerminalTransaction[] {
  return mockCloverTransactions.filter((t) => t.bookingId === bookingId);
}

// Yipyy Pay helper functions
export function getYipyyPayConfig(facilityId: number): YipyyPayConfig | undefined {
  return mockYipyyPayConfigs.find((config) => config.facilityId === facilityId);
}

export function getYipyyPayDevicesByFacility(
  facilityId: number
): YipyyPayDevice[] {
  return mockYipyyPayDevices.filter(
    (device) => device.facilityId === facilityId && device.isActive && device.isAuthorized
  );
}

export function getYipyyPayDevice(
  facilityId: number,
  deviceId: string
): YipyyPayDevice | undefined {
  return mockYipyyPayDevices.find(
    (device) => device.facilityId === facilityId && device.deviceId === deviceId && device.isActive && device.isAuthorized
  );
}

export function addYipyyPayDevice(
  device: Omit<YipyyPayDevice, "id" | "createdAt">
): YipyyPayDevice {
  const newDevice: YipyyPayDevice = {
    ...device,
    id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  mockYipyyPayDevices.push(newDevice);
  return newDevice;
}

export function addYipyyPayTransaction(
  transaction: Omit<YipyyPayTransaction, "id" | "createdAt">
): YipyyPayTransaction {
  const newTransaction: YipyyPayTransaction = {
    ...transaction,
    id: `yipyy_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  mockYipyyPayTransactions.push(newTransaction);
  return newTransaction;
}

export function getYipyyPayTransactionsByInvoice(
  invoiceId: string
): YipyyPayTransaction[] {
  return mockYipyyPayTransactions.filter((t) => t.invoiceId === invoiceId);
}

export function getYipyyPayTransactionsByCustomer(
  customerId: number
): YipyyPayTransaction[] {
  return mockYipyyPayTransactions.filter((t) => t.customerId === customerId);
}

export function getYipyyPayTransactionsByBooking(
  bookingId: number
): YipyyPayTransaction[] {
  return mockYipyyPayTransactions.filter((t) => t.bookingId === bookingId);
}
