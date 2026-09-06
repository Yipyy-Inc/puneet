import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfExpectedRowsSurvived } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// Taking a tag back off.
//
// A real DELETE, unlike retiring a catalogue tag: an assignment IS the fact, so
// there is nothing left to deactivate. `deniedIfExpectedRowsSurvived` because a
// refused delete and an already-gone row both affect zero rows, and only the
// count beforehand tells them apart.
// ============================================================================

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { count } = await supabase
    .from("facility_tag_assignments")
    .select("id", { count: "exact", head: true })
    .eq("id", id);

  const { data, error } = await supabase
    .from("facility_tag_assignments")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "That tag is already on this record.",
      denied: "You do not have permission to change this record's tags.",
    });
  }

  const denied = deniedIfExpectedRowsSurvived(
    count ?? 0,
    data,
    "You do not have permission to change this record's tags.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}
