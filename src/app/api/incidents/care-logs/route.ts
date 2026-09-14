import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  INCIDENT_CARE_LOG_SELECT,
  incidentCareLogWriteSchema,
} from "@/lib/api/mappers/incident-care";

// ============================================================================
// Logging one administration of in-stay care — a dose given, a wound cleaned.
//
// A floor act: the caretaker who did it records it (view_pet_records). The
// item is found by its own id, NOT through the incident, because that
// caretaker may hold no incident permission and would read no incident at all.
// The incident and facility come from the item, by trigger. Append-only: there
// is no PATCH or DELETE here, and no grant for either.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = incidentCareLogWriteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a care log." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data: item } = await supabase
    .from("incident_care_items")
    .select("id, incident_id, facility_id")
    .eq("id", parsed.data.careItemId)
    .maybeSingle();
  if (!item) {
    return NextResponse.json({ error: "No such care." }, { status: 404 });
  }

  const viewer = await getViewer().catch(() => null);
  const { data, error } = await supabase
    .from("incident_care_logs")
    .insert({
      facility_id: item.facility_id,
      incident_id: item.incident_id,
      care_item_id: item.id,
      note: parsed.data.note || null,
      photo_url: parsed.data.photoUrl ?? null,
      logged_by_name: viewer?.fullName ?? viewer?.email ?? null,
    })
    .select(INCIDENT_CARE_LOG_SELECT)
    .single();

  if (error) {
    if (error.code === "22023") {
      return NextResponse.json(
        { error: "In-stay care was locked at checkout." },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      duplicate: "That was already logged.",
      denied: "You do not have permission to log care here.",
    });
  }
  return NextResponse.json(data, { status: 201 });
}
