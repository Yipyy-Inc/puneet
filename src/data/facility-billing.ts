// Builders for the facility profile Billing tab.
//
// The Current Subscription is REAL (from `facilitySubscriptions`). There is no
// platform→facility subscription-invoice or card-on-file dataset, so invoice
// history and the payment method are DERIVED deterministically (a stable hash
// of the facility id) — identities/amounts come from the real subscription;
// only the recency/card digits are synthesized. Swap the `stableInt(...)` calls
// for real records when a billing backend arrives.

import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { subscriptionTiers } from "@/data/subscription-tiers";
import type {
  BillingCredit,
  BillingCycle,
  CurrentSubscription,
  InvoiceStatus,
  PaymentMethodOnFile,
  SubscriptionInvoice,
} from "@/types/facility-billing";

// --- helpers ---------------------------------------------------------------

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function stableInt(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) % (max - min + 1));
}

function cycleMonths(cycle: BillingCycle): number {
  return cycle === "yearly" ? 12 : cycle === "quarterly" ? 3 : 1;
}

function monthlyEquivalent(amount: number, cycle: BillingCycle): number {
  return Math.round(amount / cycleMonths(cycle));
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function findSubscription(facilityId: number) {
  return facilitySubscriptions.find((s) => s.facilityId === facilityId);
}

// --- Current Subscription (real) -------------------------------------------

export function getCurrentSubscription(
  facilityId: number,
): CurrentSubscription | null {
  const sub = findSubscription(facilityId);
  if (!sub) return null;

  const cycle = sub.billingCycle as BillingCycle;
  const tier = subscriptionTiers.find((t) => t.id === sub.tierId);

  return {
    facilityId,
    facilityName: sub.facilityName,
    tierId: sub.tierId,
    planName: tier?.name ?? sub.tierName,
    billingCycle: cycle,
    amount: sub.billing.totalCost,
    monthlyEquivalent: monthlyEquivalent(sub.billing.totalCost, cycle),
    currency: sub.billing.currency,
    status: sub.status,
    startDate: sub.startDate,
    nextRenewalDate: sub.billing.nextBillingDate,
    credits: [],
  };
}

// --- Invoice history (derived) ---------------------------------------------

const INVOICE_COUNT = 12;

export function buildSubscriptionInvoices(
  facilityId: number,
): SubscriptionInvoice[] {
  const sub = findSubscription(facilityId);
  if (!sub) return [];

  const cycle = sub.billingCycle as BillingCycle;
  const months = cycleMonths(cycle);
  const amount = sub.billing.totalCost;
  const currency = sub.billing.currency;
  const next = new Date(sub.billing.nextBillingDate);

  const overdueIndex = stableInt(`overdue-${facilityId}`, 0, 2) === 0 ? 1 : -1;
  const voidIndex =
    stableInt(`void-${facilityId}`, 0, 1) === 0 ? INVOICE_COUNT - 1 : -1;

  const invoices: SubscriptionInvoice[] = [];
  for (let i = 0; i < INVOICE_COUNT; i++) {
    const periodStart = addMonths(next, -months * i);
    const periodEnd = addMonths(periodStart, months);
    const periodLabel =
      months === 1
        ? monthYear(periodStart)
        : `${monthYear(periodStart)} – ${monthYear(addMonths(periodStart, months - 1))}`;

    let status: InvoiceStatus;
    let paidDate: string | null;
    if (i === 0) {
      status = "Draft"; // upcoming period not yet billed
      paidDate = null;
    } else if (i === overdueIndex) {
      status = "Overdue";
      paidDate = null;
    } else if (i === voidIndex) {
      status = "Void";
      paidDate = null;
    } else {
      status = "Paid";
      paidDate = isoDate(addDays(periodStart, stableInt(`paid-${i}`, 1, 6)));
    }

    invoices.push({
      id: `subinv-${facilityId}-${i}`,
      number: `INV-${String(facilityId).padStart(2, "0")}-${String(
        INVOICE_COUNT - i,
      ).padStart(4, "0")}`,
      periodLabel,
      periodStart: isoDate(periodStart),
      periodEnd: isoDate(periodEnd),
      amount,
      currency,
      status,
      issuedDate: isoDate(periodStart),
      paidDate,
    });
  }
  return invoices;
}

// --- Payment method (derived) ----------------------------------------------

const CARD_BRANDS = ["Visa", "Mastercard", "Amex", "Discover"];

export function getPaymentMethod(
  facilityId: number,
): PaymentMethodOnFile | null {
  const sub = findSubscription(facilityId);
  if (!sub) return null;
  const seed = `pm-${facilityId}`;
  return {
    brand: CARD_BRANDS[stableInt(seed, 0, CARD_BRANDS.length - 1)],
    last4: String(stableInt(`${seed}-l4`, 0, 9999)).padStart(4, "0"),
    expMonth: stableInt(`${seed}-m`, 1, 12),
    expYear: 2027 + stableInt(`${seed}-y`, 0, 3),
  };
}

// --- Account credit balance (derived) --------------------------------------

export interface AccountCredit {
  /** Usable account credit applied to the next invoice, in dollars. */
  balance: number;
  currency: string;
  /** Itemized credits + standing discounts shown to the facility. */
  items: BillingCredit[];
}

export function getAccountCredit(facilityId: number): AccountCredit {
  const sub = findSubscription(facilityId);
  if (!sub) return { balance: 0, currency: "USD", items: [] };

  // Deterministic until a real credit ledger exists.
  const balance = stableInt(`credit-${facilityId}`, 25, 150);
  const items: BillingCredit[] = [
    {
      id: `cr-${facilityId}`,
      kind: "credit",
      label: "Referral credit",
      detail: `$${balance}.00`,
    },
    {
      id: `disc-${facilityId}`,
      kind: "discount",
      label: "Annual loyalty discount",
      detail: "10% off",
    },
  ];
  return { balance, currency: sub.billing.currency, items };
}
