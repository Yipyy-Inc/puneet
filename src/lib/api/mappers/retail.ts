import type {
  InventoryMovement,
  MovementType,
  Product,
  ProductVariant,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
} from "@/types/retail";

// ============================================================================
// Retail rows ⇄ the shapes the retail screens draw (20260911180840).
//
// The columns are what the database reasons about — price, stock, status,
// the unique SKU and barcode. The editor's long tail (tags, image, pricing
// method, packaging, online visibility) rides in `detail` and comes back as
// it went in. Stock is never written from here: it moves through
// `retail_stock_movements`, and the product row's guard puts back any edit
// that tries.
// ============================================================================

export const RETAIL_PRODUCT_SELECT = `
  id, name, sku, barcode, category, brand, description, base_price,
  cost_price, stock, min_stock, max_stock, taxable, status, variants, detail,
  created_at, updated_at
`;

export interface RetailProductRow {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  description: string;
  base_price: number | string;
  cost_price: number | string;
  stock: number;
  min_stock: number;
  max_stock: number | null;
  taxable: boolean;
  status: string;
  variants: unknown;
  detail: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** The product's fields that are columns, and so never ride in `detail`. */
const PRODUCT_COLUMNS = new Set([
  "id",
  "name",
  "sku",
  "barcode",
  "category",
  "brand",
  "description",
  "basePrice",
  "baseCostPrice",
  "stock",
  "minStock",
  "maxStock",
  "taxable",
  "status",
  "variants",
  "hasVariants",
  "createdAt",
  "updatedAt",
]);

export function rowToProduct(row: RetailProductRow): Product {
  const detail = (row.detail ?? {}) as Partial<Product>;
  const variants = (
    Array.isArray(row.variants) ? row.variants : []
  ) as ProductVariant[];
  return {
    pricingMethod: "manual",
    tags: [],
    taxRate: 0,
    onlineVisible: false,
    ...detail,
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category: row.category,
    brand: row.brand,
    description: row.description,
    basePrice: Number(row.base_price),
    baseCostPrice: Number(row.cost_price),
    stock: row.stock,
    minStock: row.min_stock,
    maxStock: row.max_stock ?? 0,
    taxable: row.taxable,
    status: row.status as Product["status"],
    hasVariants: variants.length > 0,
    variants,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Product;
}

/** What a create or an edit writes. `stock` only on create — the opening count. */
export function productToColumns(p: Partial<Product>, isNew: boolean) {
  const detail: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(p)) {
    if (!PRODUCT_COLUMNS.has(key) && value !== undefined) detail[key] = value;
  }
  const out: Record<string, unknown> = { detail };
  if (p.name !== undefined) out.name = p.name.trim();
  if (p.sku !== undefined) out.sku = p.sku.trim();
  if (p.barcode !== undefined) out.barcode = p.barcode.trim();
  if (p.category !== undefined) out.category = p.category;
  if (p.brand !== undefined) out.brand = p.brand;
  if (p.description !== undefined) out.description = p.description;
  if (p.basePrice !== undefined) out.base_price = Math.max(0, p.basePrice);
  if (p.baseCostPrice !== undefined)
    out.cost_price = Math.max(0, p.baseCostPrice);
  if (p.minStock !== undefined) out.min_stock = Math.max(0, p.minStock);
  if (p.maxStock !== undefined) out.max_stock = p.maxStock || null;
  if (p.taxable !== undefined) out.taxable = p.taxable;
  if (p.status !== undefined) out.status = p.status;
  if (p.hasVariants === false) out.variants = [];
  else if (p.variants !== undefined) out.variants = p.variants;
  if (isNew && p.stock !== undefined && !(p.variants?.length ?? 0)) {
    out.stock = Math.round(p.stock);
  }
  return out;
}

// ── Movements ──────────────────────────────────────────────────────────────

export interface RetailMovementRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  delta: number;
  reason: string;
  note: string;
  sale_id: string | null;
  purchase_order_id: string | null;
  author_name: string;
  created_at: string;
}

const MOVEMENT_TYPE: Record<string, MovementType> = {
  sale: "sale",
  return: "return",
  received: "purchase",
  opening: "adjustment",
  adjustment: "adjustment",
  damaged: "adjustment",
  count: "adjustment",
};

/**
 * Movements, newest first, each with the count before and after it — worked
 * backwards from the product's CURRENT count, so a list that shows only the
 * latest two hundred still states true numbers.
 */
export function rowsToMovements(
  rows: RetailMovementRow[],
  products: Map<string, Product>,
): InventoryMovement[] {
  const running = new Map<string, number>();
  const keyOf = (r: RetailMovementRow) =>
    `${r.product_id}:${r.variant_id ?? ""}`;
  const countOf = (r: RetailMovementRow) => {
    const product = products.get(r.product_id);
    if (!product) return 0;
    if (r.variant_id) {
      return product.variants.find((v) => v.id === r.variant_id)?.stock ?? 0;
    }
    return product.stock;
  };
  const sorted = [...rows].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  return sorted.map((r) => {
    const key = keyOf(r);
    // The latest movement ends at today's count.
    const after = running.has(key) ? running.get(key)! : countOf(r);
    const opening = r.reason === "opening";
    const before = opening ? 0 : after - r.delta;
    running.set(key, before);
    const product = products.get(r.product_id);
    const variant = r.variant_id
      ? product?.variants.find((v) => v.id === r.variant_id)
      : undefined;
    return {
      id: r.id,
      productId: r.product_id,
      productName: product?.name ?? "",
      variantId: r.variant_id ?? undefined,
      variantName: variant?.name,
      sku: variant?.sku || product?.sku || "",
      movementType: MOVEMENT_TYPE[r.reason] ?? "adjustment",
      quantity: r.delta,
      previousStock: before,
      newStock: after,
      reason: r.note || r.reason,
      referenceId: r.sale_id ?? r.purchase_order_id ?? undefined,
      referenceType: r.sale_id
        ? "transaction"
        : r.purchase_order_id
          ? "purchase_order"
          : "adjustment",
      createdBy: r.author_name,
      createdAt: r.created_at,
      dbReason: r.reason,
    } as InventoryMovement;
  });
}

// ── Suppliers ──────────────────────────────────────────────────────────────

export interface RetailSupplierRow {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export function rowToSupplier(row: RetailSupplierRow): Supplier {
  const detail = (row.detail ?? {}) as Partial<Supplier>;
  return {
    address: "",
    city: "",
    country: "",
    paymentTerms: "",
    leadTimeDays: 0,
    notes: "",
    totalOrders: 0,
    ...detail,
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    status: row.is_active ? "active" : "inactive",
    createdAt: row.created_at,
  } as Supplier;
}

const SUPPLIER_COLUMNS = new Set([
  "id",
  "name",
  "contactName",
  "email",
  "phone",
  "status",
  "totalOrders",
  "createdAt",
]);

export function supplierToColumns(s: Partial<Supplier>) {
  const detail: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(s)) {
    if (!SUPPLIER_COLUMNS.has(key) && value !== undefined) detail[key] = value;
  }
  return {
    ...(s.name !== undefined ? { name: s.name.trim() } : {}),
    ...(s.contactName !== undefined ? { contact_name: s.contactName } : {}),
    ...(s.email !== undefined ? { email: s.email } : {}),
    ...(s.phone !== undefined ? { phone: s.phone } : {}),
    ...(s.status !== undefined ? { is_active: s.status === "active" } : {}),
    detail,
  };
}

// ── Purchase orders ────────────────────────────────────────────────────────

export interface RetailPurchaseOrderRow {
  id: string;
  number: number;
  supplier_id: string | null;
  supplier_name: string;
  status: string;
  items: unknown;
  expected_on: string | null;
  received_at: string | null;
  notes: string;
  created_by: string | null;
  created_at: string;
}

// The database's words for an order's state, and the screen's.
const PO_STATUS_OUT: Record<string, PurchaseOrder["status"]> = {
  draft: "pending",
  ordered: "ordered",
  partial: "partially_received",
  received: "received",
  cancelled: "cancelled",
};
export const PO_STATUS_IN: Record<string, string> = {
  pending: "draft",
  ordered: "ordered",
  // A shipped order is still an order until it arrives.
  shipped: "ordered",
  partially_received: "partial",
  received: "received",
  cancelled: "cancelled",
};

interface StoredPoItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  received?: number;
}

export function rowToPurchaseOrder(row: RetailPurchaseOrderRow): PurchaseOrder {
  const items = (Array.isArray(row.items) ? row.items : []) as StoredPoItem[];
  const lines: PurchaseOrderItem[] = items.map((i) => ({
    productId: i.productId,
    productName: i.productName,
    variantId: i.variantId,
    variantName: i.variantName,
    sku: i.sku ?? "",
    quantity: i.quantity,
    unitCost: Number(i.unitCost),
    totalCost: Math.round(i.quantity * Number(i.unitCost) * 100) / 100,
    receivedQuantity: i.received ?? 0,
  }));
  const subtotal = lines.reduce((sum, l) => sum + l.totalCost, 0);
  return {
    id: row.id,
    orderNumber: `PO-${String(row.number).padStart(4, "0")}`,
    supplierId: row.supplier_id ?? "",
    supplierName: row.supplier_name,
    status: PO_STATUS_OUT[row.status] ?? "pending",
    items: lines,
    subtotal,
    tax: 0,
    shipping: 0,
    total: subtotal,
    notes: row.notes,
    orderedAt: row.created_at,
    expectedDelivery: row.expected_on ?? "",
    receivedAt: row.received_at ?? undefined,
    createdBy: row.created_by ?? "",
  } as PurchaseOrder;
}

export function purchaseOrderItemsToStored(
  items: PurchaseOrderItem[],
): StoredPoItem[] {
  return items.map((i) => ({
    productId: i.productId,
    productName: i.productName,
    ...(i.variantId ? { variantId: i.variantId } : {}),
    ...(i.variantName ? { variantName: i.variantName } : {}),
    sku: i.sku,
    quantity: Math.max(0, Math.round(i.quantity)),
    unitCost: Math.max(0, Number(i.unitCost)),
    received: Math.max(0, Math.round(i.receivedQuantity ?? 0)),
  }));
}
