// Retail reporting utilities

import {
  getAllTransactions,
  products,
  getInventoryValue,
  getLowStockProducts,
  type Product,
  type ProductVariant,
} from "@/data/retail";
import type {
  SalesByPeriod,
  TopProduct,
  ProfitMarginReport,
  SalesByStaff,
  SalesByCategory,
  SalesLinkedToServices,
} from "@/types/retail";

export type {
  SalesByPeriod,
  TopProduct,
  ProfitMarginReport,
  SalesByStaff,
  SalesByCategory,
  SalesLinkedToServices,
};

/**
 * Get sales by day/week/month
 */
export function getSalesByPeriod(
  period: "day" | "week" | "month",
  startDate?: Date,
  endDate?: Date,
): SalesByPeriod[] {
  const transactions = getAllTransactions();
  const now = new Date();
  const end = endDate || now;
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = transactions.filter((txn) => {
    const txnDate = new Date(txn.createdAt);
    return txnDate >= start && txnDate <= end && txn.status === "completed";
  });

  const grouped = new Map<string, SalesByPeriod>();

  filtered.forEach((txn) => {
    const date = new Date(txn.createdAt);
    let key: string;

    if (period === "day") {
      key = date.toISOString().split("T")[0];
    } else if (period === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    const existing = grouped.get(key) || {
      date: key,
      sales: 0,
      transactions: 0,
      items: 0,
    };

    existing.sales += txn.total || 0;
    existing.transactions += 1;
    existing.items += txn.items.reduce((sum, item) => sum + item.quantity, 0);

    grouped.set(key, existing);
  });

  return Array.from(grouped.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Get top products by revenue or quantity
 */
export function getTopProducts(
  limit: number = 10,
  sortBy: "revenue" | "quantity" = "revenue",
  startDate?: Date,
  endDate?: Date,
): TopProduct[] {
  const transactions = getAllTransactions();
  const now = new Date();
  const end = endDate || now;
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = transactions.filter((txn) => {
    const txnDate = new Date(txn.createdAt);
    return txnDate >= start && txnDate <= end && txn.status === "completed";
  });

  const productMap = new Map<string, TopProduct>();

  filtered.forEach((txn) => {
    txn.items.forEach((item) => {
      // Skip non-product items
      if (item.itemType !== "product" || !item.productId) {
        return;
      }

      const key = item.variantId
        ? `${item.productId}-${item.variantId}`
        : item.productId;

      const existing = productMap.get(key) || {
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        sku: item.sku,
        quantitySold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        profitMargin: 0,
      };

      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      const discount = item.discount || 0;
      const discountType = item.discountType || "fixed";
      const discountAmount =
        discountType === "percent"
          ? (unitPrice * quantity * discount) / 100
          : discount * quantity;
      const revenue = unitPrice * quantity - discountAmount;

      // Find product/variant to get cost
      let product: Product | undefined;
      let variant: ProductVariant | undefined;
      if (item.variantId) {
        product = products.find((p) => p.id === item.productId);
        variant = product?.variants.find((v) => v.id === item.variantId);
      } else {
        product = products.find((p) => p.id === item.productId);
      }

      const unitCost =
        variant?.costPrice || product?.baseCostPrice || unitPrice * 0.6; // Default 60% if cost not found
      const cost = unitCost * quantity;

      existing.quantitySold += quantity;
      existing.revenue += revenue;
      existing.cost += cost;
      existing.profit = existing.revenue - existing.cost;
      existing.profitMargin =
        existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;

      productMap.set(key, existing);
    });
  });

  const sorted = Array.from(productMap.values()).sort((a, b) => {
    if (sortBy === "revenue") {
      return b.revenue - a.revenue;
    }
    return b.quantitySold - a.quantitySold;
  });

  return sorted.slice(0, limit);
}

/**
 * Get profit margin report by period
 */
export function getProfitMarginReport(
  period: "day" | "week" | "month",
  startDate?: Date,
  endDate?: Date,
): ProfitMarginReport[] {
  const salesData = getSalesByPeriod(period, startDate, endDate);
  const transactions = getAllTransactions();
  const now = new Date();
  const end = endDate || now;
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = transactions.filter((txn) => {
    const txnDate = new Date(txn.createdAt);
    return txnDate >= start && txnDate <= end && txn.status === "completed";
  });

  const periodMap = new Map<string, ProfitMarginReport>();

  salesData.forEach((sales) => {
    periodMap.set(sales.date, {
      period: sales.date,
      revenue: sales.sales,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      transactions: sales.transactions,
    });
  });

  filtered.forEach((txn) => {
    const date = new Date(txn.createdAt);
    let key: string;

    if (period === "day") {
      key = date.toISOString().split("T")[0];
    } else if (period === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    const report = periodMap.get(key);
    if (!report) return;

    txn.items.forEach((item) => {
      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      // Find product/variant to get cost
      let product: Product | undefined;
      let variant: ProductVariant | undefined;
      if (item.variantId) {
        product = products.find((p) => p.id === item.productId);
        variant = product?.variants.find((v) => v.id === item.variantId);
      } else {
        product = products.find((p) => p.id === item.productId);
      }

      const unitCost =
        variant?.costPrice || product?.baseCostPrice || unitPrice * 0.6;
      const cost = unitCost * quantity;

      report.cost += cost;
    });

    report.profit = report.revenue - report.cost;
    report.profitMargin =
      report.revenue > 0 ? (report.profit / report.revenue) * 100 : 0;
  });

  return Array.from(periodMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );
}

/**
 * Get sales by staff member (cashier)
 */
export function getSalesByStaff(
  startDate?: Date,
  endDate?: Date,
): SalesByStaff[] {
  const transactions = getAllTransactions();
  const now = new Date();
  const end = endDate || now;
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = transactions.filter((txn) => {
    const txnDate = new Date(txn.createdAt);
    return txnDate >= start && txnDate <= end && txn.status === "completed";
  });

  const staffMap = new Map<string, SalesByStaff>();

  filtered.forEach((txn) => {
    const staffId = txn.cashierId || "unknown";
    const staffName = txn.cashierName || "Unknown Staff";

    const existing = staffMap.get(staffId) || {
      staffId,
      staffName,
      transactions: 0,
      revenue: 0,
      itemsSold: 0,
      averageTransaction: 0,
    };

    existing.transactions += 1;
    existing.revenue += txn.total || 0;
    existing.itemsSold += txn.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    staffMap.set(staffId, existing);
  });

  return Array.from(staffMap.values())
    .map((staff) => ({
      ...staff,
      averageTransaction:
        staff.transactions > 0 ? staff.revenue / staff.transactions : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Get sales by category
 */
export function getSalesByCategory(
  startDate?: Date,
  endDate?: Date,
): SalesByCategory[] {
  const transactions = getAllTransactions();
  const now = new Date();
  const end = endDate || now;
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = transactions.filter((txn) => {
    const txnDate = new Date(txn.createdAt);
    return txnDate >= start && txnDate <= end && txn.status === "completed";
  });

  const categoryMap = new Map<string, SalesByCategory>();

  filtered.forEach((txn) => {
    txn.items.forEach((item) => {
      // Find product to get category
      const product = products.find((p) => p.id === item.productId);
      const category = product?.category || "Uncategorized";

      const existing = categoryMap.get(category) || {
        category,
        revenue: 0,
        transactions: 0,
        itemsSold: 0,
        profit: 0,
        profitMargin: 0,
      };

      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      const discount = item.discount || 0;
      const discountType = item.discountType || "fixed";
      const discountAmount =
        discountType === "percent"
          ? (unitPrice * quantity * discount) / 100
          : discount * quantity;
      const revenue = unitPrice * quantity - discountAmount;

      // Find product/variant to get cost
      let productData: Product | undefined;
      let variant: ProductVariant | undefined;
      if (item.variantId) {
        productData = products.find((p) => p.id === item.productId);
        variant = productData?.variants.find((v) => v.id === item.variantId);
      } else {
        productData = products.find((p) => p.id === item.productId);
      }

      const unitCost =
        variant?.costPrice || productData?.baseCostPrice || unitPrice * 0.6;
      const cost = unitCost * quantity;

      existing.revenue += revenue;
      existing.itemsSold += quantity;
      existing.profit += revenue - cost;

      categoryMap.set(category, existing);
    });
  });

  return Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      profitMargin: cat.revenue > 0 ? (cat.profit / cat.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Get sales linked to services (grooming add-ons, etc.)
 */
export function getSalesLinkedToServices(
  startDate?: Date,
  endDate?: Date,
): SalesLinkedToServices[] {
  const transactions = getAllTransactions();
  const now = new Date();
  const end = endDate || now;
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = transactions.filter((txn) => {
    const txnDate = new Date(txn.createdAt);
    return txnDate >= start && txnDate <= end && txn.status === "completed";
  });

  const serviceMap = new Map<string, SalesLinkedToServices>();

  filtered.forEach((txn) => {
    // Check if transaction is linked to a service
    if (txn.bookingId && txn.bookingService) {
      const serviceType = txn.bookingService;

      const existing = serviceMap.get(serviceType) || {
        serviceType,
        revenue: 0,
        transactions: 0,
        itemsSold: 0,
      };

      existing.revenue += txn.total || 0;
      existing.transactions += 1;
      existing.itemsSold += txn.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      serviceMap.set(serviceType, existing);
    }
  });

  return Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);
}

// ── Inventory value / low-stock summary ─────────────────────────────────────

const roundCents = (n: number) => Math.round(n * 100) / 100;

export interface LowStockItem {
  name: string;
  sku: string;
  stock: number;
  minStock: number;
}

export interface InventorySummary {
  /** Stock valued at cost (Σ stock × costPrice). */
  costValue: number;
  /** Stock valued at retail price (Σ stock × price). */
  retailValue: number;
  /** retailValue − costValue. */
  potentialProfit: number;
  totalUnits: number;
  skuCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStock: LowStockItem[];
}

/**
 * Current inventory valuation + low-stock summary, derived from the product
 * catalog (products + variants). Reuses getInventoryValue/getLowStockProducts.
 */
export function getInventorySummary(): InventorySummary {
  const { cost, retail } = getInventoryValue();

  let totalUnits = 0;
  let skuCount = 0;
  let outOfStock = 0;
  for (const p of products) {
    const units = p.hasVariants ? p.variants : [p];
    for (const u of units) {
      totalUnits += u.stock;
      skuCount += 1;
      if (u.stock <= 0) outOfStock += 1;
    }
  }

  const lowStock: LowStockItem[] = getLowStockProducts()
    .map((it) => ({
      name: it.name,
      sku: it.sku,
      stock: it.stock,
      minStock: it.minStock,
    }))
    .sort((a, b) => a.stock - b.stock);

  return {
    costValue: roundCents(cost),
    retailValue: roundCents(retail),
    potentialProfit: roundCents(retail - cost),
    totalUnits,
    skuCount,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock,
    lowStock,
  };
}

// ── Retail add-on attach rate ───────────────────────────────────────────────

export interface ServiceAttachRate {
  serviceType: string;
  /** Transactions linked to this service. */
  serviceTransactions: number;
  /** …of which also sold a retail product. */
  withRetailAddOn: number;
  /** withRetailAddOn / serviceTransactions × 100. */
  attachRate: number;
  /** Product revenue attached to this service. */
  addOnRevenue: number;
}

export interface ServiceAttachSummary {
  serviceTransactions: number;
  withRetailAddOn: number;
  attachRate: number;
  addOnRevenue: number;
  byService: ServiceAttachRate[];
}

/**
 * Add-on attach rate: of completed transactions linked to a service
 * (bookingService set), the share that also sold a retail product line item,
 * overall and per service. Derived purely from getAllTransactions() line items.
 */
export function getServiceAttachRate(
  startDate?: Date,
  endDate?: Date,
): ServiceAttachSummary {
  const transactions = getAllTransactions();
  const now = new Date();
  const end = endDate || now;
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const linked = transactions.filter((txn) => {
    const d = new Date(txn.createdAt);
    return (
      txn.status === "completed" &&
      d >= start &&
      d <= end &&
      !!txn.bookingService
    );
  });

  const map = new Map<
    string,
    {
      serviceTransactions: number;
      withRetailAddOn: number;
      addOnRevenue: number;
    }
  >();
  let totalSvc = 0;
  let totalAttached = 0;
  let totalAddOnRevenue = 0;

  for (const txn of linked) {
    const svc = txn.bookingService as string;
    const productItems = txn.items.filter((i) => i.itemType === "product");
    const hasAddOn = productItems.length > 0;
    const addOnRevenue = productItems.reduce((s, i) => s + (i.total ?? 0), 0);

    const e = map.get(svc) ?? {
      serviceTransactions: 0,
      withRetailAddOn: 0,
      addOnRevenue: 0,
    };
    e.serviceTransactions += 1;
    if (hasAddOn) {
      e.withRetailAddOn += 1;
      e.addOnRevenue += addOnRevenue;
    }
    map.set(svc, e);

    totalSvc += 1;
    if (hasAddOn) {
      totalAttached += 1;
      totalAddOnRevenue += addOnRevenue;
    }
  }

  const byService: ServiceAttachRate[] = [...map.entries()]
    .map(([serviceType, e]) => ({
      serviceType,
      serviceTransactions: e.serviceTransactions,
      withRetailAddOn: e.withRetailAddOn,
      attachRate:
        e.serviceTransactions > 0
          ? roundCents((e.withRetailAddOn / e.serviceTransactions) * 100)
          : 0,
      addOnRevenue: roundCents(e.addOnRevenue),
    }))
    .sort((a, b) => b.serviceTransactions - a.serviceTransactions);

  return {
    serviceTransactions: totalSvc,
    withRetailAddOn: totalAttached,
    attachRate: totalSvc > 0 ? roundCents((totalAttached / totalSvc) * 100) : 0,
    addOnRevenue: roundCents(totalAddOnRevenue),
    byService,
  };
}
