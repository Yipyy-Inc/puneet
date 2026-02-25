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

export interface FiservPaymentConfig {
  facilityId: number;
  // Fiserv API credentials
  apiKey: string;
  merchantId: string;
  terminalId?: string;
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

export interface FiservPaymentRequest {
  facilityId: number;
  clientId: number;
  amount: number;
  currency: "USD" | "CAD";
  // Payment source
  paymentSource: "new_card" | "tokenized_card" | "cash" | "gift_card" | "store_credit" | "split";
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
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

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
