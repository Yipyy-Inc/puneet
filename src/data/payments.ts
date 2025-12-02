// Payment and billing data structures
export interface PaymentMethod {
  id: string;
  clientId: number;
  type: "card" | "bank_account";
  isDefault: boolean;
  // Card details
  cardBrand?: "visa" | "mastercard" | "amex" | "discover";
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardholderName?: string;
  // Bank account details
  bankName?: string;
  accountLast4?: string;
  // Metadata
  createdAt: string;
  stripePaymentMethodId?: string;
}

export interface Payment extends Record<string, unknown> {
  id: string;
  facilityId: number;
  clientId: number;
  bookingId?: number;
  invoiceId?: string;
  amount: number;
  tipAmount?: number;
  totalAmount: number;
  currency: "USD" | "CAD";
  paymentMethod: "card" | "cash" | "gift_card" | "credit" | "bank_transfer";
  status:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "partially_refunded";
  // Card payment details
  cardBrand?: string;
  cardLast4?: string;
  stripeChargeId?: string;
  stripePaymentIntentId?: string;
  // Gift card / credit details
  giftCardId?: string;
  creditUsed?: number;
  // Refund details
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  // Metadata
  description: string;
  receiptUrl?: string;
  createdAt: string;
  processedBy: string;
  processedById: number;
  notes?: string;
}

export interface Invoice extends Record<string, unknown> {
  id: string;
  invoiceNumber: string;
  facilityId: number;
  clientId: number;
  bookingId?: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  issuedDate: string;
  paidDate?: string;
  // Line items
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  discountType?: "percentage" | "fixed";
  discountReason?: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  // Payment info
  paymentIds?: string[];
  // Recurring
  isRecurring: boolean;
  recurringFrequency?: "weekly" | "monthly" | "quarterly" | "yearly";
  nextInvoiceDate?: string;
  // Metadata
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdById: number;
  sentAt?: string;
  reminderSentAt?: string;
  reminderCount: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxable: boolean;
}

export interface GiftCard {
  id: string;
  facilityId: number;
  code: string;
  type: "online" | "physical";
  initialAmount: number;
  currentBalance: number;
  currency: "USD" | "CAD";
  status: "active" | "redeemed" | "expired" | "cancelled";
  // Purchaser info
  purchasedBy?: string;
  purchasedByClientId?: number;
  purchaseDate: string;
  // Recipient info
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  // Expiry
  expiryDate?: string;
  neverExpires: boolean;
  // Metadata
  createdAt: string;
  lastUsedAt?: string;
  transactionHistory: GiftCardTransaction[];
}

export interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  type: "purchase" | "redemption" | "refund";
  amount: number;
  balanceAfter: number;
  paymentId?: string;
  timestamp: string;
  notes?: string;
}

export interface CustomerCredit {
  id: string;
  facilityId: number;
  clientId: number;
  amount: number;
  remainingAmount: number;
  currency: "USD" | "CAD";
  reason: "refund" | "promotion" | "compensation" | "prepaid" | "other";
  status: "active" | "fully_used" | "expired" | "cancelled";
  // Expiry
  expiryDate?: string;
  neverExpires: boolean;
  // Metadata
  description: string;
  createdAt: string;
  createdBy: string;
  createdById: number;
  lastUsedAt?: string;
  notes?: string;
}

// Sample data
export const paymentMethods: PaymentMethod[] = [
  {
    id: "pm-001",
    clientId: 15,
    type: "card",
    isDefault: true,
    cardBrand: "visa",
    cardLast4: "4242",
    cardExpMonth: 12,
    cardExpYear: 2025,
    cardholderName: "Alice Johnson",
    createdAt: "2024-01-15T10:00:00Z",
    stripePaymentMethodId: "pm_1234567890",
  },
  {
    id: "pm-002",
    clientId: 15,
    type: "card",
    isDefault: false,
    cardBrand: "mastercard",
    cardLast4: "5555",
    cardExpMonth: 8,
    cardExpYear: 2026,
    cardholderName: "Alice Johnson",
    createdAt: "2024-02-20T14:00:00Z",
    stripePaymentMethodId: "pm_0987654321",
  },
  {
    id: "pm-003",
    clientId: 16,
    type: "card",
    isDefault: true,
    cardBrand: "amex",
    cardLast4: "1001",
    cardExpMonth: 10,
    cardExpYear: 2025,
    cardholderName: "Bob Smith",
    createdAt: "2024-01-10T09:00:00Z",
    stripePaymentMethodId: "pm_1122334455",
  },
  {
    id: "pm-004",
    clientId: 29,
    type: "card",
    isDefault: true,
    cardBrand: "visa",
    cardLast4: "8888",
    cardExpMonth: 6,
    cardExpYear: 2027,
    cardholderName: "Jane Smith",
    createdAt: "2024-01-05T11:00:00Z",
    stripePaymentMethodId: "pm_5544332211",
  },
];

export const payments: Payment[] = [
  {
    id: "pay-001",
    facilityId: 11,
    clientId: 15,
    bookingId: 1,
    invoiceId: "inv-001",
    amount: 50,
    tipAmount: 5,
    totalAmount: 55,
    currency: "USD",
    paymentMethod: "card",
    status: "completed",
    cardBrand: "visa",
    cardLast4: "4242",
    stripeChargeId: "ch_1234567890",
    stripePaymentIntentId: "pi_1234567890",
    description: "Daycare - Buddy",
    receiptUrl: "/receipts/pay-001.pdf",
    createdAt: "2024-01-15T17:00:00Z",
    processedBy: "Sarah Johnson",
    processedById: 1,
  },
  {
    id: "pay-002",
    facilityId: 11,
    clientId: 16,
    bookingId: 2,
    invoiceId: "inv-002",
    amount: 150,
    totalAmount: 150,
    currency: "USD",
    paymentMethod: "card",
    status: "completed",
    cardBrand: "amex",
    cardLast4: "1001",
    stripeChargeId: "ch_0987654321",
    description: "Boarding - Max (3 nights)",
    receiptUrl: "/receipts/pay-002.pdf",
    createdAt: "2024-01-22T11:00:00Z",
    processedBy: "Mike Davis",
    processedById: 2,
  },
  {
    id: "pay-003",
    facilityId: 11,
    clientId: 15,
    bookingId: 3,
    amount: 75,
    tipAmount: 10,
    totalAmount: 85,
    currency: "USD",
    paymentMethod: "cash",
    status: "completed",
    description: "Grooming - Whiskers",
    createdAt: "2024-01-25T12:30:00Z",
    processedBy: "Sarah Johnson",
    processedById: 1,
  },
  {
    id: "pay-004",
    facilityId: 11,
    clientId: 29,
    bookingId: 4,
    amount: 50,
    totalAmount: 50,
    currency: "USD",
    paymentMethod: "gift_card",
    status: "completed",
    giftCardId: "gc-001",
    description: "Daycare - Fluffy",
    createdAt: "2024-02-01T18:00:00Z",
    processedBy: "Mike Davis",
    processedById: 2,
  },
  {
    id: "pay-005",
    facilityId: 11,
    clientId: 28,
    bookingId: 5,
    invoiceId: "inv-005",
    amount: 150,
    totalAmount: 150,
    currency: "USD",
    paymentMethod: "card",
    status: "completed",
    cardBrand: "visa",
    cardLast4: "4242",
    description: "Boarding - Rex (2 nights)",
    receiptUrl: "/receipts/pay-005.pdf",
    createdAt: "2024-02-07T10:00:00Z",
    processedBy: "Sarah Johnson",
    processedById: 1,
  },
  {
    id: "pay-006",
    facilityId: 11,
    clientId: 15,
    bookingId: 6,
    amount: 50,
    totalAmount: 50,
    currency: "USD",
    paymentMethod: "card",
    status: "refunded",
    cardBrand: "visa",
    cardLast4: "4242",
    refundAmount: 50,
    refundReason: "Client cancelled due to pet illness",
    refundedAt: "2024-02-10T14:00:00Z",
    description: "Daycare - Buddy (Cancelled)",
    createdAt: "2024-02-08T08:00:00Z",
    processedBy: "Sarah Johnson",
    processedById: 1,
  },
  {
    id: "pay-007",
    facilityId: 11,
    clientId: 16,
    bookingId: 7,
    amount: 70,
    creditUsed: 10,
    totalAmount: 70,
    currency: "USD",
    paymentMethod: "card",
    status: "completed",
    cardBrand: "amex",
    cardLast4: "1001",
    description: "Grooming - Max",
    receiptUrl: "/receipts/pay-007.pdf",
    createdAt: "2024-02-15T11:00:00Z",
    processedBy: "Mike Davis",
    processedById: 2,
    notes: "Used $10 credit from previous refund",
  },
];

export const invoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2024-001",
    facilityId: 11,
    clientId: 15,
    bookingId: 1,
    status: "paid",
    dueDate: "2024-01-15",
    issuedDate: "2024-01-15",
    paidDate: "2024-01-15",
    items: [
      {
        id: "item-001",
        description: "Daycare - Full Day (Buddy)",
        quantity: 1,
        unitPrice: 50,
        total: 50,
        taxable: true,
      },
    ],
    subtotal: 50,
    tax: 0,
    taxRate: 0,
    discount: 0,
    total: 50,
    amountPaid: 50,
    amountDue: 0,
    paymentIds: ["pay-001"],
    isRecurring: false,
    createdAt: "2024-01-15T08:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    sentAt: "2024-01-15T08:05:00Z",
    reminderCount: 0,
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2024-002",
    facilityId: 11,
    clientId: 16,
    bookingId: 2,
    status: "paid",
    dueDate: "2024-01-20",
    issuedDate: "2024-01-20",
    paidDate: "2024-01-22",
    items: [
      {
        id: "item-002",
        description: "Boarding - Nightly Rate (Max)",
        quantity: 3,
        unitPrice: 50,
        total: 150,
        taxable: true,
      },
    ],
    subtotal: 150,
    tax: 0,
    taxRate: 0,
    discount: 0,
    total: 150,
    amountPaid: 150,
    amountDue: 0,
    paymentIds: ["pay-002"],
    isRecurring: false,
    createdAt: "2024-01-20T14:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    sentAt: "2024-01-20T14:05:00Z",
    reminderCount: 0,
  },
  {
    id: "inv-003",
    invoiceNumber: "INV-2024-003",
    facilityId: 11,
    clientId: 28,
    status: "overdue",
    dueDate: "2024-03-01",
    issuedDate: "2024-02-15",
    items: [
      {
        id: "item-003",
        description: "Monthly Daycare Membership - Rex",
        quantity: 1,
        unitPrice: 300,
        total: 300,
        taxable: true,
      },
    ],
    subtotal: 300,
    tax: 24,
    taxRate: 8,
    discount: 0,
    total: 324,
    amountPaid: 0,
    amountDue: 324,
    isRecurring: true,
    recurringFrequency: "monthly",
    nextInvoiceDate: "2024-04-15",
    createdAt: "2024-02-15T09:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    sentAt: "2024-02-15T09:05:00Z",
    reminderSentAt: "2024-03-08T10:00:00Z",
    reminderCount: 2,
    notes: "Customer has been reminded twice",
  },
  {
    id: "inv-004",
    invoiceNumber: "INV-2024-004",
    facilityId: 11,
    clientId: 29,
    status: "sent",
    dueDate: "2024-03-20",
    issuedDate: "2024-03-10",
    items: [
      {
        id: "item-004",
        description: "Grooming Package - Fluffy",
        quantity: 1,
        unitPrice: 85,
        total: 85,
        taxable: true,
      },
      {
        id: "item-005",
        description: "Nail Trim Add-on",
        quantity: 1,
        unitPrice: 15,
        total: 15,
        taxable: true,
      },
    ],
    subtotal: 100,
    tax: 8,
    taxRate: 8,
    discount: 10,
    discountType: "percentage",
    discountReason: "Loyal customer discount",
    total: 98,
    amountPaid: 0,
    amountDue: 98,
    isRecurring: false,
    createdAt: "2024-03-10T12:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    sentAt: "2024-03-10T12:05:00Z",
    reminderCount: 0,
  },
  {
    id: "inv-005",
    invoiceNumber: "INV-2024-005",
    facilityId: 11,
    clientId: 15,
    status: "paid",
    dueDate: "2024-03-15",
    issuedDate: "2024-03-10",
    paidDate: "2024-03-10",
    items: [
      {
        id: "item-006",
        description: "Weekly Daycare Package - Buddy",
        quantity: 1,
        unitPrice: 200,
        total: 200,
        taxable: true,
      },
    ],
    subtotal: 200,
    tax: 16,
    taxRate: 8,
    discount: 20,
    discountType: "fixed",
    discountReason: "New package promotion",
    total: 196,
    amountPaid: 196,
    amountDue: 0,
    paymentIds: ["pay-005"],
    isRecurring: true,
    recurringFrequency: "weekly",
    nextInvoiceDate: "2024-03-17",
    createdAt: "2024-03-10T10:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    sentAt: "2024-03-10T10:05:00Z",
    reminderCount: 0,
  },
];

export const giftCards: GiftCard[] = [
  {
    id: "gc-001",
    facilityId: 11,
    code: "GIFT-PAWS-2024-001",
    type: "online",
    initialAmount: 100,
    currentBalance: 50,
    currency: "USD",
    status: "active",
    purchasedBy: "Alice Johnson",
    purchasedByClientId: 15,
    purchaseDate: "2024-01-10",
    recipientName: "Jane Smith",
    recipientEmail: "jane@example.com",
    message: "Happy Birthday! Enjoy some pampering for Fluffy!",
    neverExpires: false,
    expiryDate: "2025-01-10",
    createdAt: "2024-01-10T14:00:00Z",
    lastUsedAt: "2024-02-01T18:00:00Z",
    transactionHistory: [
      {
        id: "gct-001",
        giftCardId: "gc-001",
        type: "purchase",
        amount: 100,
        balanceAfter: 100,
        timestamp: "2024-01-10T14:00:00Z",
      },
      {
        id: "gct-002",
        giftCardId: "gc-001",
        type: "redemption",
        amount: 50,
        balanceAfter: 50,
        paymentId: "pay-004",
        timestamp: "2024-02-01T18:00:00Z",
        notes: "Used for daycare service",
      },
    ],
  },
  {
    id: "gc-002",
    facilityId: 11,
    code: "GIFT-PAWS-2024-002",
    type: "physical",
    initialAmount: 150,
    currentBalance: 150,
    currency: "USD",
    status: "active",
    purchasedBy: "Bob Smith",
    purchasedByClientId: 16,
    purchaseDate: "2024-02-14",
    recipientName: "Charlie Brown",
    message: "Valentine's Day gift for you and Max!",
    neverExpires: true,
    createdAt: "2024-02-14T10:00:00Z",
    transactionHistory: [
      {
        id: "gct-003",
        giftCardId: "gc-002",
        type: "purchase",
        amount: 150,
        balanceAfter: 150,
        timestamp: "2024-02-14T10:00:00Z",
      },
    ],
  },
  {
    id: "gc-003",
    facilityId: 11,
    code: "GIFT-PAWS-2024-003",
    type: "online",
    initialAmount: 200,
    currentBalance: 0,
    currency: "USD",
    status: "redeemed",
    purchaseDate: "2024-01-05",
    neverExpires: false,
    expiryDate: "2025-01-05",
    createdAt: "2024-01-05T09:00:00Z",
    lastUsedAt: "2024-03-01T15:00:00Z",
    transactionHistory: [
      {
        id: "gct-004",
        giftCardId: "gc-003",
        type: "purchase",
        amount: 200,
        balanceAfter: 200,
        timestamp: "2024-01-05T09:00:00Z",
      },
      {
        id: "gct-005",
        giftCardId: "gc-003",
        type: "redemption",
        amount: 100,
        balanceAfter: 100,
        timestamp: "2024-02-10T14:00:00Z",
      },
      {
        id: "gct-006",
        giftCardId: "gc-003",
        type: "redemption",
        amount: 100,
        balanceAfter: 0,
        timestamp: "2024-03-01T15:00:00Z",
      },
    ],
  },
];

export const customerCredits: CustomerCredit[] = [
  {
    id: "credit-001",
    facilityId: 11,
    clientId: 15,
    amount: 50,
    remainingAmount: 40,
    currency: "USD",
    reason: "refund",
    status: "active",
    description: "Refund from cancelled daycare booking",
    neverExpires: false,
    expiryDate: "2024-12-31",
    createdAt: "2024-02-10T14:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    lastUsedAt: "2024-02-15T11:00:00Z",
    notes: "Customer requested store credit instead of card refund",
  },
  {
    id: "credit-002",
    facilityId: 11,
    clientId: 16,
    amount: 25,
    remainingAmount: 25,
    currency: "USD",
    reason: "promotion",
    status: "active",
    description: "Welcome bonus for new customer",
    neverExpires: true,
    createdAt: "2024-01-10T09:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "credit-003",
    facilityId: 11,
    clientId: 29,
    amount: 100,
    remainingAmount: 75,
    currency: "USD",
    reason: "prepaid",
    status: "active",
    description: "Prepaid credit for future services",
    neverExpires: true,
    createdAt: "2024-01-05T11:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    lastUsedAt: "2024-02-15T16:00:00Z",
  },
  {
    id: "credit-004",
    facilityId: 11,
    clientId: 28,
    amount: 20,
    remainingAmount: 0,
    currency: "USD",
    reason: "compensation",
    status: "fully_used",
    description: "Apology credit for service delay",
    neverExpires: false,
    expiryDate: "2024-06-30",
    createdAt: "2024-02-01T10:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    lastUsedAt: "2024-02-20T14:30:00Z",
    notes: "Customer was very understanding",
  },
];
