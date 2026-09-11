import type { CartItem, PaymentMethod, Transaction } from "@/types/retail";

// ============================================================================
// A till sale (retail_sales, 20260911180840) as the `Transaction` the Orders
// tab, the reports and the client file draw.
//
// The fixture carried a `payments[]` split and a cashier id beside the sale;
// the row carries the ids of the ledger payments it was paid with, and the
// tender it was rung up as. Nothing here is computed that the row does not
// already say.
// ============================================================================

export const RETAIL_SALE_SELECT = `
  id, number, client_id, items, subtotal, discount_total, promo_code,
  tax_total, tip, total, tender, payment_ids, status, cashier_name, note,
  created_at, clients(ref, name, email)
`;

export interface RetailSaleRow {
  id: string;
  number: number;
  client_id: string | null;
  items: unknown;
  subtotal: number | string;
  discount_total: number | string;
  promo_code: string | null;
  tax_total: number | string;
  tip: number | string;
  total: number | string;
  tender: string;
  payment_ids: string[];
  status: string;
  cashier_name: string;
  note: string;
  created_at: string;
  clients: { ref: number; name: string | null; email: string | null } | null;
}

interface StoredLine {
  productId?: string | null;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total?: number;
}

/** The till's tender, in the words the Orders tab filters by. */
const TENDER: Record<string, PaymentMethod> = {
  cash: "cash",
  card: "credit",
  credit: "credit",
  debit: "debit",
  terminal: "credit",
  split: "split",
  "store-credit": "store_credit",
  store_credit: "store_credit",
  "gift-card": "gift_card",
  gift_card: "gift_card",
  "e-transfer": "custom",
};

export function rowToRetailSale(row: RetailSaleRow): Transaction {
  const lines = (Array.isArray(row.items) ? row.items : []) as StoredLine[];
  const items: CartItem[] = lines.map((l) => ({
    itemType: "product",
    productId: l.productId ?? undefined,
    productName: l.name,
    variantId: l.variantId ?? undefined,
    variantName: l.variantName ?? undefined,
    sku: l.sku ?? "",
    quantity: l.quantity,
    unitPrice: Number(l.unitPrice),
    discount: Number(l.discount ?? 0),
    discountType: "fixed",
    total: Number(l.total ?? Number(l.unitPrice) * l.quantity),
  }));
  const total = Number(row.total);
  return {
    id: row.id,
    transactionNumber: `S-${String(row.number).padStart(5, "0")}`,
    items,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    promoCodeUsed: row.promo_code ?? undefined,
    taxTotal: Number(row.tax_total),
    tipAmount: Number(row.tip) || undefined,
    total,
    paymentMethod: TENDER[row.tender] ?? "custom",
    payments: [{ method: TENDER[row.tender] ?? "custom", amount: total }],
    status: row.status as Transaction["status"],
    customerId: row.clients ? String(row.clients.ref) : undefined,
    customerName: row.clients?.name ?? undefined,
    customerEmail: row.clients?.email ?? undefined,
    cashierId: "",
    cashierName: row.cashier_name,
    receiptSent: false,
    notes: row.note,
    createdAt: row.created_at,
    paymentIds: row.payment_ids,
  } as Transaction;
}
