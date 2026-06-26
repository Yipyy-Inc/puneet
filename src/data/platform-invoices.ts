// Platform-level subscription invoices for the super-admin Invoices module.
//
// There is no billing backend, so invoices are DERIVED deterministically from
// the real `facilitySubscriptions` (plan, base cost, enabled module add-ons,
// billing cycle). A stable hash of (facilityId, period) fixes each invoice's
// status so the five tabs, the KPI tiles and the auto-send window are all
// populated relative to `now`. Swap `buildPlatformInvoices` for real records
// when a billing backend arrives.

import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { modules } from "@/data/modules";
import { subscriptionTiers } from "@/data/subscription-tiers";
import type { BillingCycle } from "@/types/facility-billing";
import type {
  InvoiceLineItem,
  InvoicePayment,
  PaymentMethod,
  PlatformInvoice,
  PlatformInvoiceStatus,
} from "@/types/platform-invoices";

const TAX_RATE = 0.08;
const PERIODS_BACK = 4; // current cycle + 3 history months

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

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function firstOfMonth(date: Date, monthOffset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function moduleName(moduleId: string): string {
  return modules.find((m) => m.id === moduleId)?.name ?? moduleId;
}

const PAYMENT_METHODS: PaymentMethod[] = ["Credit Card", "Bank Transfer"];

// --- line items ------------------------------------------------------------

function buildLineItems(
  facilityId: number,
  baseMonthly: number,
  addOns: { label: string; amount: number }[],
  planName: string,
): { items: InvoiceLineItem[]; total: number } {
  const items: InvoiceLineItem[] = [
    {
      id: `li-${facilityId}-sub`,
      label: `${planName} subscription`,
      kind: "subscription",
      amount: baseMonthly,
    },
    ...addOns.map((a, idx) => ({
      id: `li-${facilityId}-addon-${idx}`,
      label: a.label,
      kind: "addon" as const,
      amount: a.amount,
    })),
  ];

  const subtotal = items.reduce((s, i) => s + i.amount, 0);

  // A deterministic subset of facilities carries a loyalty discount.
  const hasDiscount = stableInt(`disc-${facilityId}`, 0, 4) === 0;
  const discount = hasDiscount ? -Math.round(subtotal * 0.1) : 0;
  if (discount !== 0) {
    items.push({
      id: `li-${facilityId}-disc`,
      label: "Loyalty discount (10%)",
      kind: "discount",
      amount: discount,
    });
  }

  const tax = Math.round((subtotal + discount) * TAX_RATE);
  items.push({
    id: `li-${facilityId}-tax`,
    label: `Tax (${Math.round(TAX_RATE * 100)}%)`,
    kind: "tax",
    amount: tax,
  });

  return { items, total: subtotal + discount + tax };
}

// --- main builder ----------------------------------------------------------

export function buildPlatformInvoices(now: Date): PlatformInvoice[] {
  const invoices: PlatformInvoice[] = [];

  facilitySubscriptions.forEach((sub, fIndex) => {
    const cycle = sub.billingCycle as BillingCycle;
    const tier = subscriptionTiers.find((t) => t.id === sub.tierId);
    const planName = tier?.name ?? sub.tierName;
    const currency = sub.billing.currency;

    const baseMonthly = monthlyEquivalent(sub.billing.baseCost, cycle);
    const addOns = sub.billing.moduleCosts.map((mc) => ({
      label: moduleName(mc.moduleId),
      amount: monthlyEquivalent(mc.cost, cycle),
    }));
    const { items, total } = buildLineItems(
      sub.facilityId,
      baseMonthly,
      addOns,
      planName,
    );

    for (let i = 0; i < PERIODS_BACK; i++) {
      const periodMonth = firstOfMonth(now, -i);
      const dueDate = isoDate(firstOfMonth(now, -i + 1));
      let status: PlatformInvoiceStatus;
      let issuedDate: string;
      let paidDate: string | null = null;
      let autoSendAt: string | null = null;

      if (i === 0) {
        // Current cycle: freshly auto-generated batch. Index-based so the
        // Draft / Sent / Paid statuses are guaranteed to all appear.
        const roll = fIndex % 3;
        if (roll === 0) {
          status = "Draft";
          issuedDate = isoDate(now);
          autoSendAt = isoDate(addDays(now, 1));
        } else if (roll === 1) {
          status = "Sent";
          issuedDate = isoDate(addDays(now, -3));
        } else {
          status = "Paid";
          issuedDate = isoDate(addDays(now, -5));
          paidDate = isoDate(addDays(now, -2));
        }
      } else if (i === 1) {
        const roll = stableInt(`m1-${sub.facilityId}`, 0, 3);
        issuedDate = isoDate(periodMonth);
        if (roll === 0) {
          status = "Overdue"; // due first-of-this-month, now past
        } else if (roll === 3) {
          status = "Void";
        } else {
          status = "Paid";
          paidDate = isoDate(addDays(periodMonth, stableInt(`p1-${i}`, 3, 9)));
        }
      } else {
        const roll = stableInt(`m${i}-${sub.facilityId}`, 0, 6);
        issuedDate = isoDate(periodMonth);
        if (roll === 0) {
          status = "Void";
        } else {
          status = "Paid";
          paidDate = isoDate(addDays(periodMonth, stableInt(`p${i}`, 3, 9)));
        }
      }

      const payments: InvoicePayment[] =
        status === "Paid" && paidDate
          ? [
              {
                id: `pay-${sub.facilityId}-${i}`,
                date: paidDate,
                amount: total,
                method:
                  PAYMENT_METHODS[stableInt(`pm-${sub.facilityId}-${i}`, 0, 1)],
                reference: `TXN-${hashSeed(`ref-${sub.facilityId}-${i}`)
                  .toString(36)
                  .toUpperCase()
                  .slice(0, 8)}`,
              },
            ]
          : [];

      invoices.push({
        id: `inv-${sub.facilityId}-${i}`,
        number: `INV-${periodMonth.getFullYear()}${String(
          periodMonth.getMonth() + 1,
        ).padStart(2, "0")}-${String(sub.facilityId).padStart(2, "0")}`,
        facilityId: sub.facilityId,
        facilityName: sub.facilityName,
        planName,
        billingCycle: cycle,
        amount: total,
        currency,
        status,
        issuedDate,
        dueDate,
        paidDate,
        autoSendAt,
        periodLabel: monthYear(periodMonth),
        lineItems: items,
        payments,
      });
    }
  });

  // Newest invoices first.
  return invoices.sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
}

/** Build a single fresh Draft invoice for a facility (used by Create Invoice). */
export function buildDraftInvoiceForFacility(
  facilityId: number,
  now: Date,
  idSuffix: string,
): PlatformInvoice | null {
  const sub = facilitySubscriptions.find((s) => s.facilityId === facilityId);
  if (!sub) return null;

  const cycle = sub.billingCycle as BillingCycle;
  const tier = subscriptionTiers.find((t) => t.id === sub.tierId);
  const planName = tier?.name ?? sub.tierName;
  const baseMonthly = monthlyEquivalent(sub.billing.baseCost, cycle);
  const addOns = sub.billing.moduleCosts.map((mc) => ({
    label: moduleName(mc.moduleId),
    amount: monthlyEquivalent(mc.cost, cycle),
  }));
  const { items, total } = buildLineItems(
    facilityId,
    baseMonthly,
    addOns,
    planName,
  );
  const periodMonth = firstOfMonth(now, 0);

  return {
    id: `inv-manual-${facilityId}-${idSuffix}`,
    number: `INV-${periodMonth.getFullYear()}${String(
      periodMonth.getMonth() + 1,
    ).padStart(2, "0")}-${String(facilityId).padStart(2, "0")}D`,
    facilityId,
    facilityName: sub.facilityName,
    planName,
    billingCycle: cycle,
    amount: total,
    currency: sub.billing.currency,
    status: "Draft",
    issuedDate: isoDate(now),
    dueDate: isoDate(firstOfMonth(now, 1)),
    paidDate: null,
    autoSendAt: isoDate(addDays(now, 1)),
    periodLabel: monthYear(periodMonth),
    lineItems: items,
    payments: [],
  };
}
