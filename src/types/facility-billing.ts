// View-model types for the facility profile Billing tab.

export type InvoiceStatus = "Paid" | "Overdue" | "Draft" | "Void";

export type BillingCycle = "monthly" | "quarterly" | "yearly";

export interface SubscriptionInvoice {
  id: string;
  number: string;
  periodLabel: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedDate: string; // YYYY-MM-DD
  paidDate: string | null; // YYYY-MM-DD
}

export interface PaymentMethodOnFile {
  brand: string; // "Visa" | "Mastercard" | "Amex" | "Discover"
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface BillingCredit {
  id: string;
  kind: "credit" | "discount";
  label: string;
  detail: string; // e.g. "$50.00" or "10% off"
}

export interface CurrentSubscription {
  facilityId: number;
  facilityName: string;
  tierId: string;
  planName: string;
  billingCycle: BillingCycle;
  /** Amount charged per billing cycle. */
  amount: number;
  /** Amount normalized to a monthly figure. */
  monthlyEquivalent: number;
  currency: string;
  status: string; // active | trial | suspended | cancelled | expired | paused
  startDate: string;
  nextRenewalDate: string;
  credits: BillingCredit[];
}
