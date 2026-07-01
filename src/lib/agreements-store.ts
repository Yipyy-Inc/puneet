"use client";

import { useSyncExternalStore } from "react";

import { facilities } from "@/data/facilities";
import type {
  AgreementType,
  FacilityAgreement,
} from "@/types/facility-agreement";

// In-memory store for facility ⇄ Yipyy legal documents. Deterministic seed ⇒
// getServerSnapshot === getSnapshot (SSR-clean, no hydration flash). Documents
// are added only by Super Admins (upload an executed doc / request e-signature);
// facility owners consume this data read-only elsewhere. Also the source for the
// global Agreements report (FB-19) via getAllAgreements().

function ownerName(facilityId: number): string {
  return (
    facilities.find((f) => f.id === facilityId)?.owner?.name ?? "Facility Owner"
  );
}

/** Add `days` to an ISO/`YYYY-MM-DD` date, returning a full ISO string. */
function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// The standard document set every facility signs during onboarding, plus a
// later pricing amendment. Offsets are relative to the facility join date so the
// timeline is realistic and deterministic per facility.
const SEED_TEMPLATES: {
  name: string;
  type: AgreementType;
  version: string;
  dayOffset: number;
}[] = [
  {
    name: "Platform Services Agreement",
    type: "Agreement",
    version: "1.0",
    dayOffset: 0,
  },
  {
    name: "Terms of Service Acceptance",
    type: "Agreement",
    version: "2.1",
    dayOffset: 0,
  },
  {
    name: "Custom Onboarding Terms",
    type: "Addendum",
    version: "1.0",
    dayOffset: 1,
  },
  {
    name: "Data Processing Addendum (GDPR)",
    type: "Addendum",
    version: "1.2",
    dayOffset: 2,
  },
  {
    name: "Service Liability Waiver",
    type: "Waiver",
    version: "1.0",
    dayOffset: 5,
  },
  {
    name: "Pricing & Fees Amendment",
    type: "Amendment",
    version: "1.1",
    dayOffset: 180,
  },
];

// The renewable compliance documents surfaced by the Agreements report. A few
// facilities legitimately haven't signed one of these yet (incomplete
// onboarding) — modelled deterministically so the report has real "Missing"
// rows. The demo facility (11) is always fully covered.
const COMPLIANCE_DOCS = new Set([
  "Platform Services Agreement",
  "Data Processing Addendum (GDPR)",
  "Service Liability Waiver",
]);

function isSeededMissing(facilityId: number, name: string): boolean {
  if (facilityId === 11) return false;
  if (!COMPLIANCE_DOCS.has(name)) return false;
  // FNV-1a over "id:name" → deterministic ~1-in-4 gap.
  let h = 0x811c9dc5;
  const key = `${facilityId}:${name}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 4 === 0;
}

function seedAgreements(): FacilityAgreement[] {
  const out: FacilityAgreement[] = [];
  for (const facility of facilities) {
    const joined = facility.dayJoined ?? "2025-01-01";
    const signer = facility.owner?.name ?? "Facility Owner";
    for (const tpl of SEED_TEMPLATES) {
      if (isSeededMissing(facility.id, tpl.name)) continue;
      out.push({
        id: `ag-${facility.id}-${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        facilityId: facility.id,
        name: tpl.name,
        type: tpl.type,
        dateSigned: addDays(joined, tpl.dayOffset),
        signedBy: signer,
        version: tpl.version,
        status: "signed",
      });
    }
  }
  return out;
}

// Newest first; pending signature requests float to the top (most actionable).
function byRecency(a: FacilityAgreement, b: FacilityAgreement): number {
  if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
  const at = a.dateSigned ?? "";
  const bt = b.dateSigned ?? "";
  return bt.localeCompare(at);
}

let agreements: FacilityAgreement[] = seedAgreements();
const listeners = new Set<() => void>();

const EMPTY: readonly FacilityAgreement[] = Object.freeze([]);
let byFacility = new Map<number, FacilityAgreement[]>();

function rebuild() {
  const map = new Map<number, FacilityAgreement[]>();
  for (const a of agreements) {
    const list = map.get(a.facilityId);
    if (list) list.push(a);
    else map.set(a.facilityId, [a]);
  }
  for (const list of map.values()) list.sort(byRecency);
  byFacility = map;
}
rebuild();

function commit() {
  rebuild();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function facilitySnapshot(facilityId: number): readonly FacilityAgreement[] {
  return byFacility.get(facilityId) ?? EMPTY;
}

export function useFacilityAgreements(
  facilityId: number,
): readonly FacilityAgreement[] {
  return useSyncExternalStore(
    subscribe,
    () => facilitySnapshot(facilityId),
    () => facilitySnapshot(facilityId),
  );
}

/** All agreements across every facility — source for the Agreements report. */
export function getAllAgreements(): readonly FacilityAgreement[] {
  return agreements;
}

/** Reactive variant of getAllAgreements() for the Agreements report view. */
export function useAllAgreements(): readonly FacilityAgreement[] {
  return useSyncExternalStore(
    subscribe,
    () => agreements,
    () => agreements,
  );
}

/** Non-hook accessor (sorted) for a single facility. */
export function getFacilityAgreements(
  facilityId: number,
): readonly FacilityAgreement[] {
  return facilitySnapshot(facilityId);
}

/** Super Admin files an already-executed document into the repository. */
export function addAgreement(
  facilityId: number,
  input: { name: string; type: AgreementType; version: string },
): FacilityAgreement {
  const doc: FacilityAgreement = {
    id: `ag-${facilityId}-${Date.now()}`,
    facilityId,
    name: input.name.trim(),
    type: input.type,
    dateSigned: new Date().toISOString(),
    signedBy: ownerName(facilityId),
    version: input.version.trim() || "1.0",
    status: "signed",
  };
  agreements = [doc, ...agreements];
  commit();
  return doc;
}

/** Super Admin sends a document to the facility's primary contact to e-sign. */
export function requestSignature(
  facilityId: number,
  input: { name: string; type: AgreementType; version: string },
): FacilityAgreement {
  const doc: FacilityAgreement = {
    id: `ag-${facilityId}-${Date.now()}`,
    facilityId,
    name: input.name.trim(),
    type: input.type,
    dateSigned: null,
    signedBy: "",
    version: input.version.trim() || "1.0",
    status: "pending",
  };
  agreements = [doc, ...agreements];
  commit();
  return doc;
}
