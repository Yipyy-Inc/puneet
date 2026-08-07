// ============================================================================
// The audit trail — read-only, from the database.
//
// ── WHAT THIS FILE USED TO BE ─────────────────────────────────────────────
//
// A module-level array over a frozen mock seed:
//
//   const appended: AuditLogEntry[] = [];
//   export function appendAuditLog(entry) { appended.push(Object.freeze(...)) }
//
// It documented itself as "WRITE-ONCE, APPEND-ONLY, IMMUTABLE" and as "the
// application-layer mirror of the database-level guarantee". Neither half was
// true: the migration it named had never been applied, and `appended` dies
// with the process — on serverless it is not even shared between two requests
// of the same session. Every entry it "recorded" was gone before anyone could
// read it, and the seed underneath was eleven fictional events.
//
// The guarantee lives where it always should have: a trigger on public.audit_log
// that refuses UPDATE, DELETE and TRUNCATE for every role including the table
// owner and service_role (20260807460000). Nothing here needs to promise
// immutability, because nothing here could deliver it.
//
// ── AND THERE IS NO APPEND FUNCTION ANY MORE ──────────────────────────────
//
// Entries are written by private.record_audit(), which is SECURITY DEFINER and
// has EXECUTE revoked from `authenticated`, called from triggers on the tables
// the audited acts touch (20260807480000). So an entry exists because the act
// happened — not because some code path remembered to log it, and not because
// a caller asked for one.
//
// That is also why the triggers are on TABLES rather than inside the API
// functions: every sensitive change made to this database so far was made by
// direct SQL, and a trail that only records traffic through the app would have
// missed all of it.
// ============================================================================

// These three mirror CHECK constraints on public.audit_log, so the database
// guarantees the value is one of them — the union is a more honest type than
// `string`, and it is what the screens already narrow on.
export type AuditSeverity = "Low" | "Medium" | "High" | "Critical";
export type AuditStatus = "Success" | "Failed" | "Pending";
export type AuditCategory =
  | "Financial"
  | "User Access"
  | "Configuration"
  | "Security"
  | "Data"
  | "System";

/**
 * Rendered, so the values are strings.
 *
 * The column stores jsonb — a status enum, a boolean, a uuid — and every
 * consumer puts them straight on screen. Converting once in the route beats
 * each caller guessing at `String(...)`, and an absent side of a change reads
 * as "—" rather than "null".
 */
export interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}

/**
 * The shape the audit screens already render.
 *
 * The actor fields are NOT nullable here even though the columns are. A null
 * actor means the act had no signed-in person behind it, and every consumer
 * would otherwise repeat the same `?? "System"` — so it is resolved once, at
 * the boundary, in the route. Saying "System" is the truthful reading of a
 * null `user_id`, not a placeholder for a missing one.
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  category: AuditCategory;
  entityType: string;
  entityId: string;
  entityName: string;
  changes: AuditChange[];
  /**
   * Nothing captures these yet — private.record_audit takes the actor from the
   * JWT and has no request to read a header from — so they are "—" rather than
   * absent. A column the screen renders should say it is empty, not vanish.
   */
  ipAddress: string;
  userAgent: string;
  facilityId: string;
  facilityName: string;
  severity: AuditSeverity;
  status: AuditStatus;
  description: string;
}

/** The database row, as PostgREST hands it back. */
export interface AuditLogRow {
  id: string;
  occurred_at: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  changes: unknown;
  ip_address: string | null;
  user_agent: string | null;
  facility_id: string | null;
  facility_name: string | null;
  severity: string;
  status: string;
  description: string | null;
}

/** One side of a recorded change, as it should read on screen. */
function shown(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/**
 * Row to entry, in ONE place.
 *
 * Two routes read this table — the platform-wide trail and a single facility's
 * — and a mapping duplicated across them is a mapping that eventually disagrees
 * with itself. The severity/status/category casts are safe: all three are CHECK
 * constraints, so a value outside the union cannot exist to be read.
 */
export function toAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.occurred_at,
    // A null actor is an act with no signed-in person behind it — a migration,
    // a scheduled job. "System" is what that means, not a stand-in for a value
    // we failed to read.
    userId: row.user_id ?? "system",
    userName: row.user_name ?? "System",
    userRole: row.user_role ?? "System",
    action: row.action,
    category: row.category as AuditCategory,
    entityType: row.entity_type ?? "",
    entityId: row.entity_id ?? "",
    entityName: row.entity_name ?? "",
    changes: Array.isArray(row.changes)
      ? (row.changes as { field: string; from: unknown; to: unknown }[]).map(
          (change): AuditChange => ({
            field: change.field,
            oldValue: shown(change.from),
            newValue: shown(change.to),
          }),
        )
      : [],
    ipAddress: row.ip_address ?? "—",
    userAgent: row.user_agent ?? "—",
    // Empty rather than "—": these two are filtered on, and a dash would
    // become a selectable facility named "—".
    facilityId: row.facility_id ?? "",
    facilityName: row.facility_name ?? "",
    severity: row.severity as AuditSeverity,
    status: row.status as AuditStatus,
    description: row.description ?? "",
  };
}

export interface AuditSummary {
  totalLogs: number;
  financialChanges: number;
  userAccessEvents: number;
  configurationChanges: number;
  securityEvents: number;
  criticalEvents: number;
  failedActions: number;
  todayLogs: number;
  weeklyTrend: { date: string; count: number }[];
  categoryBreakdown: { category: string; count: number; percentage: number }[];
  topUsers: { userId: string; userName: string; actionCount: number }[];
}

const MONTH = [
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

const CATEGORIES = [
  "User Access",
  "Financial",
  "Configuration",
  "Security",
  "Data",
  "System",
];

/**
 * The numbers above the table, derived from the rows in it.
 *
 * They used to come from `auditStatistics` in src/data — computed once, at
 * module load, over eleven fictional events. Real rows beside invented totals
 * is the exact failure the hardcoded-values rule exists to prevent, and it is
 * worse here than most places: the whole value of an audit screen is that its
 * numbers are the truth.
 *
 * "Today" is measured against the NEWEST ENTRY rather than the wall clock,
 * which the mock version also did. Two reasons it is right here: the component
 * is rendered on the client, so `new Date()` at render is a hydration mismatch
 * waiting to happen; and on a quiet platform "0 today" tells you nothing while
 * "6 on the most recent day" tells you what the last burst of activity was.
 */
export function summariseAuditLog(
  entries: readonly AuditLogEntry[],
): AuditSummary {
  const total = entries.length;
  const count = (predicate: (entry: AuditLogEntry) => boolean) =>
    entries.filter(predicate).length;

  const DAY = 86_400_000;
  const dayStart = (time: number) => {
    const date = new Date(time);
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  };
  const label = (time: number) => {
    const date = new Date(time);
    return `${MONTH[date.getUTCMonth()]} ${date.getUTCDate()}`;
  };

  const times = entries.map((entry) => new Date(entry.timestamp).getTime());
  const newest = times.length ? dayStart(Math.max(...times)) : dayStart(0);
  const within = (time: number, start: number) =>
    time >= start && time < start + DAY;

  return {
    totalLogs: total,
    financialChanges: count((e) => e.category === "Financial"),
    userAccessEvents: count((e) => e.category === "User Access"),
    configurationChanges: count((e) => e.category === "Configuration"),
    securityEvents: count((e) => e.category === "Security"),
    criticalEvents: count((e) => e.severity === "Critical"),
    failedActions: count((e) => e.status === "Failed"),
    todayLogs: times.filter((time) => within(time, newest)).length,

    // Seven days ending at the newest entry. Built with map over a fixed range
    // rather than an accumulator, which the React Compiler rejects in a
    // component's render path and which reads worse anyway.
    weeklyTrend: Array.from({ length: 7 }, (_, index) => {
      const start = newest - (6 - index) * DAY;
      return {
        date: label(start),
        count: times.filter((time) => within(time, start)).length,
      };
    }),

    categoryBreakdown: CATEGORIES.map((category) => {
      const n = count((entry) => entry.category === category);
      return {
        category,
        count: n,
        percentage: total ? Math.round((n / total) * 100) : 0,
      };
    }).filter((row) => row.count > 0),

    topUsers: Object.values(
      entries.reduce<Record<string, AuditSummary["topUsers"][number]>>(
        (accumulator, entry) => {
          const id = entry.userId ?? "unknown";
          const existing = accumulator[id];
          return {
            ...accumulator,
            [id]: {
              userId: id,
              userName: entry.userName ?? id,
              actionCount: (existing?.actionCount ?? 0) + 1,
            },
          };
        },
        {},
      ),
    )
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 5),
  };
}

/**
 * Read-only, and that is the whole API.
 *
 * There is deliberately no mutation query: appending is a consequence of an
 * audited action, never a user edit, and the database would refuse one anyway.
 */
export const auditLogQueries = {
  all: () => ({
    queryKey: ["audit-logs"] as const,
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const response = await fetch("/api/audit-log");
      if (!response.ok) throw new Error("Could not read the audit trail.");
      return (await response.json()) as AuditLogEntry[];
    },
  }),
};
