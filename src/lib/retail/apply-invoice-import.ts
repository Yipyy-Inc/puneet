/**
 * Apply an invoice import (spec Step 4 / task #32) against the mock data stores.
 *
 * Performs, for the included review rows:
 *  - create new product records (Active) for "New Product" rows;
 *  - increase stock on matched products by Total Sellable Units;
 *  - update baseCostPrice where the per-sellable cost differs, and recompute
 *    basePrice for margin/brand_rule products (manual selling prices are left
 *    alone — no silent change, per 2.8);
 *  - write an InventoryMovement per affected product;
 *  - create a received PurchaseOrder — or link into an existing open one — and
 *    attach the invoice file (spec 2.4, task #33), via the shared PO helpers in
 *    @/data/retail.
 *
 * MOCK: mutates the in-memory arrays in @/data/retail (same pattern as the rest
 * of the retail module). A real backend swaps these writes for API calls.
 */

import {
  products,
  inventoryMovements,
  purchaseOrders,
  createReceivedPurchaseOrder,
  receiveInvoiceIntoPurchaseOrder,
} from "@/data/retail";
import type { Product, PricingMethod, PurchaseOrderItem } from "@/types/retail";
import { retailConfig } from "@/data/retail-config";
import { resolveBrandRule } from "@/lib/api/retail";
import { recomputeSellingPrice } from "@/lib/retail-pricing";
import {
  costPerSellableUnit,
  totalSellableUnits,
  packageUnitFromUnitType,
  type UnitType,
} from "@/lib/retail/invoice-line-math";

/** Minimal row shape the apply step needs (the review table's Row is a superset). */
export interface ImportRow {
  include: boolean;
  isNewProduct: boolean;
  matchProductId: string | null;
  matchVariantId: string | null;
  matchLabel: string | null;
  description: string;
  qty: number;
  unitCost: number;
  unitType: UnitType;
  itemsPerUnit: number;
  newName: string;
  newCategory: string;
  newBrand: string;
  newSku: string;
  newPricingMethod: PricingMethod;
  newMarginPercent: number;
  /** When false, keep the matched product's stored cost (stock still increases). */
  applyCostUpdate?: boolean;
}

export interface ApplyInvoiceImportParams {
  rows: ImportRow[];
  invoiceNumber: string;
  supplierId: string | null;
  supplierName: string;
  /** Attached invoice document (task #33). */
  invoiceFile?: { name: string; url?: string };
  /** When set, receive into this existing open PO instead of creating a new one. */
  linkToPoId?: string;
}

export interface ApplyInvoiceImportResult {
  updatedProductIds: string[];
  newProductIds: string[];
  poId: string;
  /** True when the import was received into an existing PO rather than a new one. */
  linkedToExisting: boolean;
}

// Monotonic batch id so product/movement ids stay unique across imports that
// land in the same millisecond.
let importBatchSeq = 0;

export function applyInvoiceImport(
  params: ApplyInvoiceImportParams,
): ApplyInvoiceImportResult {
  const {
    rows,
    invoiceNumber,
    supplierId,
    supplierName,
    invoiceFile,
    linkToPoId,
  } = params;
  const rounding = retailConfig.pricingConfig.rounding;
  const now = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const stamp = `${new Date().getTime()}-${(importBatchSeq += 1)}`;

  const included = rows.filter((r) => r.include);
  const updatedProductIds: string[] = [];
  const newProductIds: string[] = [];
  const poItems: PurchaseOrderItem[] = [];
  // Movements are pushed after the PO exists, so referenceId points at it.
  const pendingMovements: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    sku: string;
    quantity: number;
    previousStock: number;
    newStock: number;
  }> = [];
  let seq = 0;

  for (const row of included) {
    seq += 1;
    const units = totalSellableUnits(row.qty, row.itemsPerUnit, row.unitType);
    const cost = costPerSellableUnit(
      row.unitCost,
      row.itemsPerUnit,
      row.unitType,
    );

    let productId: string;
    let productName: string;
    let sku: string;
    let variantId: string | undefined;
    let variantName: string | undefined;
    let previousStock: number;
    let newStock: number;

    if (row.isNewProduct) {
      // Create an Active product record.
      productId = `prod-import-${stamp}-${seq}`;
      productName = row.newName || row.description || "New product";
      sku = row.newSku;
      previousStock = 0;
      newStock = units;
      const basePrice = recomputeSellingPrice({
        cost,
        method: row.newPricingMethod,
        marginPercent: row.newMarginPercent,
        brandRuleMargin: resolveBrandRule(row.newBrand)?.marginPercent,
        fallbackPrice: cost, // new manual product defaults to cost, editable later
        rounding,
      });
      const newProduct: Product = {
        id: productId,
        name: productName,
        description: "",
        category: row.newCategory,
        brand: row.newBrand,
        basePrice,
        baseCostPrice: cost,
        pricingMethod: row.newPricingMethod,
        ...(row.newPricingMethod === "margin"
          ? { marginPercent: row.newMarginPercent }
          : {}),
        priceUpdatedAt: now,
        sku,
        barcode: "",
        status: "active",
        hasVariants: false,
        variants: [],
        stock: newStock,
        minStock: 0,
        maxStock: Math.max(newStock, 100),
        tags: [],
        taxable: true,
        taxRate: 0,
        onlineVisible: true,
        packagedAs:
          row.unitType === "Each"
            ? { unitType: "each" }
            : {
                unitType: packageUnitFromUnitType(row.unitType),
                itemsPerPackage: row.itemsPerUnit,
              },
        createdAt: now,
        updatedAt: now,
      };
      products.push(newProduct);
      newProductIds.push(productId);
    } else {
      // Update a matched product.
      const product = products.find((p) => p.id === row.matchProductId);
      if (!product) continue;
      const variant = row.matchVariantId
        ? product.variants.find((v) => v.id === row.matchVariantId)
        : undefined;
      productId = product.id;
      productName = product.name;
      sku = variant?.sku ?? product.sku;
      variantId = variant?.id;
      variantName = variant?.name;

      previousStock = variant ? variant.stock : product.stock;
      newStock = previousStock + units;
      if (variant) variant.stock = newStock;
      else product.stock = newStock;

      // Cost variance → update baseCostPrice and recompute selling for
      // margin/brand (manual selling left alone). Skipped when the staff chose
      // to keep the old cost for this line on the Step 4 summary.
      if (row.applyCostUpdate !== false && cost !== product.baseCostPrice) {
        product.baseCostPrice = cost;
        const newSelling = recomputeSellingPrice({
          cost,
          method: product.pricingMethod,
          marginPercent: product.marginPercent,
          brandRuleMargin: resolveBrandRule(product.brand)?.marginPercent,
          fallbackPrice: product.basePrice,
          rounding,
        });
        if (newSelling !== product.basePrice) {
          product.basePrice = newSelling;
          product.priceUpdatedAt = now;
        }
      }
      product.updatedAt = now;
      updatedProductIds.push(productId);
    }

    pendingMovements.push({
      productId,
      productName,
      variantId,
      variantName,
      sku,
      quantity: units,
      previousStock,
      newStock,
    });

    poItems.push({
      productId,
      productName,
      variantId,
      variantName,
      sku,
      quantity: row.qty,
      unitCost: row.unitCost,
      totalCost: Math.round(row.qty * row.unitCost * 100) / 100,
      receivedQuantity: row.qty,
    });
  }

  // Create a new received PO, or receive into the chosen open PO (spec 2.4).
  const linkTarget = linkToPoId
    ? purchaseOrders.find((po) => po.id === linkToPoId)
    : undefined;
  const isLinked =
    !!linkTarget &&
    linkTarget.status !== "received" &&
    linkTarget.status !== "cancelled";

  const po = isLinked
    ? receiveInvoiceIntoPurchaseOrder(linkTarget, {
        items: poItems,
        invoiceNumber,
        invoiceFile,
      })
    : createReceivedPurchaseOrder({
        supplierId: supplierId ?? "",
        supplierName,
        items: poItems,
        invoiceNumber,
        invoiceFile,
      });

  // Now write the movements, referencing the PO.
  pendingMovements.forEach((m, i) => {
    inventoryMovements.push({
      id: `mov-import-${stamp}-${i + 1}`,
      productId: m.productId,
      productName: m.productName,
      variantId: m.variantId,
      variantName: m.variantName,
      sku: m.sku,
      movementType: "purchase",
      quantity: m.quantity,
      previousStock: m.previousStock,
      newStock: m.newStock,
      reason: `Invoice Import — ${invoiceNumber || "N/A"}`,
      referenceId: po.id,
      referenceType: "purchase_order",
      createdBy: "Invoice Import",
      createdAt: nowIso,
    });
  });

  return {
    updatedProductIds,
    newProductIds,
    poId: po.id,
    linkedToExisting: isLinked,
  };
}
