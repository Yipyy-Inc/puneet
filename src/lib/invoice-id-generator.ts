/**
 * Sequential numeric invoice ID generator.
 *
 * Starts at 10001 (5 digits). Auto-expands to 6, 7, etc. when exhausted.
 * Pure numbers — no prefixes, no letters, no dashes.
 * Display with # prefix: #10001
 */

let lastInvoiceNumber = 10000;

/**
 * Initialize the counter from existing invoice data.
 */
export function initFromExisting(ids: string[]) {
  for (const id of ids) {
    const num = parseInt(id, 10);
    if (!Number.isNaN(num) && num > lastInvoiceNumber) {
      lastInvoiceNumber = num;
    }
  }
}

/**
 * Get the next sequential invoice ID.
 */
export function getNextInvoiceId(): string {
  lastInvoiceNumber += 1;
  return String(lastInvoiceNumber);
}

/**
 * Format an invoice ID for display (adds # prefix).
 */
export function formatInvoiceId(id: string): string {
  return `#${id}`;
}
