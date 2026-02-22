/**
 * Automatic Inventory Deduction for Grooming Services
 * 
 * When a grooming appointment is completed, this module automatically
 * deducts the configured products from inventory based on the package used.
 */

import type {
  GroomingAppointment,
  GroomingPackage,
  GroomingProduct,
  ProductUsage,
  ProductUsageLog,
} from "@/data/grooming";
import { groomingPackages, groomingProducts } from "@/data/grooming";

export interface DeductionResult {
  success: boolean;
  deductions: Array<{
    productId: string;
    productName: string;
    quantityDeducted: number;
    remainingStock: number;
    wasLowStock: boolean;
    isNowLowStock: boolean;
  }>;
  errors: Array<{
    productId: string;
    productName: string;
    reason: string;
  }>;
  usageLogs: ProductUsageLog[];
}

/**
 * Deduct products from inventory when a grooming appointment is completed
 */
export function deductProductsForAppointment(
  appointment: GroomingAppointment,
  groomerName: string = "System",
): DeductionResult {
  const result: DeductionResult = {
    success: true,
    deductions: [],
    errors: [],
    usageLogs: [],
  };

  // Find the package used for this appointment
  const packageUsed = groomingPackages.find((pkg) => pkg.id === appointment.packageId);

  if (!packageUsed) {
    result.success = false;
    result.errors.push({
      productId: "",
      productName: "Package",
      reason: `Package ${appointment.packageId} not found`,
    });
    return result;
  }

  // If package has no product usage configured, skip deduction
  if (!packageUsed.productUsage || packageUsed.productUsage.length === 0) {
    return result;
  }

  // Process each product usage
  packageUsed.productUsage.forEach((usage) => {
    const product = groomingProducts.find((p) => p.id === usage.productId);

    if (!product) {
      result.errors.push({
        productId: usage.productId,
        productName: usage.productName,
        reason: "Product not found in inventory",
      });
      result.success = false;
      return;
    }

    // Check if product is active
    if (!product.isActive) {
      result.errors.push({
        productId: usage.productId,
        productName: usage.productName,
        reason: "Product is inactive",
      });
      return;
    }

    // Check if there's enough stock
    const wasLowStock = product.currentStock <= product.minStock;
    const quantityToDeduct = usage.quantity;

    if (product.currentStock < quantityToDeduct) {
      result.errors.push({
        productId: usage.productId,
        productName: usage.productName,
        reason: `Insufficient stock. Available: ${product.currentStock} ${product.unit}, Required: ${quantityToDeduct} ${usage.unit}`,
      });
      result.success = false;
      return;
    }

    // Deduct the product
    const previousStock = product.currentStock;
    product.currentStock = Math.max(0, product.currentStock - quantityToDeduct);
    const remainingStock = product.currentStock;
    const isNowLowStock = remainingStock <= product.minStock;

    // Create usage log entry
    const usageLog: ProductUsageLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      appointmentId: appointment.id,
      quantity: quantityToDeduct,
      usedBy: groomerName,
      usedAt: new Date().toISOString(),
      reason: "grooming",
      notes: `Auto-deducted for ${appointment.petName} (${appointment.packageName})`,
    };

    result.deductions.push({
      productId: product.id,
      productName: product.name,
      quantityDeducted: quantityToDeduct,
      remainingStock,
      wasLowStock,
      isNowLowStock,
    });

    result.usageLogs.push(usageLog);
  });

  return result;
}

/**
 * Check if products are available for a package before booking
 */
export function checkProductAvailability(
  packageId: string,
): {
  available: boolean;
  unavailableProducts: Array<{
    productId: string;
    productName: string;
    available: number;
    required: number;
  }>;
} {
  const packageUsed = groomingPackages.find((pkg) => pkg.id === packageId);

  if (!packageUsed || !packageUsed.productUsage) {
    return { available: true, unavailableProducts: [] };
  }

  const unavailableProducts: Array<{
    productId: string;
    productName: string;
    available: number;
    required: number;
  }> = [];

  packageUsed.productUsage.forEach((usage) => {
    const product = groomingProducts.find((p) => p.id === usage.productId);

    if (!product || !product.isActive) {
      unavailableProducts.push({
        productId: usage.productId,
        productName: usage.productName,
        available: 0,
        required: usage.quantity,
      });
      return;
    }

    if (product.currentStock < usage.quantity) {
      unavailableProducts.push({
        productId: usage.productId,
        productName: usage.productName,
        available: product.currentStock,
        required: usage.quantity,
      });
    }
  });

  return {
    available: unavailableProducts.length === 0,
    unavailableProducts,
  };
}

/**
 * Get product usage summary for a package
 */
export function getPackageProductUsage(packageId: string): ProductUsage[] {
  const packageUsed = groomingPackages.find((pkg) => pkg.id === packageId);
  return packageUsed?.productUsage || [];
}
