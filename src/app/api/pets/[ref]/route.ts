import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { PET_SELECT, petToRow, rowToPet } from "@/lib/api/mappers/client";
import { writeFailure } from "@/lib/api/write-failure";
import type { Pet } from "@/types/pet";

// ============================================================================
// One pet, by the app-facing numeric ref.
//
// PATCH rather than PUT, for the same reason as clients: a caller sends what
// changed, and a full replace would blank the rest.
//
// WHAT MAY ACTUALLY BE CHANGED lives in the database (20260803090000):
//
//   raises   changing client_id without edit_pet_records — re-homing an animal
//            is a facility action, not an edit
//   reverts  status, and `details.evaluations` — the facility's assessment of
//            the animal, which its owner may read but not rewrite
//
// The facility is never accepted from the request at all: `pets_set_facility`
// derives it from the owner, so offering the field would only mean offering one
// the database overwrites.
// ============================================================================

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isFinite(numericRef)) {
    return NextResponse.json({ error: "Invalid pet id." }, { status: 400 });
  }

  const input = (await request.json()) as Partial<Pet> & { clientId?: number };
  const supabase = await createServerClient();

  const { data: existing, error: readError } = await supabase
    .from("pets")
    .select("id, details")
    .eq("ref", numericRef)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Pet not found." }, { status: 404 });
  }

  // Re-homing is expressed as a new owner ref; resolve it the same way POST
  // does, so an owner the caller cannot read is a 404 rather than a raw RLS
  // error. The database still decides whether the move is allowed.
  let clientId: string | undefined;
  if (input.clientId !== undefined) {
    const { data: owner } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", input.clientId)
      .maybeSingle();
    if (!owner) {
      return NextResponse.json(
        { error: "That owner does not exist, or is not yours to use." },
        { status: 404 },
      );
    }
    clientId = owner.id;
  }

  // Merge the stored details, for the same reason the client route does: the
  // column is replaced wholesale, and an owner who cannot write `evaluations`
  // still has to be able to change their pet's weight without erasing them.
  const row = petToRow(input, { clientId });
  if (row.details) {
    row.details = {
      ...((existing.details ?? {}) as Record<string, unknown>),
      ...(row.details as Record<string, unknown>),
    } as typeof row.details;
  }

  const { data: updated, error } = await supabase
    .from("pets")
    .update(row as never)
    .eq("id", existing.id)
    .select(PET_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to edit this pet.",
      duplicate: "That pet already exists.",
    });
  }

  return NextResponse.json(rowToPet(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isFinite(numericRef)) {
    return NextResponse.json({ error: "Invalid pet id." }, { status: 400 });
  }

  const supabase = await createServerClient();

  // `pets_delete` needs edit_pet_records, so an owner cannot remove their own
  // animal — deliberately. A pet has visit history, evaluations and bookings
  // hanging off it; removing one is a facility decision, and the customer-facing
  // action is marking it inactive.
  //
  // A refusal matches ZERO ROWS rather than erroring, which makes "denied" and
  // "already gone" identical from the result. Reading back is what tells them
  // apart — the same shape the roles-override route uses for the same reason.
  const { error } = await supabase.from("pets").delete().eq("ref", numericRef);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove this pet.",
      duplicate: "",
    });
  }

  const { data: survivor } = await supabase
    .from("pets")
    .select("ref")
    .eq("ref", numericRef)
    .maybeSingle();

  if (survivor) {
    return NextResponse.json(
      { error: "Not allowed to remove this pet." },
      { status: 403 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
