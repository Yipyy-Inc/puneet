"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  InventoryMovement,
  Product,
  PurchaseOrder,
  Supplier,
  Transaction,
} from "@/types/retail";

// ============================================================================
// Retail on its own rows (20260911180840): products, the stock ledger, till
// sales, suppliers and purchase orders.
//
// `retailQueries` in ./retail.ts returned `@/data/retail` — another shop's
// thirteen products and six sales — and `retailMutations` assigned into the
// module. These read and write the facility's tables through /api/retail.
// A separate module because ./retail.ts is imported by server code for its
// tax and pricing helpers, and hooks would make it client-only.
// ============================================================================

export const retailKeys = {
  all: ["retail-db"] as const,
  products: () => ["retail-db", "products"] as const,
  movements: (productId?: string) =>
    productId
      ? (["retail-db", "movements", productId] as const)
      : (["retail-db", "movements"] as const),
  sales: () => ["retail-db", "sales"] as const,
  suppliers: () => ["retail-db", "suppliers"] as const,
  purchaseOrders: () => ["retail-db", "purchase-orders"] as const,
};

/** A refusal from the database, with the reason the screen translates. */
export class RetailRefused extends Error {
  constructor(
    message: string,
    readonly reason: string | null,
  ) {
    super(message);
  }
}

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string; reason?: string | null })
    | null;
  if (!response.ok) {
    throw new RetailRefused(
      parsed?.error ?? `Request failed (${response.status})`,
      parsed?.reason ?? null,
    );
  }
  return parsed as T;
}

function useInvalidateRetail() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: retailKeys.all });
  };
}

// ── Products ───────────────────────────────────────────────────────────────

export function useRetailProducts() {
  return useQuery({
    queryKey: retailKeys.products(),
    queryFn: () => json<Product[]>("/api/retail/products"),
  });
}

/**
 * Create (no id) or edit (with its id). `stockCount` is a count typed into
 * the editor; it is written to the stock ledger as a count, never onto the
 * product row.
 */
export function useSaveRetailProduct() {
  const invalidate = useInvalidateRetail();
  return useMutation({
    mutationFn: (input: {
      id?: string;
      product: Partial<Product>;
      stockCount?: number;
      authorName?: string;
    }) =>
      input.id
        ? json<Product>(
            `/api/retail/products/${encodeURIComponent(input.id)}`,
            {
              method: "PATCH",
              body: {
                ...input.product,
                ...(input.stockCount !== undefined
                  ? { stockCount: input.stockCount }
                  : {}),
                authorName: input.authorName,
              },
            },
          )
        : json<Product>("/api/retail/products", {
            method: "POST",
            body: input.product,
          }),
    onSuccess: invalidate,
  });
}

// ── The stock ledger ───────────────────────────────────────────────────────

export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: retailKeys.movements(productId),
    queryFn: () =>
      json<InventoryMovement[]>(
        productId
          ? `/api/retail/stock-movements?productId=${encodeURIComponent(productId)}`
          : "/api/retail/stock-movements",
      ),
  });
}

export function useAdjustStock() {
  const invalidate = useInvalidateRetail();
  return useMutation({
    mutationFn: (input: {
      productId: string;
      variantId?: string;
      delta: number;
      reason: "adjustment" | "damaged" | "count";
      note?: string;
      authorName?: string;
    }) =>
      json<{ id: string }>("/api/retail/stock-movements", {
        method: "POST",
        body: input,
      }),
    onSuccess: invalidate,
  });
}

// ── Sales ──────────────────────────────────────────────────────────────────

export function useRetailSales() {
  return useQuery({
    queryKey: retailKeys.sales(),
    queryFn: () => json<Transaction[]>("/api/retail/sales"),
  });
}

export interface RetailSaleInput {
  items: {
    productId?: string;
    variantId?: string;
    name: string;
    variantName?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total?: number;
    taxable?: boolean;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  tender: string;
  clientRef?: number;
  /** Payments already taken (a Clover card), to link to the sale. */
  paymentIds?: string[];
  /** Payments to record with the sale. */
  payments?: {
    method: "cash" | "e-transfer" | "store-credit" | "gift-card";
    amount: number;
    cashReceived?: number;
    giftCardCode?: string;
    note?: string;
  }[];
  promoCode?: string;
  note?: string;
  cashierName?: string;
}

export interface RecordedSale {
  saleId: string;
  number: number;
  paymentIds: string[];
  promoAmount: number;
}

/** Record a till sale: the sale, the stock and the money, all or nothing. */
export async function recordRetailSale(
  input: RetailSaleInput,
): Promise<RecordedSale> {
  return json<RecordedSale>("/api/retail/sales", {
    method: "POST",
    body: input,
  });
}

/** What a promo code takes off a basket, asked before the sale. */
export async function quoteRetailPromo(input: {
  code: string;
  amount: number;
  clientRef?: number;
}): Promise<{ promoCodeId: string; code: string; amount: number }> {
  return json("/api/retail/promo-quote", { method: "POST", body: input });
}

// ── Suppliers and purchase orders ──────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: retailKeys.suppliers(),
    queryFn: () => json<Supplier[]>("/api/retail/suppliers"),
  });
}

export function useSaveSupplier() {
  const invalidate = useInvalidateRetail();
  return useMutation({
    mutationFn: (input: { id?: string; supplier: Partial<Supplier> }) =>
      input.id
        ? json<Supplier>(
            `/api/retail/suppliers/${encodeURIComponent(input.id)}`,
            { method: "PATCH", body: input.supplier },
          )
        : json<Supplier>("/api/retail/suppliers", {
            method: "POST",
            body: input.supplier,
          }),
    onSuccess: invalidate,
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: retailKeys.purchaseOrders(),
    queryFn: () => json<PurchaseOrder[]>("/api/retail/purchase-orders"),
  });
}

export function useSavePurchaseOrder() {
  const invalidate = useInvalidateRetail();
  return useMutation({
    mutationFn: (input: { id?: string; order: Partial<PurchaseOrder> }) =>
      input.id
        ? json<PurchaseOrder>(
            `/api/retail/purchase-orders/${encodeURIComponent(input.id)}`,
            { method: "PATCH", body: input.order },
          )
        : json<PurchaseOrder>("/api/retail/purchase-orders", {
            method: "POST",
            body: input.order,
          }),
    onSuccess: invalidate,
  });
}

export function useReceivePurchaseOrder() {
  const invalidate = useInvalidateRetail();
  return useMutation({
    mutationFn: (input: {
      id: string;
      lines: { index: number; quantity: number; unitCost?: number }[];
      authorName?: string;
    }) =>
      json<{ status: string }>(
        `/api/retail/purchase-orders/${encodeURIComponent(input.id)}/receive`,
        {
          method: "POST",
          body: { lines: input.lines, authorName: input.authorName },
        },
      ),
    onSuccess: invalidate,
  });
}
