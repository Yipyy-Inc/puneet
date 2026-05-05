import { z } from "zod";

export const invoiceTemplateSchema = z.object({
  logoUrl: z.string().optional(),
  facilityName: z.string(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  taxNumbers: z.string().optional(),
  accentColor: z.string(),
  footerText: z.string(),
  signatureEnabled: z.boolean(),
  signatureLabel: z.string(),
  showThankYou: z.boolean(),
  thankYouMessage: z.string(),
});

export type InvoiceTemplate = z.infer<typeof invoiceTemplateSchema>;
