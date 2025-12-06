// Payment and Transaction Data Models

type PaymentStatus = "success" | "failed" | "pending" | "refunded";
type PaymentMethod =
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
