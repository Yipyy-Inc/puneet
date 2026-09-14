import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { incidentCareItemPatchSchema } from "@/lib/api/mappers/incident-care";

// ============================================================================
// Stopping (or restarting) a care action or medication.
//
// Only `active` changes: an item is never deleted, because the doses already
// logged against it are the record of care given. A management act; the write
// ends in `.select()` so an RLS refusal is a 403 (check:rls-writes).
// ============================================================================

export const dynamic = "force-dynamic";

const DENIED = "Only a manager can change in-stay care.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string; itemId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref, itemId } = await params;
  const parsed = incidentCareItemPatchSchema.safeParse(await request.json());
  if (!Number.isInteger(Number(ref)) || !parsed.success) {
    return NextResponse.json(
      { error: "That is not a change to in-stay care." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("incident_care_items")
    .update({ active: parsed.data.active })
    .eq("id", itemId)
    .select("id, active");

  if (error) {
    if (error.code === "22023") {
      return NextResponse.json(
        { error: "In-stay care was locked at checkout." },
        { status: 409 },
      );
    }
    return writeFailure(error, { duplicate: DENIED, denied: DENIED });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  return NextResponse.json((data as { id: string; active: boolean }[])[0]);
}
