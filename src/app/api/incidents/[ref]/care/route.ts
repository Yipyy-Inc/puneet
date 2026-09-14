import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { hydrateIncidents } from "@/lib/api/incidents-server";
import {
  INCIDENT_SELECT_STAFF,
  type IncidentRow,
} from "@/lib/api/mappers/incident";
import { incidentCareItemWriteSchema } from "@/lib/api/mappers/incident-care";

// ============================================================================
// Adding a care action or a medication to an incident's in-stay care.
//
// A management act (ops_incidents_manage) — RLS decides. The facility is the
// incident's, set by the table's own trigger; nothing here takes one from the
// request. A locked incident (checked out) refuses with 22023.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const ref = Number((await params).ref);
  const parsed = incidentCareItemWriteSchema.safeParse(await request.json());
  if (!Number.isInteger(ref) || !parsed.success) {
    return NextResponse.json(
      { error: "That is not in-stay care." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data: incident } = await supabase
    .from("incidents")
    .select("id, facility_id")
    .eq("ref", ref)
    .maybeSingle();
  if (!incident) {
    return NextResponse.json({ error: "No such incident." }, { status: 404 });
  }

  const viewer = await getViewer().catch(() => null);
  const { error } = await supabase.from("incident_care_items").insert({
    facility_id: incident.facility_id,
    incident_id: incident.id,
    kind: parsed.data.kind,
    name: parsed.data.name,
    detail: parsed.data.detail,
    created_by_name: viewer?.fullName ?? viewer?.email ?? null,
  });

  if (error) {
    if (error.code === "22023") {
      return NextResponse.json(
        { error: "In-stay care was locked at checkout." },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      duplicate: "That care is already on the incident.",
      denied: "Only a manager can add in-stay care.",
    });
  }

  const { data } = await supabase
    .from("incidents")
    .select(INCIDENT_SELECT_STAFF)
    .eq("id", incident.id)
    .single();
  const [hydrated] = await hydrateIncidents(supabase, [
    data as unknown as IncidentRow,
  ]);
  return NextResponse.json(hydrated, { status: 201 });
}
