import { clientDocuments } from "@/data/documents";
import { vaccinationRecords } from "@/data/pet-data";
import { vaccinationRules } from "@/data/settings";
import { getNotesForEntity, getTagsForEntity } from "@/data/tags-notes";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { ManualFacilityEvent } from "@/lib/operations-calendar";

export interface VaccineCheckRow {
  vaccineName: string;
  status: "valid" | "expired" | "missing";
  expiryDate?: string;
}

export interface AgreementStatusSummary {
  signed: boolean;
  latestSignedAt?: string;
  latestDocumentName?: string;
}

export interface NoteSectionState {
  content: string;
  lastEditedBy: string;
  lastEditedAt: string;
}

export function isManagerOrAdminRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized.includes("admin") || normalized.includes("manager");
}

export function toDisplayRole(role: string): string {
  return role
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRequiredVaccines(service: string): string[] {
  const lowerService = service.toLowerCase();
  return vaccinationRules
    .filter(
      (rule) =>
        rule.required &&
        (rule.applicableServices.includes("all") ||
          rule.applicableServices.some((item) => item === lowerService)),
    )
    .map((rule) => rule.vaccineName);
}

export function getVaccineRows(petId: number | undefined, service: string): VaccineCheckRow[] {
  if (!petId) return [];

  const now = Date.now();
  const required = getRequiredVaccines(service);
  const records = vaccinationRecords.filter((record) => record.petId === petId);

  return required.map((requiredName) => {
    const match = records.find((record) =>
      record.vaccineName.toLowerCase().includes(requiredName.toLowerCase().split(" ")[0]),
    );

    if (!match) {
      return {
        vaccineName: requiredName,
        status: "missing",
      };
    }

    const expiry = new Date(match.expiryDate).getTime();
    const expired = Number.isFinite(expiry) && expiry < now;

    return {
      vaccineName: requiredName,
      status: expired ? "expired" : "valid",
      expiryDate: match.expiryDate,
    };
  });
}

export function getAgreementStatus(clientId: number | undefined): AgreementStatusSummary {
  if (!clientId) {
    return { signed: false };
  }

  const signedDocs = clientDocuments
    .filter(
      (document) =>
        document.clientId === clientId &&
        (document.type === "agreement" || document.type === "waiver") &&
        Boolean(document.signedAt),
    )
    .sort((a, b) => {
      const first = new Date(a.signedAt ?? a.uploadedAt).getTime();
      const second = new Date(b.signedAt ?? b.uploadedAt).getTime();
      return second - first;
    });

  if (signedDocs.length === 0) {
    return { signed: false };
  }

  const latest = signedDocs[0];
  return {
    signed: true,
    latestSignedAt: latest.signedAt,
    latestDocumentName: latest.name,
  };
}

export function getServiceHistorySummary(bookings: Booking[], petId: number | undefined): string {
  if (!petId) return "No visit history available";

  const history = bookings
    .filter((booking) => booking.petId === petId)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (history.length === 0) return "No visit history available";

  const recent = history.slice(0, 3);
  const summary = recent
    .map((booking) => `${booking.service} (${booking.startDate})`)
    .join(" | ");

  return summary;
}

export function getLastVisitDate(bookings: Booking[], petId: number | undefined): string | null {
  if (!petId) return null;

  const history = bookings
    .filter((booking) => booking.petId === petId)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return history[0]?.startDate ?? null;
}

export function getPetTagDetails(petId: number | undefined) {
  if (!petId) return [];
  return getTagsForEntity("pet", petId);
}

export function getCustomerTagDetails(clientId: number | undefined) {
  if (!clientId) return [];
  return getTagsForEntity("customer", clientId);
}

export function getBookingNotes(bookingId: number | undefined): string {
  if (!bookingId) return "";
  const notes = getNotesForEntity("booking", bookingId);
  return notes[0]?.content ?? "";
}

export function getPetNotes(petId: number | undefined): string {
  if (!petId) return "";
  const notes = getNotesForEntity("pet", petId);
  return notes[0]?.content ?? "";
}

export function getCustomerNotes(clientId: number | undefined): string {
  if (!clientId) return "";
  const notes = getNotesForEntity("customer", clientId);
  return notes[0]?.content ?? "";
}

export function canEditBookingNotes(role: string, assignedStaff: string[]): boolean {
  if (isManagerOrAdminRole(role)) return true;
  const normalizedRole = role.toLowerCase();
  return assignedStaff.some((staffName) =>
    staffName.toLowerCase().includes(normalizedRole) || normalizedRole.includes("staff"),
  );
}

export function canEditPersistentNotes(role: string): boolean {
  return isManagerOrAdminRole(role);
}

export function parseManualEventLabel(event: ManualFacilityEvent): string {
  if (event.kind === "block-time") return "Block time";
  return "Custom event";
}

export function formatLocalDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount ?? 0);
}
