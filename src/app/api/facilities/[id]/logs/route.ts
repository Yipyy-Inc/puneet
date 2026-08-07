import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { toAuditLogEntry, type AuditLogRow } from "@/lib/api/audit-log";

// ============================================================================
// One facility's activity, for the superadmin detail page.
//
// The Logs tab said "nothing stores this yet" until today, and it was true:
// there was no activity table of any kind. `audit_log` carries a facility_id
// (20260807460000) and the triggers on facilities, subscriptions, invitations
// and memberships write it (20260807480000), so this tab is the first of the
// five to get a real source.
//
// ── WHAT IT DOES NOT SHOW, AND WHY THAT MATTERS HERE ──────────────────────
//
// Only what happened after recording began. An audit trail that quietly
// presents "no entries" for a facility provisioned last month reads as "nothing
// has ever happened here", which is a stronger and different claim than "we
// were not recording". The tab says which it is.
//
// Platform-admin only, and `audit_log_read` says the same independently.
// ============================================================================

export const dynamic = "force-dynamic";

/** Newest first, and bounded — one facility's slice is small, but it grows. */
const LIMIT = 250;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may read a facility's log." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const [entries, earliest] = await Promise.all([
    supabase
      .from("audit_log")
      .select("*")
      .eq("facility_id", id)
      .order("occurred_at", { ascending: false })
      .limit(LIMIT),
    // When recording began AT ALL, so an empty tab can distinguish "nothing
    // happened" from "we were not watching yet".
    supabase
      .from("audit_log")
      .select("occurred_at")
      .order("occurred_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (entries.error) {
    return NextResponse.json({ error: entries.error.message }, { status: 500 });
  }

  return NextResponse.json({
    entries: ((entries.data ?? []) as AuditLogRow[]).map(toAuditLogEntry),
    recordingSince: earliest.data?.occurred_at ?? null,
  });
}
