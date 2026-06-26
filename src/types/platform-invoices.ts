// View-model types for the platform (super-admin) Invoices module.

import type { BillingCycle } from "@/types/facility-billing";

export type PlatformInvoiceStatus =
  | "Paid"
  | "Sent"
  | "Overdue"
  | "Draft"
  | "Void";

export type PaymentMethod =
  | "Bank Transfer"
  | "Cash"
  | "Check"
  | "Other"
  | "Credit Card";

export type LineItemKind = "subscription" | "addon" | "tax" | "discount";

export interface InvoiceLineItem {
  id: string;
  label: string;
  kind: LineItemKind;
  amount: number; // discounts are negative
}

export interface InvoicePayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export interface PlatformInvoice {
  id: string;
  number: string;
  facilityId: number;
  facilityName: string;
  planName: string;
  billingCycle: BillingCycle;
  amount: number; // grand total of line items
  currency: string;
  status: PlatformInvoiceStatus;
  issuedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paidDate: string | null; // YYYY-MM-DD
  /** When an unreviewed Draft will be auto-sent (Draft only). */
  autoSendAt: string | null; // YYYY-MM-DD
  periodLabel: string;
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
}
