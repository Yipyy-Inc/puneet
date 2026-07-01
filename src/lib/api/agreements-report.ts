// Platform-wide Agreements compliance report (FB-19). Derived from the
// per-facility Agreements repository (the FB-16 agreements-store), it surfaces
// which facilities have missing or expired legal agreements. Expiry is computed
// from each document's signed date plus its renewal term.

import { facilities } from "@/data/facilities";
import type {
  AgreementType,
  FacilityAgreement,
} from "@/types/facility-agreement";

export type AgreementReportStatus = "Missing" | "Expired" | "Active";

// The renewable compliance documents every active facility must keep current.
const REQUIRED_AGREEMENTS: {
  name: string;
  type: AgreementType;
  termYears: number;
}[] = [
  { name: "Platform Services Agreement", type: "Agreement", termYears: 1 },
  { name: "Data Processing Addendum (GDPR)", type: "Addendum", termYears: 2 },
  { name: "Service Liability Waiver", type: "Waiver", termYears: 1 },
];

export interface AgreementReportRow {
  id: string;
  facilityId: number;
  facility: string;
  agreementName: string;
  agreementType: AgreementType;
  status: AgreementReportStatus;
  /** ISO expiry date, or null when the agreement is missing. */
  expiresAt: string | null;
}

export interface AgreementsReport {
  rows: AgreementReportRow[];
  kpis: {
    missing: number;
    expired: number;
    active: number;
    facilitiesAtRisk: number;
  };
}

function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

// Sort key: Missing first, then Expired (oldest expiry first), then Active
// (soonest expiry first) — i.e. most urgent at the top.
function urgency(row: AgreementReportRow): number {
  if (row.status === "Missing") return 0;
  return new Date(row.expiresAt as string).getTime();
}

export function buildAgreementsReport(
  agreements: readonly FacilityAgreement[],
  now: Date,
): AgreementsReport {
  const rows: AgreementReportRow[] = [];

  for (const facility of facilities) {
    for (const req of REQUIRED_AGREEMENTS) {
      const signed = agreements.find(
        (a) =>
          a.facilityId === facility.id &&
          a.name === req.name &&
          a.status === "signed",
      );

      let status: AgreementReportStatus;
      let expiresAt: string | null;
      if (!signed || !signed.dateSigned) {
        status = "Missing";
        expiresAt = null;
      } else {
        expiresAt = addYears(signed.dateSigned, req.termYears);
        status = new Date(expiresAt) < now ? "Expired" : "Active";
      }

      rows.push({
        id: `${facility.id}-${req.type}`,
        facilityId: facility.id,
        facility: facility.name,
        agreementName: req.name,
        agreementType: req.type,
        status,
        expiresAt,
      });
    }
  }

  rows.sort((a, b) => urgency(a) - urgency(b));

  const missing = rows.filter((r) => r.status === "Missing").length;
  const expired = rows.filter((r) => r.status === "Expired").length;
  const active = rows.filter((r) => r.status === "Active").length;
  const facilitiesAtRisk = new Set(
    rows
      .filter((r) => r.status === "Missing" || r.status === "Expired")
      .map((r) => r.facilityId),
  ).size;

  return { rows, kpis: { missing, expired, active, facilitiesAtRisk } };
}
