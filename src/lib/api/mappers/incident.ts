import { z } from "zod";

import type { Incident } from "@/types/incidents";

// ============================================================================
// public.incidents ⇄ the `Incident` the incident screens read.
//
// ── WHAT IS REAL AND WHAT IS NOT YET ──────────────────────────────────────
//
// The table holds the RECORD (20260829180000): what happened, to which pets,
// how bad, who reported it, the staff notes and the owner's notes, whether the
// owner was told, and when it was resolved. That migration left photos,
// follow-up tasks, in-stay care, medications and per-owner notifications as
// their own future tables rather than a blob — so a real incident maps them to
// EMPTY here, and the screens say so instead of offering controls with nowhere
// to write.
//
// ── IDS ───────────────────────────────────────────────────────────────────
//
// `id` is the row's `ref` as a string, pets, the booking and the client are
// their refs — the numbers every screen already routes by. The fixture's ids
// were "INC-001"; nothing parses them except the notes list, which strips the
// non-digits and so reads a ref either way.
// ============================================================================

export const INCIDENT_SELECT_STAFF =
  "id, ref, kind, severity, status, title, description, internal_notes, client_notes, pet_ids, staff_ids, occurred_at, reported_at, resolved_at, owner_notified_at, created_at, updated_at, reporter:profiles!incidents_reported_by_fkey(full_name), resolver:profiles!incidents_resolved_by_fkey(full_name), bookings(ref), clients(ref)";

/**
 * What a CUSTOMER is sent. RLS lets an owner read their own incidents but
 * cannot narrow the columns, so the route does — `internal_notes` is not in
 * this list, and the mapper fills it with "".
 */
export const INCIDENT_SELECT_CUSTOMER =
  "id, ref, kind, severity, status, title, client_notes, pet_ids, occurred_at, reported_at, resolved_at, owner_notified_at, created_at, updated_at, bookings(ref), clients(ref)";

export type IncidentRow = {
  id: string;
  ref: number;
  kind: Incident["type"];
  severity: Incident["severity"];
  status: Incident["status"];
  title: string;
  description?: string;
  internal_notes?: string;
  client_notes: string;
  pet_ids: string[];
  staff_ids?: string[];
  occurred_at: string;
  reported_at: string;
  resolved_at: string | null;
  owner_notified_at: string | null;
  created_at: string;
  updated_at: string;
  reporter?: { full_name: string | null } | null;
  resolver?: { full_name: string | null } | null;
  bookings: { ref: number | null } | null;
  clients: { ref: number | null } | null;
};

export type PetRef = { id: string; ref: number; name: string };
export type StaffName = { id: string; name: string };

export function rowToIncident(
  row: IncidentRow,
  pets: Map<string, PetRef>,
  staff: Map<string, StaffName>,
): Incident {
  const known = row.pet_ids
    .map((id) => pets.get(id))
    .filter((p): p is PetRef => Boolean(p));
  return {
    id: String(row.ref),
    type: row.kind,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description ?? "",
    internalNotes: row.internal_notes ?? "",
    clientFacingNotes: row.client_notes,
    petIds: known.map((p) => p.ref),
    petNames: known.map((p) => p.name),
    staffInvolved: (row.staff_ids ?? [])
      .map((id) => staff.get(id)?.name)
      .filter((n): n is string => Boolean(n)),
    reportedBy: row.reporter?.full_name ?? "",
    incidentDate: row.occurred_at,
    reportedDate: row.reported_at,
    resolvedDate: row.resolved_at ?? undefined,
    closedDate:
      row.status === "closed" ? (row.resolved_at ?? undefined) : undefined,
    closedBy:
      row.status === "closed"
        ? (row.resolver?.full_name ?? undefined)
        : undefined,
    photos: [],
    followUpTasks: [],
    managerNotified: false,
    managersNotified: [],
    clientNotified: row.owner_notified_at !== null,
    clientNotificationDate: row.owner_notified_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookingId: row.bookings?.ref ?? undefined,
    clientId: row.clients?.ref ?? undefined,
    careActions: [],
    incidentMedications: [],
    careLogs: [],
  };
}

const kind = z.enum([
  "injury",
  "illness",
  "behavioral",
  "accident",
  "escape",
  "fight",
  "other",
]);
const severity = z.enum(["low", "medium", "high", "critical"]);
const status = z.enum(["open", "investigating", "resolved", "closed"]);

export const incidentWriteSchema = z.object({
  type: kind,
  severity,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(""),
  internalNotes: z.string().max(10000).default(""),
  clientFacingNotes: z.string().max(10000).default(""),
  /** Pet refs. At least one: an incident happens to an animal. */
  petRefs: z.array(z.number().int().positive()).min(1).max(20),
  /** Staff legacy ids or uuids, as the staff list hands them out. */
  staffIds: z.array(z.string()).max(20).default([]),
  bookingRef: z.number().int().positive().optional(),
  incidentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
});
export type IncidentWrite = z.input<typeof incidentWriteSchema>;

export const incidentPatchSchema = z
  .object({
    type: kind.optional(),
    severity: severity.optional(),
    status: status.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(10000).optional(),
    internalNotes: z.string().max(10000).optional(),
    clientFacingNotes: z.string().max(10000).optional(),
    /** Record that the owner has been told. Never un-set. */
    ownerNotified: z.literal(true).optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Nothing to change.");
export type IncidentPatch = z.infer<typeof incidentPatchSchema>;
