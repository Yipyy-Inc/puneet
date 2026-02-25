// Retail reporting utilities

import {
  getAllTransactions,
  products,
  type Transaction,
  type Product,
  type ProductVariant,
} from "@/data/retail";

export interface SalesByPeriod {
  date: string;
  sales: number;
  transactions: number;
  items: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

export interface ProfitMarginReport {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  transactions: number;
}

export interface SalesByStaff {
  staffId: string;
  staffName: string;
  transactions: number;
  revenue: number;
  itemsSold: number;
  averageTransaction: number;
}

export interface SalesByCategory {
  category: string;
  revenue: number;
  transactions: number;
  itemsSold: number;
  profit: number;
  profitMargin: number;
}

export interface SalesLinkedToServices {
  serviceType: string;
  revenue: number;
  transactions: number;
  itemsSold: number;
}

/**
 * Get sales by day/week/month
 */
export function getSalesByPeriod(
  period: "day" | "week" | "month",
  startDate?: Date,
  endDate?: Date
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
    a.date.localeCompare(b.date)
  );
}

/**
 * Get top products by revenue or quantity
 */
export function getTopProducts(
  limit: number = 10,
  sortBy: "revenue" | "quantity" = "revenue",
  startDate?: Date,
  endDate?: Date
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
        existing.revenue > 0
          ? (existing.profit / existing.revenue) * 100
          : 0;

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
  endDate?: Date
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
        variant?.costPrice || product?.baseCostPrice || unitPrice * 0.6;
      const cost = unitCost * quantity;

      report.cost += cost;
    });

    report.profit = report.revenue - report.cost;
    report.profitMargin =
      report.revenue > 0 ? (report.profit / report.revenue) * 100 : 0;
  });

  return Array.from(periodMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
}

/**
 * Get sales by staff member (cashier)
 */
export function getSalesByStaff(
  startDate?: Date,
  endDate?: Date
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
    existing.itemsSold += txn.items.reduce((sum, item) => sum + item.quantity, 0);

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
  endDate?: Date
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
  endDate?: Date
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
        0
      );

      serviceMap.set(serviceType, existing);
    }
  });

  return Array.from(serviceMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );
}
