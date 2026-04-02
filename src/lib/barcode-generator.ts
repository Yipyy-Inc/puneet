/**
 * Barcode generation for products without manufacturer barcodes.
 *
 * Format: YPY-FFNNNNN
 * - YPY: Yipyy prefix (never conflicts with UPC/EAN manufacturer codes)
 * - FF: 2-digit facility ID (zero-padded)
 * - NNNNN: 5-digit sequential number (supports 99,999 products per facility)
 *
 * Uses CODE128 format — alphanumeric, widely compatible with scanners.
 */

import { products } from "@/data/retail";

export interface GeneratedBarcode {
  code: string;
  format: "CODE128";
  source: "generated";
  generatedAt: string;
  facilityId: number;
}

/**
 * Generate a unique barcode for a facility.
 */
export function generateUniqueBarcode(facilityId: number): GeneratedBarcode {
  const prefix = `YPY-${String(facilityId).padStart(2, "0")}`;

  // Find highest existing YPY code for this facility
  const existing = products
    .map((p) => p.barcode)
    .filter((b): b is string => !!b && b.startsWith(prefix))
    .map((b) => parseInt(b.replace(prefix, ""), 10))
    .filter((n) => !Number.isNaN(n));

  const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  const code = `${prefix}${String(nextNum).padStart(5, "0")}`;

  return {
    code,
    format: "CODE128",
    source: "generated",
    generatedAt: new Date().toISOString(),
    facilityId,
  };
}

/**
 * Validate a barcode doesn't conflict with existing products.
 */
export function validateBarcodeUnique(code: string): {
  unique: boolean;
  conflictProduct?: string;
} {
  for (const product of products) {
    if (product.barcode === code) {
      return { unique: false, conflictProduct: product.name };
    }
    for (const variant of product.variants ?? []) {
      if (variant.barcode === code) {
        return {
          unique: false,
          conflictProduct: `${product.name} — ${variant.name}`,
        };
      }
    }
  }
  return { unique: true };
}

/**
 * Check if a barcode is system-generated (YPY prefix).
 */
export function isGeneratedBarcode(code: string): boolean {
  return code.startsWith("YPY-");
}
