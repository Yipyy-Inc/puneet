import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { toAuditLogEntry, type AuditLogRow } from "@/lib/api/audit-log";

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

  return NextResponse.json(
    ((data ?? []) as AuditLogRow[]).map(toAuditLogEntry),
  );
}
