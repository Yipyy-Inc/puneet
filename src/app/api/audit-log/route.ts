import { NextResponse, type NextRequest } from "next/server";

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
// ── WHO GETS WHAT, AND WHY THE ROUTE DOES NOT DECIDE ──────────────────────
//
// Until 20260824200000 this answered 403 to everyone but a platform admin,
// because `audit_log_read` admitted private.is_platform_admin() and nobody
// else. `audit_log_facility_read` now also admits a facility ADMIN, for rows
// carrying their own facility_id.
//
// So the route asks and RLS answers. It does NOT filter by facility itself:
// a second opinion about the same question is a second thing to keep in step,
// and the one that would drift is the one written in TypeScript. A facility
// admin selecting the whole table gets their own rows because the policy says
// so, not because this file remembered to add `.eq()`.
//
// The `isPlatformAdmin` check is gone rather than widened. Anyone signed in may
// ask; what comes back is whatever their policies allow, which for a groomer is
// an empty array. That is the truthful answer to "what may I see", and it
// removes the failure mode where the route's idea of the boundary and the
// database's quietly disagree.
//
// ── THE FILTERS ARE A NARROWING, NEVER A WIDENING ─────────────────────────
//
// `category` and `entityType` only ever add `.eq()` on top of what RLS already
// permits. Nothing a caller sends can reach a row the policy would refuse.
// ============================================================================

export const dynamic = "force-dynamic";

/** Newest first, and bounded — this table only grows, by design. */
const LIMIT = 500;

/** Mirrors the CHECK on public.audit_log; anything else is a typo, not a filter. */
const CATEGORIES = new Set([
  "Financial",
  "User Access",
  "Configuration",
  "Security",
  "Data",
  "System",
]);

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);

  const category = params.get("category");
  if (category) {
    if (!CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: `'${category}' is not an audit category.` },
        { status: 400 },
      );
    }
    query = query.eq("category", category);
  }

  // The scheduling screen wants shifts, leave and swaps and nothing else, so
  // it names them rather than reading the whole trail and discarding most of it
  // in the browser.
  const entityTypes = params.get("entityTypes");
  if (entityTypes) {
    const wanted = entityTypes
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (wanted.length > 0) query = query.in("entity_type", wanted);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data ?? []) as AuditLogRow[]).map(toAuditLogEntry),
  );
}
