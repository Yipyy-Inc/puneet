"use client";

import { useSyncExternalStore } from "react";

import type {
  FacilityDocument,
  FacilityDocumentType,
} from "@/types/facility-document";

// In-memory module store for the facility Documents page.
//  • Yipyy Agreements (source "platform") are uploaded by the Super Admin and
//    are READ-ONLY here — the facility can view/download only.
//  • My Waivers (source "facility") are the facility's own customer-facing PDFs,
//    which the facility can upload / rename / delete (storage & reference only —
//    no e-signature in the facility portal; those requests originate Super-Admin
//    side). Deterministic seed ⇒ getServerSnapshot === getSnapshot (SSR-clean).

function byNewest(a: FacilityDocument, b: FacilityDocument): number {
  return b.dateAdded.localeCompare(a.dateAdded);
}

// --- Yipyy Agreements (read-only) -----------------------------------------
const PLATFORM_AGREEMENTS: FacilityDocument[] = [
  {
    id: "pa-1",
    name: "Yipyy Platform Services Agreement",
    type: "Agreement",
    source: "platform",
    dateAdded: "2026-01-05T09:00:00Z",
    sizeKb: 412,
  },
  {
    id: "pa-2",
    name: "Terms of Service",
    type: "Terms",
    source: "platform",
    dateAdded: "2026-03-18T09:00:00Z",
    sizeKb: 188,
  },
  {
    id: "pa-3",
    name: "Data Processing Addendum (GDPR)",
    type: "Addendum",
    source: "platform",
    dateAdded: "2026-05-02T09:00:00Z",
    sizeKb: 96,
  },
  {
    id: "pa-4",
    name: "Pricing & Fees Amendment — June 2026",
    type: "Amendment",
    source: "platform",
    dateAdded: "2026-06-10T09:00:00Z",
    sizeKb: 64,
  },
];
PLATFORM_AGREEMENTS.sort(byNewest);

export function usePlatformAgreements(): FacilityDocument[] {
  // Read-only and static (managed by the Super Admin) — a plain constant is a
  // stable reference across renders and SSR.
  return PLATFORM_AGREEMENTS;
}

// --- My Waivers (facility-managed) ----------------------------------------
let facilityDocs: FacilityDocument[] = [
  {
    id: "fw-1",
    name: "Grooming Liability Waiver",
    type: "Liability Waiver",
    source: "facility",
    dateAdded: "2026-04-12T10:00:00Z",
    sizeKb: 120,
  },
  {
    id: "fw-2",
    name: "Boarding Intake Form",
    type: "Intake Form",
    source: "facility",
    dateAdded: "2026-05-20T10:00:00Z",
    sizeKb: 210,
  },
  {
    id: "fw-3",
    name: "Training Contract",
    type: "Contract",
    source: "facility",
    dateAdded: "2026-06-01T10:00:00Z",
    sizeKb: 156,
  },
];

let snapshot = [...facilityDocs].sort(byNewest);
const listeners = new Set<() => void>();

function commit() {
  snapshot = [...facilityDocs].sort(byNewest);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFacilityWaivers(): FacilityDocument[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}

/** Infer a document type from a file name (best-effort). */
export function inferWaiverType(fileName: string): FacilityDocumentType {
  const n = fileName.toLowerCase();
  if (n.includes("liabilit") || n.includes("waiver")) return "Liability Waiver";
  if (n.includes("intake") || n.includes("form")) return "Intake Form";
  if (n.includes("contract") || n.includes("agreement")) return "Contract";
  return "Other";
}

export function addFacilityWaiver(input: {
  name: string;
  type: FacilityDocumentType;
  sizeKb?: number;
}): FacilityDocument {
  const doc: FacilityDocument = {
    id: `fw-${Date.now()}`,
    name: input.name.trim(),
    type: input.type,
    source: "facility",
    dateAdded: new Date().toISOString(),
    sizeKb: input.sizeKb,
  };
  facilityDocs = [doc, ...facilityDocs];
  commit();
  return doc;
}

export function renameFacilityWaiver(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  facilityDocs = facilityDocs.map((d) =>
    d.id === id ? { ...d, name: trimmed } : d,
  );
  commit();
}

export function deleteFacilityWaiver(id: string) {
  facilityDocs = facilityDocs.filter((d) => d.id !== id);
  commit();
}
