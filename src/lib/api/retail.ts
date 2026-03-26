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
};
