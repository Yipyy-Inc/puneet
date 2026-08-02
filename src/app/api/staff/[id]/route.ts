import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  STAFF_SELECT,
  rowToStaffProfile,
  staffToRow,
} from "@/lib/api/mappers/staff";
import { staffResponder } from "@/lib/api/staff-response";
import type { StaffProfile } from "@/types/facility-staff";

// ============================================================================
// One staff member, by the app-facing "fs-*" id.
//
// PATCH rather than PUT: callers send what they changed, and staffToRow maps
// only what it is given. A full replace would blank every column the caller
// omitted, which on this table means losing someone's payroll because their
// phone number was corrected.
//
// WHAT MAY ACTUALLY BE CHANGED is not decided here. The staff row feeds the
// permission cascade — resolve_permission reads roles from it — so the rules
// live in the database (20260802140000) where PostgREST cannot go round them:
//
//   raises   role, additional_roles, legacy_id, status, membership_id, and any
//            change of facility_id, when the caller lacks manage_staff
//   reverts  payroll without edit_payroll, permission overrides without
//            manage_roles, HR notes and the clock-in code without manage_staff
//
// This handler's job is to merge honestly and to report what the database
// actually stored.
// ============================================================================

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Invalid staff id." }, { status: 400 });
  }

  const input = (await request.json()) as Partial<StaffProfile>;
  const supabase = await createServerClient();

  // Read the stored row first and merge onto it, because `details` is replaced
  // wholesale rather than deep-merged. Without this, a caller sending only
  // `phone` would drop the notification preferences, the clock-in settings and
  // everything else in the tail.
  //
  // Note this reads the FULL row: RLS gates rows, not columns, so the merge
  // base includes fields this caller may not see. That is exactly why it is
  // safe — the salary they cannot read is preserved rather than blanked — and
  // exactly why the RESPONSE below must go back through the redaction.
  const { data: current } = await supabase
    .from("staff")
    .select(STAFF_SELECT)
    .eq("legacy_id", id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 },
    );
  }

  const merged = { ...rowToStaffProfile(current), ...input };
  const row = staffToRow(merged, {});

  const { data: written, error } = await supabase
    .from("staff")
    .update(row as never)
    .eq("legacy_id", id)
    .select("id");

  if (error) {
    // The trigger raises 42501 for an escalation attempt — changing a role,
    // a status, or the facility. Its message is written for a person, so it
    // is passed through rather than replaced with something vaguer.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // An UPDATE filtered out by RLS is not an error in Postgres — it affects
  // zero rows and reports success. Without this the route answers 200 with the
  // unchanged record, so someone not allowed to edit is told their edit
  // worked. A write that silently does nothing is worse than one that fails.
  if (!written || written.length === 0) {
    return NextResponse.json(
      { error: "Not allowed to edit this staff member." },
      { status: 403 },
    );
  }

  const { data: updated } = await supabase
    .from("staff")
    .select(STAFF_SELECT)
    .eq("legacy_id", id)
    .single();

  if (!updated) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 },
    );
  }

  // Through the same redaction as GET. The trigger silently reverts fields the
  // caller may not set, so the response has to show what was STORED, not what
  // was sent — otherwise the UI displays an edit the database threw away.
  const responder = await staffResponder(user.email);
  return NextResponse.json(responder.toResponse(updated));
}
