/**
 * Supplier-invoice extraction seam (spec 2.3).
 *
 * MOCK: {@link extractInvoice} simulates a document-AI call — it waits, then
 * returns a canned structured result. The return shape mirrors the spec's
 * header (Table 2) + line-item (Table 3) fields so a real service can drop in
 * behind the same signature.
 *
 * TODO: wire real document-AI service (AWS Textract / Google Document AI / Azure).
 */

/** Invoice header fields (spec Table 2). Everything is optional — OCR may miss. */
export interface ExtractedInvoiceHeader {
  supplierName?: string;
  invoiceNumber?: string;
  /** ISO date string (YYYY-MM-DD). */
  invoiceDate?: string;
  /** Purchase-order reference printed on the invoice, if any. */
  poNumber?: string;
  /** ISO 4217 code, e.g. "USD" / "CAD". */
  currency?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  total?: number;
  /** 0–1 overall extraction confidence from the service. */
  confidence?: number;
}

/** One extracted invoice line (spec Table 3). */
export interface ExtractedLineItem {
  /** Raw OCR text for the row — kept for auditing / re-matching. */
  rawText?: string;
  description: string;
  /** Supplier SKU / item code as printed. */
  sku?: string;
  barcode?: string;
  quantity?: number;
  /** Packaging unit as printed (each, case, box, bag, pack…). */
  unit?: string;
  /** Units contained per package (e.g. a case of 12). */
  itemsPerUnit?: number;
  unitCost?: number;
  lineTotal?: number;
  /** 0–1 per-line extraction confidence. */
  confidence?: number;
}

export interface ExtractedInvoice {
  header: ExtractedInvoiceHeader;
  lineItems: ExtractedLineItem[];
}

export interface ExtractInvoiceOptions {
  /** Dev-only: force the "unreadable" failure path. */
  simulateFailure?: boolean;
}

/** Thrown when extraction can't read the document (real or simulated). */
export class InvoiceExtractionError extends Error {
  constructor(message = "Could not read the invoice.") {
    super(message);
    this.name = "InvoiceExtractionError";
  }
}

// How long the mock "reads" the invoice. The user-facing copy says 10–20s; the
// mock resolves faster so the flow stays usable in the prototype.
const SIMULATED_DELAY_MS = 1600;

// Canned result — a plausible supplier invoice. Deterministic (no Date/random).
const CANNED_RESULT: ExtractedInvoice = {
  header: {
    // Deliberately a fuzzy variant of the seeded "PetSupply Wholesale" to
    // exercise name matching (different spacing + "Co." suffix).
    supplierName: "Pet Supply Wholesale Co.",
    invoiceNumber: "INV-88213",
    invoiceDate: "2026-07-16",
    poNumber: "PO-2024-002",
    currency: "USD",
    subtotal: 452.0,
    tax: 0,
    shipping: 25.0,
    total: 477.0,
    confidence: 0.94,
  },
  lineItems: [
    {
      rawText: "PREMIUM DOG FOOD 15LB  x10  @ 35.00",
      description: "Premium Dog Food — 15 lb Bag",
      sku: "PDF-001-15LB",
      quantity: 10,
      unit: "bag",
      unitCost: 35.0,
      lineTotal: 350.0,
      confidence: 0.96,
    },
    {
      rawText: "INTERACTIVE PUZZLE TOY MED  x6  @ 14.00",
      description: "Interactive Puzzle Toy — Medium",
      sku: "IPT-002-M",
      quantity: 6,
      unit: "each",
      unitCost: 14.0,
      lineTotal: 84.0,
      confidence: 0.91,
    },
    {
      rawText: "NATURAL DOG SHAMPOO  x2  @ 9.00",
      description: "Natural Dog Shampoo",
      sku: "NDS-004",
      quantity: 2,
      unit: "bottle",
      unitCost: 9.0,
      lineTotal: 18.0,
      confidence: 0.72,
    },
  ],
};

/**
 * Extract structured data from a supplier invoice file. MOCK — simulates the
 * latency of a document-AI call and returns {@link CANNED_RESULT}. Rejects with
 * an {@link InvoiceExtractionError} when `options.simulateFailure` is set (the
 * dev "unreadable" path).
 */
export async function extractInvoice(
  file: File,
  options: ExtractInvoiceOptions = {},
): Promise<ExtractedInvoice> {
  if (!file) throw new InvoiceExtractionError("No file was provided.");

  // TODO: wire real document-AI service (AWS Textract / Google Document AI /
  // Azure). Replace the delay + canned result below with the real API call,
  // passing `file` as the document input and mapping the response onto
  // ExtractedInvoiceHeader + ExtractedLineItem[].
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));

  if (options.simulateFailure) {
    throw new InvoiceExtractionError();
  }

  return CANNED_RESULT;
}
