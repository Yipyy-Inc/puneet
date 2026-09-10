import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { hydrateIncidents } from "@/lib/api/incidents-server";
import {
  INCIDENT_SELECT_STAFF,
  incidentPatchSchema,
  type IncidentRow,
} from "@/lib/api/mappers/incident";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// Changing an incident: its status, severity, notes, and whether the owner
// has been told.
//
// Editing is a management act (`ops_incidents_manage`) — the reporter records
// what they saw, somebody accountable changes severity or closes it. RLS
// decides; the write ends in `.select()` so a refusal is a 403, not a success
// (check:rls-writes). There is no DELETE: an incident is corrected or closed,
// never removed (20260829180000).
//
// `resolved_at` is stamped the first time it reaches resolved or closed and
// cleared if it is reopened — the table requires the two to agree.
// ============================================================================

export const dynamic = "force-dynamic";

const DENIED = "You do not have permission to change incidents here.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const ref = Number((await params).ref);
  const parsed = incidentPatchSchema.safeParse(await request.json());
  if (!Number.isInteger(ref) || !parsed.success) {
    return NextResponse.json(
      { error: "That is not a change to an incident." },
      { status: 422 },
    );
  }
  const patch = parsed.data;

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("incidents")
    .select("id, status, resolved_at, owner_notified_at")
    .eq("ref", ref)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "No such incident." }, { status: 404 });
  }

  const update: TablesUpdate<"incidents"> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.type) update.kind = patch.type;
  if (patch.severity) update.severity = patch.severity;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.internalNotes !== undefined)
    update.internal_notes = patch.internalNotes;
  if (patch.clientFacingNotes !== undefined)
    update.client_notes = patch.clientFacingNotes;
  if (patch.status) {
    update.status = patch.status;
    const done = patch.status === "resolved" || patch.status === "closed";
    update.resolved_at = done
      ? (current.resolved_at ?? new Date().toISOString())
      : null;
    update.resolved_by = done ? user.id : null;
  }
  if (patch.ownerNotified && !current.owner_notified_at) {
    update.owner_notified_at = new Date().toISOString();
    update.owner_notified_by = user.id;
  }

  const { data, error } = await supabase
    .from("incidents")
    .update(update)
    .eq("id", current.id)
    .select(INCIDENT_SELECT_STAFF);

  if (error) {
    return writeFailure(error, { duplicate: DENIED, denied: DENIED });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  const [incident] = await hydrateIncidents(
    supabase,
    data as unknown as IncidentRow[],
  );
  return NextResponse.json(incident);
}
