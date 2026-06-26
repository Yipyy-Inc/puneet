// Dunning sequence for overdue subscription invoices.
//
// Implements the Day 1 / 7 / 14 automated email cadence as scheduled, queued,
// IDEMPOTENT jobs keyed off each invoice's due date. There is no job runner or
// backend, so "sent vs pending" is derived purely from how many days an invoice
// is past due relative to `now` — re-deriving always yields the same set, so an
// email can never be double-sent (its job id is the idempotency key).
//
// Source of truth is the platform subscription invoices (facility → Yipyy);
// non-payment of those is what triggers suspension. Because the underlying mock
// due dates are uniform/stale, days-past-due is synthesized deterministically
// from a fixed ladder so all three stages (and the Day-14 suspension flag) are
// represented. Swap the ladder for `now − dueDate` when real dates arrive.

import { buildPlatformInvoices } from "@/data/platform-invoices";
import { getEmailTemplate } from "@/data/email-templates";
import type {
  DunningJob,
  DunningSequence,
  DunningState,
  DunningStep,
  FacilitySuspensionFlag,
} from "@/types/dunning";

export const DUNNING_STEPS: DunningStep[] = [1, 7, 14];

export const STEP_TEMPLATE_ID: Record<DunningStep, string> = {
  1: "tmpl-invoice-overdue-day-1",
  7: "tmpl-invoice-overdue-day-7",
  14: "tmpl-invoice-overdue-day-14",
};

/** Deterministic days-past-due per overdue invoice (covers every stage). */
const DAYS_PAST_DUE_LADDER = [2, 9, 16, 23, 5, 12, 19, 30];

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function templateName(step: DunningStep): string {
  return (
    getEmailTemplate(STEP_TEMPLATE_ID[step])?.name ??
    `Invoice Overdue — Day ${step}`
  );
}

function buildSequence(
  invoice: {
    id: string;
    number: string;
    facilityId: number;
    facilityName: string;
    amount: number;
    currency: string;
  },
  daysPastDue: number,
  now: Date,
): DunningSequence {
  const dueDate = addDays(now, -daysPastDue);

  const jobs: DunningJob[] = DUNNING_STEPS.map((step) => {
    const scheduledAt = isoDate(addDays(dueDate, step));
    const sent = daysPastDue >= step;
    return {
      id: `dun-${invoice.id}-${step}`, // idempotency key
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      facilityId: invoice.facilityId,
      facilityName: invoice.facilityName,
      amount: invoice.amount,
      currency: invoice.currency,
      step,
      templateId: STEP_TEMPLATE_ID[step],
      templateName: templateName(step),
      scheduledAt,
      status: sent ? "sent" : "pending",
      sentAt: sent ? scheduledAt : null,
    };
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    facilityId: invoice.facilityId,
    facilityName: invoice.facilityName,
    amount: invoice.amount,
    currency: invoice.currency,
    dueDate: isoDate(dueDate),
    daysPastDue,
    jobs,
    flaggedForSuspension: daysPastDue >= 14,
    nextJob: jobs.find((j) => j.status === "pending") ?? null,
  };
}

export function buildDunningState(now: Date): DunningState {
  const overdue = buildPlatformInvoices(now).filter(
    (i) => i.status === "Overdue",
  );

  const sequences = overdue.map((inv, index) =>
    buildSequence(
      inv,
      DAYS_PAST_DUE_LADDER[index % DAYS_PAST_DUE_LADDER.length],
      now,
    ),
  );
  // Most urgent first.
  sequences.sort((a, b) => b.daysPastDue - a.daysPastDue);

  const jobs = sequences.flatMap((s) => s.jobs);

  const flags: FacilitySuspensionFlag[] = sequences
    .filter((s) => s.flaggedForSuspension)
    .map((s) => ({
      facilityId: s.facilityId,
      facilityName: s.facilityName,
      invoiceId: s.invoiceId,
      invoiceNumber: s.invoiceNumber,
      amount: s.amount,
      currency: s.currency,
      daysPastDue: s.daysPastDue,
      flaggedAt: isoDate(addDays(new Date(s.dueDate), 14)),
    }));

  return {
    sequences,
    jobs,
    flags,
    summary: {
      overdueCount: sequences.length,
      scheduledCount: jobs.filter((j) => j.status === "pending").length,
      sentCount: jobs.filter((j) => j.status === "sent").length,
      flaggedCount: flags.length,
    },
  };
}

/** Suspension flags only (for the Needs Attention panel). */
export function getSuspensionFlags(now: Date): FacilitySuspensionFlag[] {
  return buildDunningState(now).flags;
}

/** The suspension flag for one facility, or null (for the Facility Profile). */
export function getFacilitySuspensionFlag(
  facilityId: number,
  now: Date,
): FacilitySuspensionFlag | null {
  return (
    buildDunningState(now).flags.find((f) => f.facilityId === facilityId) ??
    null
  );
}
