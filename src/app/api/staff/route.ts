import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { STAFF_SELECT, staffToRow } from "@/lib/api/mappers/staff";
import { staffResponder } from "@/lib/api/staff-response";
import { getFacilityContext } from "@/lib/api/facility-context";
import type { StaffProfile } from "@/types/facility-staff";

// ============================================================================
// Staff at the caller's facility.
//
// RLS decides WHICH ROWS come back: anyone with a membership can see their
// colleagues, because rotas, calendars and handovers are unusable otherwise.
// Being able to see that a groomer exists is not the sensitive part — payroll,
// HR notes, the clock-in code and the permission overrides are, and those ride
// along in `details`.
//
// RLS cannot help with that. It gates rows, not columns, so a policy that lets
// you see a colleague lets you see every column of them. Column-level access
// has to be decided above the database, which is here — via staffResponder, so
// that GET and the writes below cannot drift apart.
//
// WHAT MAY BE WRITTEN is decided BELOW this file, in the database
// (20260802140000). A staff row feeds the permission cascade — resolve_permission
// reads roles from it — so "who may change which column" is not something a
// route handler can be trusted with. PostgREST is reachable directly with the
// anon key and a session cookie; this file is a convenience, not a gate.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const [{ data, error }, responder] = await Promise.all([
    supabase.from("staff").select(STAFF_SELECT).order("legacy_id"),
    staffResponder(user.email),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.map(responder.toResponse));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as Partial<StaffProfile>;

  if (!input.firstName || !input.lastName || !input.email) {
    return NextResponse.json(
      { error: "A name and an email address are required." },
      { status: 422 },
    );
  }
  if (!input.primaryRole) {
    return NextResponse.json(
      { error: "A primary role is required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // A fresh "fs-*" id rather than letting legacy_id fall back to the uuid.
  // 47 files still key people by that shape, and a new hire whose id does not
  // look like the others is a person who quietly goes missing from whichever
  // screen has not moved onto the API yet.
  const legacyId = `fs-${crypto.randomUUID().slice(0, 8)}`;

  const row = staffToRow(input, {
    facilityId: facility.facilityId,
    legacyId,
  });

  const { data: created, error } = await supabase
    .from("staff")
    .insert(row as never)
    .select(STAFF_SELECT)
    .single();

  if (error) {
    // 42501 is the RLS refusal (no manage_staff here); 23505 is a duplicate,
    // which for this table means the email is already on the roster.
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Not allowed to add staff at this facility." },
        { status: 403 },
      );
    }
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Someone with that email is already on the roster." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Echoed back through the SAME redaction as GET. The trigger may have
  // stripped a salary this caller was not allowed to set, and the response has
  // to show what was stored rather than what was sent — otherwise the UI
  // displays a figure the database rejected.
  const responder = await staffResponder(user.email);
  return NextResponse.json(responder.toResponse(created), { status: 201 });
}
