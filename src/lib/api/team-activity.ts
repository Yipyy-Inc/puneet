import { roleDisplayNames, type AdminUser } from "@/data/admin-users";
import { getAuditLogs } from "@/lib/api/audit-log";

// Unifies the platform's real logged-action sources into one row model so the
// Activity Tracking page's three tabs and shared filter bar can work over them:
//   - Activity Log  → admin/team member actions (AdminUser.activityLog, live roster)
//   - Login History → admin sign-ins          (AdminUser.loginHistory, live roster)
//   - Audit Trail   → the immutable, append-only audit log (lib/api/audit-log)
// Nothing here mutates; the audit trail is read-only by construction.

export type LogKind = "activity" | "login" | "audit";

export interface TeamLogEntry {
  id: string;
  kind: LogKind;
  timestamp: string; // ISO
  userId: string;
  userName: string;
  userRole: string; // display label
  action: string;
  actionType: string; // drives the Action Type filter
  target: string;
  facilityName: string | null; // drives the Target Facility filter
  details: string;
  severity?: string;
  status?: string;
  ip?: string;
  device?: string;
  location?: string;
  category?: string;
  changes?: { field: string; oldValue: string; newValue: string }[];
}

export interface ActivityFilters {
  member: string; // userName | "all"
  actionType: string; // actionType | "all"
  facility: string; // free text
  from: string; // YYYY-MM-DD | ""
  to: string; // YYYY-MM-DD | ""
}

export const EMPTY_FILTERS: ActivityFilters = {
  member: "all",
  actionType: "all",
  facility: "",
  from: "",
  to: "",
};

/** Coarse, filterable action type derived from a free-text action string. */
export function deriveActivityType(action: string): string {
  const a = action.toLowerCase();
  if (/sign[\s-]?(in|out)|log[\s-]?(in|out)|login|logout|authenticat/.test(a))
    return "Authentication";
  if (/permission|\brole\b|access level|grant|revoke/.test(a))
    return "Access Control";
  if (/creat|invit|\badd(ed)?\b|\bnew\b/.test(a)) return "Created";
  if (/delet|remov|deactiv|suspend/.test(a)) return "Deleted";
  if (/export|download/.test(a)) return "Data Export";
  if (/updat|modif|edit|chang|rename|config/.test(a)) return "Updated";
  return "Other";
}

function byTimestampDesc(a: TeamLogEntry, b: TeamLogEntry) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

export function buildActivityEntries(team: AdminUser[]): TeamLogEntry[] {
  return team
    .flatMap((user) =>
      user.activityLog.map((log) => ({
        id: `act-${user.id}-${log.id}`,
        kind: "activity" as const,
        timestamp: log.timestamp,
        userId: String(user.id),
        userName: user.name,
        userRole: roleDisplayNames[user.role] ?? user.role,
        action: log.action,
        actionType: deriveActivityType(log.action),
        target: log.target,
        facilityName: null,
        details: log.details,
        severity: log.severity,
      })),
    )
    .sort(byTimestampDesc);
}

export function buildLoginEntries(team: AdminUser[]): TeamLogEntry[] {
  return team
    .flatMap((user) =>
      user.loginHistory.map((login, idx) => ({
        id: `login-${user.id}-${idx}`,
        kind: "login" as const,
        timestamp: login.date,
        userId: String(user.id),
        userName: user.name,
        userRole: roleDisplayNames[user.role] ?? user.role,
        action: "Signed in",
        actionType: "Authentication",
        target: login.location,
        facilityName: null,
        details: `${login.device} · ${login.location}`,
        ip: login.ip,
        device: login.device,
        location: login.location,
      })),
    )
    .sort(byTimestampDesc);
}

export function buildAuditEntries(): TeamLogEntry[] {
  return getAuditLogs()
    .map((e) => ({
      id: e.id,
      kind: "audit" as const,
      timestamp: e.timestamp,
      userId: e.userId,
      userName: e.userName,
      userRole: e.userRole,
      action: e.action,
      actionType: e.category,
      target: `${e.entityType}: ${e.entityName}`,
      facilityName:
        e.facilityName ?? (e.entityType === "Facility" ? e.entityName : null),
      details: e.description,
      severity: e.severity,
      status: e.status,
      category: e.category,
      changes: e.changes,
    }))
    .sort(byTimestampDesc);
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
    if (f.actionType !== "all" && e.actionType !== f.actionType) return false;
    if (fac && !(e.facilityName?.toLowerCase().includes(fac) ?? false))
      return false;
    const t = new Date(e.timestamp).getTime();
    if (fromMs !== null && t < fromMs) return false;
    if (toMs !== null && t > toMs) return false;
    return true;
  });
}

export function memberOptions(...sets: TeamLogEntry[][]): string[] {
  const names = new Set<string>();
  for (const set of sets) for (const e of set) names.add(e.userName);
  return [...names].sort();
}

export function actionTypeOptions(...sets: TeamLogEntry[][]): string[] {
  const types = new Set<string>();
  for (const set of sets) for (const e of set) types.add(e.actionType);
  return [...types].sort();
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
        e.category ?? "",
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
