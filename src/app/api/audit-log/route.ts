import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import type {
  AuditCategory,
  AuditChange,
  AuditLogEntry,
  AuditSeverity,
  AuditStatus,
} from "@/lib/api/audit-log";

// ============================================================================
// The audit trail, for the screens that show it.
//
// Read-only by construction — there is no POST here and there is no writer to
// call. Entries are created by triggers on the tables the audited acts touch,
// through private.record_audit(), which has EXECUTE revoked from
// `authenticated`. Nothing a caller sends can put a line in this table.
//
// `audit_log_read` admits private.is_platform_admin() and nobody else, so the
// check below is the readable error rather than the boundary. A facility owner
// who finds this URL gets an empty array from the database independently.
// ============================================================================

export const dynamic = "force-dynamic";

/** Newest first, and bounded — this table only grows. */
const LIMIT = 500;

/** One side of a recorded change, as it should read on screen. */
function shown(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may read the audit trail." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries: AuditLogEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    timestamp: row.occurred_at,
    // A null actor is an act with no signed-in person behind it — a migration,
    // a scheduled job. "System" is what that means, not a stand-in for a value
    // we failed to read.
    userId: row.user_id ?? "system",
    userName: row.user_name ?? "System",
    userRole: row.user_role ?? "System",
    action: row.action,
    // Asserted, not validated: these three are CHECK constraints on the table,
    // so a value outside the union cannot exist to be read.
    category: row.category as AuditCategory,
    entityType: row.entity_type ?? "",
    entityId: row.entity_id ?? "",
    entityName: row.entity_name ?? "",
    // The database stores {field, from, to}; the screens render
    // {field, oldValue, newValue}. Named for what they are on each side rather
    // than making one of them speak the other's language.
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
  }));

  return NextResponse.json(entries);
}
