import { z } from "zod";

/** A single configurable tax/registration number shown on invoices. */
export const taxRegistrationSchema = z.object({
  id: z.string(),
  /** Free-text label, e.g. "GST/HST Number", "PST Number", "VAT Number". */
  label: z.string(),
  value: z.string(),
});

export type TaxRegistration = z.infer<typeof taxRegistrationSchema>;

/** Configurable invoice-number pattern, e.g. INV-2026-06-0001. */
export const invoiceNumberFormatSchema = z.object({
  /** Leading text, e.g. "INV". */
  prefix: z.string(),
  /** How (if at all) the year appears. */
  yearFormat: z.enum(["none", "YYYY", "YY"]),
  /** How (if at all) the month appears. */
  monthFormat: z.enum(["none", "MM"]),
  /** Zero-padded width of the sequential counter (e.g. 4 → 0001). */
  padding: z.number().int().min(1).max(10),
  /** Next value the sequential counter will use. */
  nextNumber: z.number().int().min(0),
});

export type InvoiceNumberFormat = z.infer<typeof invoiceNumberFormatSchema>;

/** When payment is due — shown on the invoice to set customer expectations. */
export const invoicePaymentTermsSchema = z.object({
  type: z.enum(["due_on_receipt", "net_7", "net_14", "net_30", "custom"]),
  /** Free text shown when type is "custom". */
  customText: z.string(),
});

export type InvoicePaymentTerms = z.infer<typeof invoicePaymentTermsSchema>;

export const invoiceTemplateSchema = z.object({
  logoUrl: z.string().optional(),
  facilityName: z.string(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  /** Configurable list of tax/registration numbers (replaces the old
   *  Quebec-specific single GST/QST string). */
  taxRegistrations: z.array(taxRegistrationSchema).default([]),
  invoiceNumberFormat: invoiceNumberFormatSchema.default({
    prefix: "INV",
    yearFormat: "YYYY",
    monthFormat: "MM",
    padding: 4,
    nextNumber: 1,
  }),
  paymentTerms: invoicePaymentTermsSchema.default({
    type: "due_on_receipt",
    customText: "",
  }),
  accentColor: z.string(),
  footerText: z.string(),
  signatureEnabled: z.boolean(),
  signatureLabel: z.string(),
  showThankYou: z.boolean(),
  thankYouMessage: z.string(),
});

export type InvoiceTemplate = z.infer<typeof invoiceTemplateSchema>;
