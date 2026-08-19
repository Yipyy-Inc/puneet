import type { AuditLogEntry } from "@/lib/api/audit-log";

// ============================================================================
// The audit trail, shaped for the screen that renders it.
//
// ── THIS FILE USED TO CLAIM MORE THAN IT DELIVERED ────────────────────────
//
// Its header said it "unifies the platform's real logged-action sources into
// one row model" over three of them: an activity log, a login history and the
// audit trail. Only the third was real. The other two were built from
// `AdminUser.activityLog` and `AdminUser.loginHistory` — hand-written arrays on
// five invented people in src/data/admin-users.ts — and the word "real" in that
// sentence was doing a lot of work.
//
// There is no second source to unify with. Nothing records a sign-in anywhere
// in this system, and there is no per-person action table. So the row model
// stays (the filter bar and the CSV export are worth keeping) but it now
// describes exactly one thing.
//
// Everything here is a pure transform: the fetch belongs to the screen's query,
// which is also what makes these testable without a server. Nothing mutates —
// the trail is append-only at the database level, not by convention here.
// ============================================================================

export interface TeamLogEntry {
  id: string;
  timestamp: string; // ISO
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  category: string; // drives the Category filter
  target: string;
  facilityName: string | null; // drives the Target Facility filter
  details: string;
  severity?: string;
  status?: string;
  changes?: { field: string; oldValue: string; newValue: string }[];
}

export interface ActivityFilters {
  member: string; // userName | "all"
  category: string; // category | "all"
  facility: string; // free text
  from: string; // YYYY-MM-DD | ""
  to: string; // YYYY-MM-DD | ""
}

export const EMPTY_FILTERS: ActivityFilters = {
  member: "all",
  category: "all",
  facility: "",
  from: "",
  to: "",
};

/**
 * Takes the entries rather than fetching them.
 *
 * It used to call getAuditLogs(), which read a frozen mock array synchronously.
 * The trail is a database table now, so the fetch belongs to the screen's query
 * and this stays a pure transform.
 */
export function buildAuditEntries(
  entries: readonly AuditLogEntry[],
): TeamLogEntry[] {
  return entries
    .map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      userId: e.userId,
      userName: e.userName,
      userRole: e.userRole,
      action: e.action,
      category: e.category,
      target: `${e.entityType}: ${e.entityName}`,
      facilityName:
        e.facilityName ?? (e.entityType === "Facility" ? e.entityName : null),
      details: e.description,
      severity: e.severity,
      status: e.status,
      changes: e.changes,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
}

export function filterEntries(
  entries: TeamLogEntry[],
  f: ActivityFilters,
): TeamLogEntry[] {
  const fromMs = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
  const toMs = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null;
  const fac = f.facility.trim().toLowerCase();
  return entries.filter((e) => {
    if (f.member !== "all" && e.userName !== f.member) return false;
    if (f.category !== "all" && e.category !== f.category) return false;
    if (fac && !(e.facilityName?.toLowerCase().includes(fac) ?? false))
      return false;
    const t = new Date(e.timestamp).getTime();
    if (fromMs !== null && t < fromMs) return false;
    if (toMs !== null && t > toMs) return false;
    return true;
  });
}

export function memberOptions(entries: TeamLogEntry[]): string[] {
  return [...new Set(entries.map((e) => e.userName))].sort();
}

export function categoryOptions(entries: TeamLogEntry[]): string[] {
  return [...new Set(entries.map((e) => e.category))].sort();
}

const AUDIT_CSV_HEADERS = [
  "Timestamp",
  "User",
  "Role",
  "Action",
  "Category",
  "Target",
  "Facility",
  "Severity",
  "Status",
  "Description",
];

function csvCell(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/** CSV text for the (already-filtered) audit trail entries. */
export function buildAuditCsv(entries: TeamLogEntry[]): string {
  return [
    AUDIT_CSV_HEADERS.join(","),
    ...entries.map((e) =>
      [
        e.timestamp,
        e.userName,
        e.userRole,
        e.action,
        e.category,
        e.target,
        e.facilityName ?? "",
        e.severity ?? "",
        e.status ?? "",
        e.details,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
}
