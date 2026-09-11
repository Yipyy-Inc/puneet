/**
 * Barcode generation for products without manufacturer barcodes.
 *
 * Format: YPY-NNNNN
 * - YPY: Yipyy prefix (never conflicts with UPC/EAN manufacturer codes)
 * - NNNNN: 5-digit sequential number, one past the facility's highest
 *
 * The next number comes from the barcodes the caller passes in — the
 * facility's own products. It read the fixture's thirteen products, which
 * decided nothing about any real shelf; the database's unique index on
 * (facility, barcode) is what finally refuses a clash.
 *
 * Uses CODE128 format — alphanumeric, widely compatible with scanners.
 */

export interface GeneratedBarcode {
  code: string;
  format: "CODE128";
  source: "generated";
  generatedAt: string;
}

/**
 * Generate a unique barcode for a facility.
 */
export function generateUniqueBarcode(barcodes: string[]): GeneratedBarcode {
  const prefix = "YPY-";

  // The highest YPY code the facility already has.
  const existing = barcodes
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
  };
}

/**
 * Check if a barcode is system-generated (YPY prefix).
 */
export function isGeneratedBarcode(code: string): boolean {
  return code.startsWith("YPY-");
}
