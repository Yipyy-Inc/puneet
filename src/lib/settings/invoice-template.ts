import type { InvoiceTemplate } from "@/types/invoice-template";

export { invoiceTemplateSchema } from "@/types/invoice-template";

// ============================================================================
// How a facility's invoices and receipts look.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// `src/data/invoice-template.ts` kept the template in localStorage under
// "yipyy:invoice-template", and the settings page's "Save" wrote only there
// through a mutation that never left the browser. A facility's invoice layout
// was whatever the computer in front of you remembered, and the fallback named
// "Example Pet Care Facility" at "123 Example St" with a fabricated GST number.
//
// ── THE DEFAULT IS A DESIGN, NOT A BUSINESS ───────────────────────────────
//
// Identity — name, address, contact, logo, tax registrations — is read from the
// facility's profile and `tax_config` by `useInvoiceTemplate`, so this default
// carries none of it. What it does carry are design choices a facility may keep
// or change: accent colour, footer, thank-you line, signature block, numbering
// and payment terms.
// ============================================================================

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = {
  facilityName: "",
  taxRegistrations: [],
  invoiceNumberFormat: {
    prefix: "INV",
    yearFormat: "YYYY",
    monthFormat: "MM",
    padding: 4,
    nextNumber: 1,
  },
  paymentTerms: {
    type: "due_on_receipt",
    customText: "",
  },
  accentColor: "#0E3A5C",
  footerText: "",
  signatureEnabled: true,
  signatureLabel: "",
  showThankYou: false,
  thankYouMessage: "",
};
