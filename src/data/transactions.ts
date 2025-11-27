// Payment and Transaction Data Models

export type PaymentStatus = "success" | "failed" | "pending" | "refunded";
export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "paypal"
  | "stripe"
  | "other";

export interface Transaction {
  id: string;
  facilityId: number;
  facilityName: string;
  transactionDate: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentProvider: string;
  status: PaymentStatus;
  customerId?: string;
  customerName?: string;
  description: string;
  processingFee: number;
  netAmount: number;
  refundAmount?: number;
  refundDate?: string;
  failureReason?: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  type: "stripe" | "paypal" | "square" | "braintree" | "custom";
  isActive: boolean;
  facilities: number[]; // facility IDs using this provider
  processingFeePercentage: number;
  fixedFee: number;
  currency: string;
  configuration: {
    apiKey?: string;
    publicKey?: string;
    webhookUrl?: string;
    supportedMethods: PaymentMethod[];
  };
  statistics: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalVolume: number;
    averageTransactionValue: number;
  };
}

export interface PaymentAnalytics {
  period: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  refundedTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  successRate: number;
  paymentMethodBreakdown: {
    method: PaymentMethod;
    count: number;
    volume: number;
  }[];
  providerBreakdown: {
    provider: string;
    count: number;
    volume: number;
    successRate: number;
  }[];
}

// Mock transaction data
export const transactions: Transaction[] = [
  {
    id: "txn-001",
    facilityId: 1,
    facilityName: "Paws & Play Daycare",
    transactionDate: "2025-11-25T14:30:00Z",
    amount: 85.0,
    currency: "USD",
    paymentMethod: "credit_card",
    paymentProvider: "Stripe",
    status: "success",
    customerId: "cust-123",
    customerName: "Alice Johnson",
    description: "Daycare service - 5 days",
    processingFee: 2.76,
    netAmount: 82.24,
  },
  {
    id: "txn-002",
    facilityId: 1,
    facilityName: "Paws & Play Daycare",
    transactionDate: "2025-11-25T10:15:00Z",
    amount: 120.0,
    currency: "USD",
    paymentMethod: "credit_card",
    paymentProvider: "Stripe",
    status: "success",
    customerId: "cust-124",
    customerName: "Bob Smith",
    description: "Grooming service - Full package",
    processingFee: 3.78,
    netAmount: 116.22,
  },
  {
    id: "txn-003",
    facilityId: 2,
    facilityName: "Furry Friends Grooming",
    transactionDate: "2025-11-24T16:45:00Z",
    amount: 65.0,
    currency: "USD",
    paymentMethod: "debit_card",
    paymentProvider: "Square",
    status: "failed",
    customerId: "cust-125",
    customerName: "Diana Prince",
    description: "Basic grooming",
    processingFee: 0,
    netAmount: 0,
    failureReason: "Insufficient funds",
  },
  {
    id: "txn-004",
    facilityId: 3,
    facilityName: "Happy Tails Boarding",
    transactionDate: "2025-11-24T09:20:00Z",
    amount: 450.0,
    currency: "USD",
    paymentMethod: "credit_card",
    paymentProvider: "Stripe",
    status: "success",
    customerId: "cust-126",
    customerName: "Frank Miller",
    description: "Boarding - 7 nights",
    processingFee: 13.35,
    netAmount: 436.65,
  },
  {
    id: "txn-005",
    facilityId: 3,
    facilityName: "Happy Tails Boarding",
    transactionDate: "2025-11-23T11:30:00Z",
    amount: 180.0,
    currency: "USD",
    paymentMethod: "paypal",
    paymentProvider: "PayPal",
    status: "refunded",
    customerId: "cust-127",
    customerName: "Grace Lee",
    description: "Boarding - cancelled",
    processingFee: 5.52,
    netAmount: 174.48,
    refundAmount: 180.0,
    refundDate: "2025-11-24T10:00:00Z",
  },
  {
    id: "txn-006",
    facilityId: 4,
    facilityName: "Pet Paradise Vet",
    transactionDate: "2025-11-23T14:00:00Z",
    amount: 285.0,
    currency: "USD",
    paymentMethod: "credit_card",
    paymentProvider: "Stripe",
    status: "success",
    customerId: "cust-128",
    customerName: "Ivy Chen",
    description: "Veterinary consultation + vaccines",
    processingFee: 8.58,
    netAmount: 276.42,
  },
  {
    id: "txn-007",
    facilityId: 6,
    facilityName: "Pet Groomers Paradise",
    transactionDate: "2025-11-22T13:45:00Z",
    amount: 95.0,
    currency: "USD",
    paymentMethod: "credit_card",
    paymentProvider: "Stripe",
    status: "success",
    customerId: "cust-129",
    customerName: "Nina Patel",
    description: "Premium grooming service",
    processingFee: 3.06,
    netAmount: 91.94,
  },
  {
    id: "txn-008",
    facilityId: 9,
    facilityName: "Doggy Day Spa",
    transactionDate: "2025-11-22T10:30:00Z",
    amount: 150.0,
    currency: "USD",
    paymentMethod: "credit_card",
    paymentProvider: "Stripe",
    status: "success",
    customerId: "cust-130",
    customerName: "Victor Chen",
    description: "Spa package - Deluxe",
    processingFee: 4.65,
    netAmount: 145.35,
  },
  {
    id: "txn-009",
    facilityId: 7,
    facilityName: "Animal Care Center",
    transactionDate: "2025-11-21T15:20:00Z",
    amount: 75.0,
    currency: "USD",
    paymentMethod: "debit_card",
    paymentProvider: "Square",
    status: "failed",
    customerId: "cust-131",
    customerName: "Quinn Taylor",
    description: "Boarding service",
    processingFee: 0,
    netAmount: 0,
    failureReason: "Card declined",
  },
  {
    id: "txn-010",
    facilityId: 10,
    facilityName: "Exotic Pets Hub",
    transactionDate: "2025-11-21T12:00:00Z",
    amount: 125.0,
    currency: "USD",
    paymentMethod: "credit_card",
    paymentProvider: "Stripe",
    status: "success",
    customerId: "cust-132",
    customerName: "Yara Ahmed",
    description: "Exotic pet boarding",
    processingFee: 3.93,
    netAmount: 121.07,
  },
];

// Payment providers configuration
export const paymentProviders: PaymentProvider[] = [
  {
    id: "provider-stripe",
    name: "Stripe",
    type: "stripe",
    isActive: true,
    facilities: [1, 3, 4, 6, 9, 10],
    processingFeePercentage: 2.9,
    fixedFee: 0.3,
    currency: "USD",
    configuration: {
      publicKey: "pk_test_xxxxxxxxxxxxx",
      webhookUrl: "https://api.example.com/webhooks/stripe",
      supportedMethods: ["credit_card", "debit_card", "bank_transfer"],
    },
    statistics: {
      totalTransactions: 1245,
      successfulTransactions: 1198,
      failedTransactions: 47,
      totalVolume: 187650.0,
      averageTransactionValue: 150.72,
    },
  },
  {
    id: "provider-square",
    name: "Square",
    type: "square",
    isActive: true,
    facilities: [2, 7],
    processingFeePercentage: 2.6,
    fixedFee: 0.1,
    currency: "USD",
    configuration: {
      apiKey: "sq0atp-xxxxxxxxxxxxx",
      webhookUrl: "https://api.example.com/webhooks/square",
      supportedMethods: ["credit_card", "debit_card"],
    },
    statistics: {
      totalTransactions: 456,
      successfulTransactions: 431,
      failedTransactions: 25,
      totalVolume: 42380.0,
      averageTransactionValue: 92.89,
    },
  },
  {
    id: "provider-paypal",
    name: "PayPal",
    type: "paypal",
    isActive: true,
    facilities: [3, 5],
    processingFeePercentage: 3.49,
    fixedFee: 0.49,
    currency: "USD",
    configuration: {
      apiKey: "AYSq3RDxxxxxxxxxxxxxx",
      webhookUrl: "https://api.example.com/webhooks/paypal",
      supportedMethods: ["paypal", "credit_card", "debit_card"],
    },
    statistics: {
      totalTransactions: 287,
      successfulTransactions: 272,
      failedTransactions: 15,
      totalVolume: 35820.0,
      averageTransactionValue: 124.81,
    },
  },
];

// Payment analytics data
export const paymentAnalytics: PaymentAnalytics = {
  period: "2025-11",
  totalTransactions: 1239,
  successfulTransactions: 1145,
  failedTransactions: 78,
  pendingTransactions: 16,
  refundedTransactions: 12,
  totalVolume: 186740.0,
  averageTransactionValue: 150.72,
  successRate: 92.4,
  paymentMethodBreakdown: [
    {
      method: "credit_card",
      count: 892,
      volume: 142350.0,
    },
    {
      method: "debit_card",
      count: 234,
      volume: 28940.0,
    },
    {
      method: "paypal",
      count: 87,
      volume: 11280.0,
    },
    {
      method: "bank_transfer",
      count: 26,
      volume: 4170.0,
    },
  ],
  providerBreakdown: [
    {
      provider: "Stripe",
      count: 945,
      volume: 156870.0,
      successRate: 94.2,
    },
    {
      provider: "Square",
      count: 187,
      volume: 18950.0,
      successRate: 88.7,
    },
    {
      provider: "PayPal",
      count: 107,
      volume: 10920.0,
      successRate: 91.6,
    },
  ],
};

// Helper functions
export function getTransactionsByFacility(facilityId: number): Transaction[] {
  return transactions.filter((txn) => txn.facilityId === facilityId);
}

export function getTransactionsByStatus(status: PaymentStatus): Transaction[] {
  return transactions.filter((txn) => txn.status === status);
}

export function getTransactionsByProvider(provider: string): Transaction[] {
  return transactions.filter((txn) => txn.paymentProvider === provider);
}

export function calculateTotalVolume(): number {
  return transactions
    .filter((txn) => txn.status === "success")
    .reduce((sum, txn) => sum + txn.amount, 0);
}

export function calculateSuccessRate(): number {
  const successful = transactions.filter(
    (txn) => txn.status === "success",
  ).length;
  return (successful / transactions.length) * 100;
}

export function getFailedTransactions(): Transaction[] {
  return transactions.filter((txn) => txn.status === "failed");
}

export function getRefundedTransactions(): Transaction[] {
  return transactions.filter((txn) => txn.status === "refunded");
}
