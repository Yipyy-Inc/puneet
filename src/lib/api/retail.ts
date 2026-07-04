import {
  products,
  purchaseOrders,
  suppliers,
  getAllTransactions,
  lowStockAlerts,
  inventoryMovements,
  customPaymentMethods,
  storeCredits,
  giftCards,
  addRetailTransaction,
  createReturn as _createReturn,
  createStoreCredit as _createStoreCredit,
  createGiftCard as _createGiftCard,
} from "@/data/retail";
import type {
  Product,
  PurchaseOrder,
  Supplier,
  Transaction,
  LowStockAlert,
  InventoryMovement,
  CustomPaymentMethod,
  StoreCredit,
  Return,
  RetailGiftCard,
} from "@/types/retail";
import {
  retailConfig,
  type RetailTaxConfig,
  type RetailReceiptConfig,
  type RetailLowStockConfig,
} from "@/data/retail-config";
import type { InvoiceDocumentTax } from "@/lib/invoice-document";

/**
 * Build invoice/receipt tax lines from the retail Tax Configuration — the
 * single source of truth shared by the POS and the Invoice Template (Task 40).
 * Returns an empty array when there is nothing to tax.
 */
export function buildRetailTaxLines(
  taxableBase: number,
  config: RetailTaxConfig = retailConfig.taxConfig,
): InvoiceDocumentTax[] {
  const { defaultRate, taxMode } = config;
  if (taxableBase <= 0 || defaultRate <= 0) return [];
  const rate = defaultRate / 100;
  return [
    {
      name: taxMode,
      rate,
      amount: Math.round(taxableBase * rate * 100) / 100,
    },
  ];
}

export const retailQueries = {
  products: () => ({
    queryKey: ["retail", "products"] as const,
    queryFn: async (): Promise<Product[]> => products,
  }),
  purchaseOrders: () => ({
    queryKey: ["retail", "purchase-orders"] as const,
    queryFn: async (): Promise<PurchaseOrder[]> => purchaseOrders,
  }),
  suppliers: () => ({
    queryKey: ["retail", "suppliers"] as const,
    queryFn: async (): Promise<Supplier[]> => suppliers,
  }),
  transactions: () => ({
    queryKey: ["retail", "transactions"] as const,
    queryFn: async (): Promise<Transaction[]> => getAllTransactions(),
  }),
  lowStockAlerts: () => ({
    queryKey: ["retail", "low-stock-alerts"] as const,
    queryFn: async (): Promise<LowStockAlert[]> => lowStockAlerts,
  }),
  inventoryMovements: () => ({
    queryKey: ["retail", "inventory-movements"] as const,
    queryFn: async (): Promise<InventoryMovement[]> => inventoryMovements,
  }),
  customPaymentMethods: () => ({
    queryKey: ["retail", "custom-payment-methods"] as const,
    queryFn: async (): Promise<CustomPaymentMethod[]> => customPaymentMethods,
  }),
  storeCredits: () => ({
    queryKey: ["retail", "store-credits"] as const,
    queryFn: async (): Promise<StoreCredit[]> => storeCredits,
  }),
  giftCards: () => ({
    queryKey: ["retail", "gift-cards"] as const,
    queryFn: async (): Promise<RetailGiftCard[]> => giftCards,
  }),
  /**
   * Single source of truth for retail/POS tax calculation. The POS module and
   * the Invoice Template (Task 40) read tax rates from here instead of using
   * hardcoded Quebec-only tax logic.
   */
  taxConfig: () => ({
    queryKey: ["retail", "tax-config"] as const,
    queryFn: async (): Promise<RetailTaxConfig> => retailConfig.taxConfig,
  }),
  receiptConfig: () => ({
    queryKey: ["retail", "receipt-config"] as const,
    queryFn: async (): Promise<RetailReceiptConfig> =>
      retailConfig.receiptConfig,
  }),
  lowStockConfig: () => ({
    queryKey: ["retail", "low-stock-config"] as const,
    queryFn: async (): Promise<RetailLowStockConfig> =>
      retailConfig.lowStockConfig,
  }),
};

export const retailMutations = {
  addTransaction: (
    txn: Omit<
      Transaction,
      "id" | "transactionNumber" | "createdAt" | "status" | "receiptSent"
    >,
  ) => ({
    mutationFn: async () => addRetailTransaction(txn),
  }),
  createReturn: (
    returnData: Omit<Return, "id" | "returnNumber" | "createdAt">,
  ) => ({
    mutationFn: async () => _createReturn(returnData),
  }),
  createStoreCredit: (
    creditData: Omit<StoreCredit, "id" | "createdAt" | "updatedAt">,
  ) => ({
    mutationFn: async () => _createStoreCredit(creditData),
  }),
  createGiftCard: (
    cardData: Omit<
      RetailGiftCard,
      "id" | "cardNumber" | "createdAt" | "updatedAt"
    >,
  ) => ({
    mutationFn: async () => _createGiftCard(cardData),
  }),
  updateTaxConfig: (config: RetailTaxConfig) => ({
    mutationFn: async (): Promise<RetailTaxConfig> => {
      retailConfig.taxConfig = config;
      return retailConfig.taxConfig;
    },
  }),
  updateReceiptConfig: (config: RetailReceiptConfig) => ({
    mutationFn: async (): Promise<RetailReceiptConfig> => {
      retailConfig.receiptConfig = config;
      return retailConfig.receiptConfig;
    },
  }),
  updateLowStockConfig: (config: RetailLowStockConfig) => ({
    mutationFn: async (): Promise<RetailLowStockConfig> => {
      retailConfig.lowStockConfig = config;
      return retailConfig.lowStockConfig;
    },
  }),
};
