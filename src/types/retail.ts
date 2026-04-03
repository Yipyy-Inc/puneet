import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const productStatusEnum = z.enum(["active", "inactive", "discontinued"]);
export type ProductStatus = z.infer<typeof productStatusEnum>;

export const variantTypeEnum = z.enum([
  "size",
  "color",
  "flavor",
  "weight",
  "design",
  "custom",
]);
export type VariantType = z.infer<typeof variantTypeEnum>;

export const orderStatusEnum = z.enum([
  "pending",
  "ordered",
  "shipped",
  "partially_received",
  "received",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

export const transactionStatusEnum = z.enum([
  "completed",
  "refunded",
  "voided",
]);
export type TransactionStatus = z.infer<typeof transactionStatusEnum>;

export const retailPaymentMethodEnum = z.enum([
  "cash",
  "credit",
  "debit",
  "split",
  "add_to_booking",
  "charge_to_account",
  "charge_to_active_stay",
  "store_credit",
  "gift_card",
  "custom",
]);
export type PaymentMethod = z.infer<typeof retailPaymentMethodEnum>;

export const refundMethodEnum = z.enum([
  "original_payment",
  "store_credit",
  "gift_card",
  "cash",
  "custom",
]);
export type RefundMethod = z.infer<typeof refundMethodEnum>;

export const returnStatusEnum = z.enum([
  "pending",
  "approved",
  "completed",
  "cancelled",
]);
export type ReturnStatus = z.infer<typeof returnStatusEnum>;

export const returnReasonEnum = z.enum([
  "defective",
  "wrong_item",
  "not_as_described",
  "customer_request",
  "other",
]);
export type ReturnReason = z.infer<typeof returnReasonEnum>;

export const movementTypeEnum = z.enum([
  "sale",
  "purchase",
  "adjustment",
  "return",
  "transfer",
]);
export type MovementType = z.infer<typeof movementTypeEnum>;

export const cartItemTypeEnum = z.enum([
  "product",
  "service",
  "package",
  "membership",
]);
export type CartItemType = z.infer<typeof cartItemTypeEnum>;

export const cartDiscountTypeEnum = z.enum([
  "percent",
  "fixed",
  "promo_code",
  "account_discount",
  "employee_discount",
]);
export type CartDiscountType = z.infer<typeof cartDiscountTypeEnum>;

// ============================================================================
// Core Schemas
// ============================================================================

export const productVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string(),
  price: z.number(),
  costPrice: z.number(),
  stock: z.number(),
  minStock: z.number(),
  maxStock: z.number(),
  variantType: variantTypeEnum,
  variantValue: z.string(),
  customVariantType: z.string().optional(),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  // Multi-dimensional variant attributes, e.g. { Size: "Small", Color: "Red" }
  variantAttributes: z.record(z.string(), z.string()).optional(),
});
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const productSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    brand: z.string(),
    basePrice: z.number(),
    baseCostPrice: z.number(),
    sku: z.string(),
    barcode: z.string(),
    status: productStatusEnum,
    hasVariants: z.boolean(),
    variants: z.array(productVariantSchema),
    stock: z.number(),
    minStock: z.number(),
    maxStock: z.number(),
    imageUrl: z.string().optional(),
    tags: z.array(z.string()),
    taxable: z.boolean(),
    taxRate: z.number(),
    onlineVisible: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
export type Product = z.infer<typeof productSchema>;

export const supplierSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    contactName: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    country: z.string(),
    website: z.string().optional(),
    paymentTerms: z.string(),
    leadTimeDays: z.number(),
    status: z.enum(["active", "inactive"]),
    notes: z.string(),
    totalOrders: z.number(),
    createdAt: z.string(),
  })
  .passthrough();
export type Supplier = z.infer<typeof supplierSchema>;

export const purchaseOrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  variantId: z.string().optional(),
  variantName: z.string().optional(),
  sku: z.string(),
  quantity: z.number(),
  unitCost: z.number(),
  totalCost: z.number(),
  receivedQuantity: z.number(),
});
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderSchema = z
  .object({
    id: z.string(),
    orderNumber: z.string(),
    supplierId: z.string(),
    supplierName: z.string(),
    status: orderStatusEnum,
    items: z.array(purchaseOrderItemSchema),
    subtotal: z.number(),
    tax: z.number(),
    shipping: z.number(),
    total: z.number(),
    notes: z.string(),
    orderedAt: z.string(),
    expectedDelivery: z.string(),
    receivedAt: z.string().optional(),
    createdBy: z.string(),
  })
  .passthrough();
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

// ============================================================================
// Cart & Transaction Schemas
// ============================================================================

export const cartItemSchema = z.object({
  itemType: cartItemTypeEnum,
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  packageId: z.string().optional(),
  membershipId: z.string().optional(),
  productName: z.string(),
  variantId: z.string().optional(),
  variantName: z.string().optional(),
  sku: z.string(),
  serviceType: z.string().optional(),
  serviceDate: z.string().optional(),
  serviceDuration: z.number().optional(),
  packageDetails: z.string().optional(),
  membershipPlanId: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number(),
  discountType: z.enum(["fixed", "percent"]),
  total: z.number(),
  isComp: z.boolean().optional(),
  compReason: z.string().optional(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartDiscountSchema = z.object({
  type: cartDiscountTypeEnum,
  value: z.number(),
  promoCode: z.string().optional(),
  appliedBy: z.string().optional(),
  reason: z.string().optional(),
});
export type CartDiscount = z.infer<typeof cartDiscountSchema>;

export const retailPromoCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number(),
  minPurchase: z.number().optional(),
  maxDiscount: z.number().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  usageLimit: z.number().optional(),
  usageCount: z.number(),
  isActive: z.boolean(),
  applicableTo: z.array(z.string()).optional(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type PromoCode = z.infer<typeof retailPromoCodeSchema>;

export const accountDiscountSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number(),
  applicableTo: z.enum(["all", "products", "services", "both"]).optional(),
  productCategories: z.array(z.string()).optional(),
  validFrom: z.string(),
  validTo: z.string().optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AccountDiscount = z.infer<typeof accountDiscountSchema>;

const paymentSplitSchema = z.object({
  method: retailPaymentMethodEnum,
  amount: z.number(),
  customMethodName: z.string().optional(),
});

export const returnItemSchema = z.object({
  transactionItemId: z.string(),
  productId: z.string(),
  productName: z.string(),
  variantId: z.string().optional(),
  variantName: z.string().optional(),
  sku: z.string(),
  quantity: z.number(),
  originalQuantity: z.number(),
  unitPrice: z.number(),
  discount: z.number(),
  discountType: z.enum(["fixed", "percent"]).optional(),
  total: z.number(),
  reason: returnReasonEnum,
  reasonNotes: z.string().optional(),
  restocked: z.boolean(),
});
export type ReturnItem = z.infer<typeof returnItemSchema>;

export const returnSchema = z.object({
  id: z.string(),
  returnNumber: z.string(),
  transactionId: z.string(),
  transactionNumber: z.string(),
  items: z.array(returnItemSchema),
  subtotal: z.number(),
  refundTotal: z.number(),
  refundMethod: refundMethodEnum,
  customRefundMethodName: z.string().optional(),
  storeCreditAmount: z.number().optional(),
  giftCardNumber: z.string().optional(),
  status: returnStatusEnum,
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  processedBy: z.string(),
  processedByName: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type Return = z.infer<typeof returnSchema>;

export const transactionSchema = z
  .object({
    id: z.string(),
    transactionNumber: z.string(),
    items: z.array(cartItemSchema),
    subtotal: z.number(),
    discountTotal: z.number(),
    cartDiscount: cartDiscountSchema.optional(),
    promoCodeUsed: z.string().optional(),
    accountDiscountApplied: z.string().optional(),
    taxTotal: z.number(),
    tipAmount: z.number().optional(),
    tipPercentage: z.number().optional(),
    total: z.number(),
    paymentMethod: retailPaymentMethodEnum,
    payments: z.array(paymentSplitSchema),
    status: transactionStatusEnum,
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    petId: z.number().optional(),
    petName: z.string().optional(),
    bookingId: z.number().optional(),
    bookingService: z.string().optional(),
    chargedToBookingId: z.number().optional(),
    chargedToAccount: z.boolean().optional(),
    cashierId: z.string(),
    cashierName: z.string(),
    receiptSent: z.boolean(),
    receiptEmail: z.string().optional(),
    notes: z.string(),
    createdAt: z.string(),
    returns: z.array(returnSchema).optional(),
    fiservTransactionId: z.string().optional(),
    yipyyPayTransactionId: z.string().optional(),
    cloverTransactionId: z.string().optional(),
    tokenizedCardId: z.string().optional(),
    locationId: z.string().optional(),
  })
  .passthrough();
export type Transaction = z.infer<typeof transactionSchema>;

export const storeCreditSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  amount: z.number(),
  balance: z.number(),
  issuedFrom: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StoreCredit = z.infer<typeof storeCreditSchema>;

export const customPaymentMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isActive: z.boolean(),
  canBeUsedForRefunds: z.boolean(),
  icon: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomPaymentMethod = z.infer<typeof customPaymentMethodSchema>;

export const inventoryMovementSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    productName: z.string(),
    variantId: z.string().optional(),
    variantName: z.string().optional(),
    sku: z.string(),
    movementType: movementTypeEnum,
    quantity: z.number(),
    previousStock: z.number(),
    newStock: z.number(),
    reason: z.string(),
    referenceId: z.string().optional(),
    referenceType: z
      .enum(["transaction", "purchase_order", "adjustment"])
      .optional(),
    createdBy: z.string(),
    createdAt: z.string(),
  })
  .passthrough();
export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;

export const lowStockAlertSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    productName: z.string(),
    variantId: z.string().optional(),
    variantName: z.string().optional(),
    sku: z.string(),
    currentStock: z.number(),
    minStock: z.number(),
    status: z.enum(["pending", "acknowledged", "resolved"]),
    createdAt: z.string(),
    acknowledgedAt: z.string().optional(),
    acknowledgedBy: z.string().optional(),
  })
  .passthrough();
export type LowStockAlert = z.infer<typeof lowStockAlertSchema>;

export const retailGiftCardSchema = z.object({
  id: z.string(),
  cardNumber: z.string(),
  pin: z.string().optional(),
  amount: z.number(),
  balance: z.number(),
  issuedFrom: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RetailGiftCard = z.infer<typeof retailGiftCardSchema>;

export const onlineStoreSettingsSchema = z.object({
  enabled: z.boolean(),
  syncInventory: z.boolean(),
  syncProducts: z.boolean(),
  syncPrices: z.boolean(),
  lastSyncAt: z.string(),
  storeUrl: z.string(),
  apiConnected: z.boolean(),
  autoPublishNewProducts: z.boolean(),
  lowStockThreshold: z.number(),
  hideOutOfStock: z.boolean(),
});
export type OnlineStoreSettings = z.infer<typeof onlineStoreSettingsSchema>;

// ============================================================================
// Report Schemas
// ============================================================================

export const salesByPeriodSchema = z.object({
  date: z.string(),
  sales: z.number(),
  transactions: z.number(),
  items: z.number(),
});
export type SalesByPeriod = z.infer<typeof salesByPeriodSchema>;

export const topProductSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  variantId: z.string().optional(),
  variantName: z.string().optional(),
  sku: z.string(),
  quantitySold: z.number(),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
  profitMargin: z.number(),
});
export type TopProduct = z.infer<typeof topProductSchema>;

export const profitMarginReportSchema = z.object({
  period: z.string(),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
  profitMargin: z.number(),
  transactions: z.number(),
});
export type ProfitMarginReport = z.infer<typeof profitMarginReportSchema>;

export const salesByStaffSchema = z.object({
  staffId: z.string(),
  staffName: z.string(),
  transactions: z.number(),
  revenue: z.number(),
  itemsSold: z.number(),
  averageTransaction: z.number(),
});
export type SalesByStaff = z.infer<typeof salesByStaffSchema>;

export const salesByCategorySchema = z.object({
  category: z.string(),
  revenue: z.number(),
  transactions: z.number(),
  itemsSold: z.number(),
  profit: z.number(),
  profitMargin: z.number(),
});
export type SalesByCategory = z.infer<typeof salesByCategorySchema>;

export const salesLinkedToServicesSchema = z.object({
  serviceType: z.string(),
  revenue: z.number(),
  transactions: z.number(),
  itemsSold: z.number(),
});
export type SalesLinkedToServices = z.infer<typeof salesLinkedToServicesSchema>;
