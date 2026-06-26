"use client";

import { useSyncExternalStore } from "react";

import { creditLedgerSeeds } from "@/data/credit-ledger";
import type { LedgerEntry, LedgerStatus } from "@/types/credit-ledger";

// Live platform credit/discount ledger. Seeded from the deterministic mock data
// and appended to by the Apply Credit / Apply Discount modals. A module store
// (not local state) so applied entries persist while navigating the admin.

const APPLIED_BY = "Puneet"; // the signed-in super admin

const DURATION_MONTHS: Record<string, number | null> = {
  "1 month": 1,
  "3 months": 3,
  "6 months": 6,
  "12 months": 12,
  Forever: null,
};

let entries: LedgerEntry[] = [...creditLedgerSeeds];
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  listeners.forEach((l) => l());
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function applyCredit(input: {
  facilityId: number;
  facilityName: string;
  amount: number;
  reason: string;
  note: string;
}): void {
  const now = new Date();
  entries = [
    {
      id: `cr-${now.getTime()}-${seq++}`,
      facilityId: input.facilityId,
      facilityName: input.facilityName,
      kind: "credit",
      valueType: "fixed",
      amount: input.amount,
      percent: null,
      remaining: input.amount,
      reason: input.reason,
      appliedBy: APPLIED_BY,
      appliedOn: isoDate(now),
      expiry: null,
      duration: null,
      note: input.note,
      currency: "USD",
    },
    ...entries,
  ];
  emit();
}

export function applyDiscount(input: {
  facilityId: number;
  facilityName: string;
  valueType: "percent" | "fixed";
  value: number;
  duration: string;
  reason: string;
  note: string;
}): void {
  const now = new Date();
  const months = DURATION_MONTHS[input.duration] ?? null;
  entries = [
    {
      id: `ds-${now.getTime()}-${seq++}`,
      facilityId: input.facilityId,
      facilityName: input.facilityName,
      kind: "discount",
      valueType: input.valueType,
      amount: input.valueType === "fixed" ? input.value : 0,
      percent: input.valueType === "percent" ? input.value : null,
      remaining: 0,
      reason: input.reason,
      appliedBy: APPLIED_BY,
      appliedOn: isoDate(now),
      expiry: months === null ? null : isoDate(addMonths(now, months)),
      duration: input.duration,
      note: input.note,
      currency: "USD",
    },
    ...entries,
  ];
  emit();
}

export function deriveStatus(entry: LedgerEntry, now: Date): LedgerStatus {
  if (entry.expiry && new Date(`${entry.expiry}T23:59:59`) < now) {
    return "expired";
  }
  return "active";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return entries;
}
function getServerSnapshot() {
  return creditLedgerSeeds;
}

export function useCreditLedger(): LedgerEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
