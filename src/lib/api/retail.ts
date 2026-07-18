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
  type RetailPricingConfig,
  type BrandMarginRule,
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
  /**
   * Facility default pricing behavior (spec tasks #11–13): default method,
   * default margin, and the rounding rule fed to @/lib/retail-pricing.
   */
  pricingConfig: () => ({
    queryKey: ["retail", "pricing-config"] as const,
    queryFn: async (): Promise<RetailPricingConfig> =>
      retailConfig.pricingConfig,
  }),
  /** Per-brand margin rules (spec task #8), matched by normalized brand name. */
  brandMarginRules: () => ({
    queryKey: ["retail", "brand-margin-rules"] as const,
    queryFn: async (): Promise<BrandMarginRule[]> =>
      retailConfig.brandMarginRules,
  }),
};

/** Normalize a brand name for matching: lowercase, whitespace removed. */
function normalizeBrandName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

/**
 * Resolve the brand margin rule for a product's brand (spec task #8). Matching
 * is case- and space-insensitive so "PawNutrition" and "Paw Nutrition" resolve
 * to the same rule — this is why the "Manage Brands" screen standardizes names.
 */
export function resolveBrandRule(
  brandName: string,
  rules: BrandMarginRule[] = retailConfig.brandMarginRules,
): BrandMarginRule | undefined {
  if (!brandName) return undefined;
  const target = normalizeBrandName(brandName);
  return rules.find((r) => normalizeBrandName(r.brandName) === target);
}

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
  updatePricingConfig: (config: RetailPricingConfig) => ({
    mutationFn: async (): Promise<RetailPricingConfig> => {
      retailConfig.pricingConfig = config;
      return retailConfig.pricingConfig;
    },
  }),
  /**
   * Insert or update a brand margin rule (spec task #8). A missing/blank id
   * creates a new rule; an existing id replaces it in place.
   */
  upsertBrandMarginRule: (
    input: Omit<BrandMarginRule, "id"> & { id?: string },
  ) => ({
    mutationFn: async (): Promise<BrandMarginRule[]> => {
      const id = input.id || `brm-${Date.now()}`;
      const rule: BrandMarginRule = {
        id,
        brandName: input.brandName,
        marginPercent: input.marginPercent,
      };
      const rules = retailConfig.brandMarginRules;
      const idx = rules.findIndex((r) => r.id === id);
      if (idx >= 0) rules[idx] = rule;
      else rules.push(rule);
      return retailConfig.brandMarginRules;
    },
  }),
  deleteBrandMarginRule: (id: string) => ({
    mutationFn: async (): Promise<BrandMarginRule[]> => {
      retailConfig.brandMarginRules = retailConfig.brandMarginRules.filter(
        (r) => r.id !== id,
      );
      return retailConfig.brandMarginRules;
    },
  }),
};
