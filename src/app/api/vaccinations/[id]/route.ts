import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  VACCINATION_SELECT,
  rowToVaccination,
  vaccinationPatchSchema,
  type VaccinationRow,
} from "@/lib/api/mappers/vaccination";

// ============================================================================
// One vaccination record: review it, correct it, remove it.
//
// A review (approve, reject, exception) stamps who and when from the session —
// the screen used to write "Sarah (Staff)" for everyone. The facility is never
// taken from the request: the row already has one, and the table's trigger
// re-derives it from the pet on every update.
//
// `edit_pet_medical` decides both writes. A refusal matches zero rows rather
// than erroring, so each write reads back through `.select()` and
// `deniedIfUntouched` turns an empty result into the 403 it was.
// ============================================================================

export const dynamic = "force-dynamic";

const DENIED = "You do not have permission to edit medical records.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = vaccinationPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nothing to change.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const patch = parsed.data;
  const { id } = await params;

  const row: Record<string, unknown> = {};
  if (patch.vaccineName !== undefined) row.vaccine_name = patch.vaccineName;
  if (patch.administeredDate !== undefined)
    row.administered_on = patch.administeredDate;
  if (patch.expiryDate !== undefined) row.expires_on = patch.expiryDate;
  if (patch.veterinarianName !== undefined)
    row.veterinarian_name = patch.veterinarianName || null;
  if (patch.veterinaryClinic !== undefined)
    row.veterinary_clinic = patch.veterinaryClinic || null;
  if (patch.notes !== undefined) row.notes = patch.notes || null;

  if (patch.status !== undefined) {
    row.status = patch.status;
    if (patch.status === "pending_review") {
      row.reviewed_by = null;
      row.reviewed_at = null;
      row.review_reason = null;
    } else {
      const viewer = await getViewer().catch(() => null);
      row.reviewed_by = viewer?.fullName ?? viewer?.email ?? null;
      row.reviewed_at = new Date().toISOString();
      // An approval clears a previous rejection's reason; the other two keep
      // the note the reviewer wrote, if any.
      row.review_reason =
        patch.status === "approved" ? null : patch.reviewReason || null;
    }
  }

  row.updated_at = new Date().toISOString();

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("pet_vaccinations")
    .update(row as never)
    .eq("id", id)
    .select(VACCINATION_SELECT);

  if (error) {
    return writeFailure(error, { duplicate: "", denied: DENIED });
  }
  const refused = deniedIfUntouched(data, DENIED);
  if (refused) return refused;

  return NextResponse.json(
    rowToVaccination((data as unknown as VaccinationRow[])[0]),
  );
}

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
  const { data, error } = await supabase
    .from("pet_vaccinations")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, { duplicate: "", denied: DENIED });
  }
  const refused = deniedIfUntouched(data, DENIED);
  if (refused) return refused;

  return new NextResponse(null, { status: 204 });
}
