// Platform financial report — every value COMPUTED from real entities:
// facility subscriptions + tier fee rates, the derived platform invoices, and
// facility tax config. Deterministic synthesis (seeded stable hash + a fixed
// reference month) fills the gaps the mock data doesn't carry (transaction
// volume, one-off charges, jurisdictions) so server and client agree exactly.

import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { subscriptionTiers } from "@/data/subscription-tiers";
import { buildPlatformInvoices } from "@/data/platform-invoices";
import type { PlatformInvoice } from "@/types/platform-invoices";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const REFERENCE_ISO = "2026-06-24";
const REF_MI = 2026 * 12 + 5; // June 2026

function miLabel(mi: number): string {
  return `${MONTHS[((mi % 12) + 12) % 12]} ${Math.floor(mi / 12)}`;
}
function dateToMI(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return y * 12 + (m - 1);
}
function stableInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}
function monthlyAmount(total: number, cycle: string): number {
  if (cycle === "quarterly") return total / 3;
  if (cycle === "yearly") return total / 12;
  return total;
}

export interface RevenueMonth {
  month: string;
  subscription: number;
  transactionFees: number;
  oneOff: number;
  total: number;
}
export interface AgingBucket {
  bucket: string;
  amount: number;
  count: number;
}
export interface AgingInvoiceRow {
  id: string;
  number: string;
  facility: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  bucket: string;
  status: string;
}
export interface CreditRow {
  id: string;
  facility: string;
  type: "Discount" | "Credit";
  label: string;
  amount: number;
  date: string;
}
export interface FeeMatrix {
  months: string[];
  rows: {
    facility: string;
    tier: string;
    feePercent: number;
    monthly: number[];
    total: number;
  }[];
  monthlyTotals: number[];
  grandTotal: number;
}
export interface TaxRow {
  jurisdiction: string;
  taxName: string;
  ratePercent: number;
  facilities: number;
  taxableBase: number;
  taxCollected: number;
}
export interface FinancialReport {
  revenue: RevenueMonth[];
  revenueTotals: RevenueMonth;
  aging: AgingBucket[];
  agingInvoices: AgingInvoiceRow[];
  outstandingTotal: number;
  credits: CreditRow[];
  creditsTotal: number;
  fees: FeeMatrix;
  tax: TaxRow[];
  taxTotal: number;
  kpis: {
    totalRevenue12mo: number;
    transactionFees12mo: number;
    outstanding: number;
    creditsCost: number;
  };
}

// Tax jurisdictions — the two real facility taxConfigs (Ontario / Quebec)
// anchor the list; the rest are assigned deterministically per facility.
const JURISDICTIONS = [
  { name: "Ontario", taxName: "HST", rate: 0.13 },
  { name: "Quebec", taxName: "GST + QST", rate: 0.14975 },
  { name: "British Columbia", taxName: "GST + PST", rate: 0.12 },
  { name: "Alberta", taxName: "GST", rate: 0.05 },
  { name: "New York", taxName: "Sales Tax", rate: 0.08875 },
  { name: "California", taxName: "Sales Tax", rate: 0.0725 },
  { name: "Texas", taxName: "Sales Tax", rate: 0.0625 },
];
function jurisdictionFor(facilityId: number) {
  if (facilityId === 1) return JURISDICTIONS[0]; // ON (real taxConfig)
  if (facilityId === 11) return JURISDICTIONS[1]; // QC (real taxConfig)
  return JURISDICTIONS[
    stableInt(`juris-${facilityId}`, 0, JURISDICTIONS.length - 1)
  ];
}

const CREDIT_REASONS = [
  "Service credit — outage SLA",
  "Goodwill credit — support delay",
  "Onboarding credit",
  "Migration assistance credit",
];

function round(n: number): number {
  return Math.round(n);
}

export function getFinancialReport(): FinancialReport {
  const subs = facilitySubscriptions;
  const tierFee = new Map<string, number>();
  for (const t of subscriptionTiers)
    tierFee.set(t.id, t.transactionFeePercent ?? 2.5);

  const monthsMI: number[] = [];
  for (let m = REF_MI - 11; m <= REF_MI; m++) monthsMI.push(m);

  // --- Per-facility monthly breakdown (subscription / fee / one-off) ---
  const revenue: RevenueMonth[] = monthsMI.map((mi) => ({
    month: miLabel(mi),
    subscription: 0,
    transactionFees: 0,
    oneOff: 0,
    total: 0,
  }));

  const feeRows: FeeMatrix["rows"] = [];
  const facilityTaxable = new Map<number, number>(); // facilityId -> annual taxable revenue

  for (const sub of subs) {
    const startMI = dateToMI(sub.startDate);
    const feePct = tierFee.get(sub.tierId) ?? 2.5;
    const subMonthly = monthlyAmount(sub.billing.totalCost, sub.billingCycle);
    const reservations = sub.usage?.monthlyReservations ?? 120;
    const avgTicket = stableInt(`ticket-${sub.facilityId}`, 42, 96);

    const monthlyFees: number[] = [];
    let facilityAnnual = 0;

    monthsMI.forEach((mi, idx) => {
      if (startMI > mi) {
        monthlyFees.push(0);
        return;
      }
      const seasonal =
        (85 + stableInt(`seas-${sub.facilityId}-${mi}`, 0, 30)) / 100;
      const gmv = reservations * avgTicket * seasonal;
      const fee = round((gmv * feePct) / 100);

      // One-off: setup fee in the first billed month + occasional overage.
      let oneOff =
        mi === startMI ? stableInt(`setup-${sub.facilityId}`, 99, 399) : 0;
      if (stableInt(`ovg-${sub.facilityId}-${mi}`, 0, 4) === 0) {
        oneOff += stableInt(`ovgamt-${sub.facilityId}-${mi}`, 40, 350);
      }

      revenue[idx].subscription += round(subMonthly);
      revenue[idx].transactionFees += fee;
      revenue[idx].oneOff += oneOff;
      monthlyFees.push(fee);
      facilityAnnual += round(subMonthly) + fee + oneOff;
    });

    feeRows.push({
      facility: sub.facilityName,
      tier: sub.tierName,
      feePercent: feePct,
      monthly: monthlyFees,
      total: monthlyFees.reduce((a, b) => a + b, 0),
    });
    facilityTaxable.set(sub.facilityId, facilityAnnual);
  }

  revenue.forEach((r) => {
    r.total = r.subscription + r.transactionFees + r.oneOff;
  });
  const revenueTotals: RevenueMonth = {
    month: "12-month total",
    subscription: revenue.reduce((a, r) => a + r.subscription, 0),
    transactionFees: revenue.reduce((a, r) => a + r.transactionFees, 0),
    oneOff: revenue.reduce((a, r) => a + r.oneOff, 0),
    total: revenue.reduce((a, r) => a + r.total, 0),
  };

  const feeMonthlyTotals = monthsMI.map((_, idx) =>
    feeRows.reduce((a, r) => a + r.monthly[idx], 0),
  );
  const fees: FeeMatrix = {
    months: monthsMI.map(miLabel),
    rows: feeRows.sort((a, b) => b.total - a.total),
    monthlyTotals: feeMonthlyTotals,
    grandTotal: feeMonthlyTotals.reduce((a, b) => a + b, 0),
  };

  // --- Invoice aging + outstanding invoices (from derived platform invoices) ---
  const invoices: PlatformInvoice[] = buildPlatformInvoices(
    new Date(REFERENCE_ISO),
  );
  const refTime = new Date(REFERENCE_ISO).getTime();
  const bucketDefs = [
    { bucket: "Current", lo: -Infinity, hi: 0 },
    { bucket: "1–30 days", lo: 1, hi: 30 },
    { bucket: "31–60 days", lo: 31, hi: 60 },
    { bucket: "61–90 days", lo: 61, hi: 90 },
    { bucket: "90+ days", lo: 91, hi: Infinity },
  ];
  const aging: AgingBucket[] = bucketDefs.map((b) => ({
    bucket: b.bucket,
    amount: 0,
    count: 0,
  }));
  const agingInvoices: AgingInvoiceRow[] = [];

  for (const inv of invoices) {
    if (inv.status !== "Sent" && inv.status !== "Overdue") continue;
    const daysOverdue = Math.floor(
      (refTime - new Date(inv.dueDate).getTime()) / 86_400_000,
    );
    const bi = bucketDefs.findIndex(
      (b) => daysOverdue >= b.lo && daysOverdue <= b.hi,
    );
    const idx = bi === -1 ? 0 : bi;
    aging[idx].amount += inv.amount;
    aging[idx].count += 1;
    agingInvoices.push({
      id: inv.id,
      number: inv.number,
      facility: inv.facilityName,
      amount: inv.amount,
      dueDate: inv.dueDate,
      daysOverdue: Math.max(0, daysOverdue),
      bucket: bucketDefs[idx].bucket,
      status: inv.status,
    });
  }
  agingInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue);
  const outstandingTotal = aging.reduce((a, b) => a + b.amount, 0);

  // --- Credits & discounts ledger ---
  const credits: CreditRow[] = [];
  for (const inv of invoices) {
    for (const li of inv.lineItems) {
      if (li.kind === "discount" && li.amount < 0) {
        credits.push({
          id: `${inv.id}-${li.id}`,
          facility: inv.facilityName,
          type: "Discount",
          label: li.label,
          amount: Math.abs(li.amount),
          date: inv.issuedDate,
        });
      }
    }
  }
  // Deterministic service credits for a subset of facilities.
  for (const sub of subs) {
    if (stableInt(`credit-${sub.facilityId}`, 0, 3) !== 0) continue;
    const monthMI = REF_MI - stableInt(`creditm-${sub.facilityId}`, 0, 11);
    credits.push({
      id: `cr-${sub.facilityId}`,
      facility: sub.facilityName,
      type: "Credit",
      label:
        CREDIT_REASONS[
          stableInt(`crr-${sub.facilityId}`, 0, CREDIT_REASONS.length - 1)
        ],
      amount: stableInt(`cra-${sub.facilityId}`, 40, 320),
      date: `${Math.floor(monthMI / 12)}-${String((monthMI % 12) + 1).padStart(2, "0")}-15`,
    });
  }
  credits.sort((a, b) => (a.date < b.date ? 1 : -1));
  const creditsTotal = credits.reduce((a, c) => a + c.amount, 0);

  // --- Tax summary by jurisdiction ---
  const taxMap = new Map<
    string,
    { taxName: string; rate: number; facilities: number; base: number }
  >();
  for (const sub of subs) {
    const j = jurisdictionFor(sub.facilityId);
    const base = facilityTaxable.get(sub.facilityId) ?? 0;
    const cur = taxMap.get(j.name) ?? {
      taxName: j.taxName,
      rate: j.rate,
      facilities: 0,
      base: 0,
    };
    cur.facilities += 1;
    cur.base += base;
    taxMap.set(j.name, cur);
  }
  const tax: TaxRow[] = Array.from(taxMap.entries())
    .map(([jurisdiction, v]) => ({
      jurisdiction,
      taxName: v.taxName,
      ratePercent: round(v.rate * 1000) / 10,
      facilities: v.facilities,
      taxableBase: round(v.base),
      taxCollected: round(v.base * v.rate),
    }))
    .sort((a, b) => b.taxCollected - a.taxCollected);
  const taxTotal = tax.reduce((a, t) => a + t.taxCollected, 0);

  return {
    revenue,
    revenueTotals,
    aging,
    agingInvoices,
    outstandingTotal,
    credits,
    creditsTotal,
    fees,
    tax,
    taxTotal,
    kpis: {
      totalRevenue12mo: revenueTotals.total,
      transactionFees12mo: revenueTotals.transactionFees,
      outstanding: outstandingTotal,
      creditsCost: creditsTotal,
    },
  };
}
