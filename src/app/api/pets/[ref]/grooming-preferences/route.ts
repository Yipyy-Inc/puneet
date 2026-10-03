import { NextResponse, type NextRequest } from "next/server";

import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// /api/pets/[ref]/grooming-preferences — how a pet is groomed, carried from
// groom to groom (`pet_grooming_preferences`, 2026-10-03): the booking page's
// "Groom preferences" card reads and edits it.
//
// RLS decides: staff who may view pet records read it; staff who may edit pet
// records or manage grooming styles write it. A pet the caller cannot see is
// a 404, as everywhere. A pet with no row has empty preferences, not an error.
// ============================================================================

export const dynamic = "force-dynamic";

export interface PetGroomingPreferences {
  cut: string;
  face: string;
  ears: string;
  shampoo: string;
  behavior: string;
  updatedAt: string | null;
  updatedByName: string | null;
}

const FIELDS = ["cut", "face", "ears", "shampoo", "behavior"] as const;
const LIMIT: Record<(typeof FIELDS)[number], number> = {
  cut: 200,
  face: 200,
  ears: 200,
  shampoo: 200,
  behavior: 500,
};

const EMPTY: PetGroomingPreferences = {
  cut: "",
  face: "",
  ears: "",
  shampoo: "",
  behavior: "",
  updatedAt: null,
  updatedByName: null,
};

type Row = {
  cut: string;
  face: string;
  ears: string;
  shampoo: string;
  behavior: string;
  updated_at: string;
  updated_by_name: string | null;
};

const toPreferences = (row: Row): PetGroomingPreferences => ({
  cut: row.cut,
  face: row.face,
  ears: row.ears,
  shampoo: row.shampoo,
  behavior: row.behavior,
  updatedAt: row.updated_at,
  updatedByName: row.updated_by_name,
});

async function petOf(ref: string) {
  const numericRef = Number(ref);
  if (!Number.isInteger(numericRef)) return { error: 400 as const };
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("pets")
    .select("id")
    .eq("ref", numericRef)
    .maybeSingle();
  if (!data) return { error: 404 as const };
  return { supabase, petId: (data as { id: string }).id };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const pet = await petOf((await params).ref);
  if ("error" in pet) {
    return NextResponse.json(
      { error: pet.error === 400 ? "Invalid pet id." : "Pet not found." },
      { status: pet.error },
    );
  }
  const { data, error } = await pet.supabase
    .from("pet_grooming_preferences")
    .select("cut, face, ears, shampoo, behavior, updated_at, updated_by_name")
    .eq("pet_id", pet.petId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ? toPreferences(data as Row) : EMPTY);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.trim().length > LIMIT[field]) {
      return NextResponse.json(
        {
          error: `${field} is text of at most ${LIMIT[field]} characters.`,
        },
        { status: 422 },
      );
    }
    values[field] = value.trim();
  }

  const pet = await petOf((await params).ref);
  if ("error" in pet) {
    return NextResponse.json(
      { error: pet.error === 400 ? "Invalid pet id." : "Pet not found." },
      { status: pet.error },
    );
  }

  // The facility, the time and the author are the trigger's, not the
  // request's. An upsert, because a pet has one row or none — and both halves
  // are the same permission, so neither can be the refused one.
  const { data, error } = await pet.supabase
    .from("pet_grooming_preferences")
    .upsert({ pet_id: pet.petId, ...values } as never, {
      onConflict: "pet_id",
    })
    .select("cut, face, ears, shampoo, behavior, updated_at, updated_by_name");
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this pet's grooming preferences.",
      duplicate: "These preferences were just saved by someone else.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this pet's grooming preferences.",
  );
  if (denied) return denied;
  return NextResponse.json(toPreferences((data as Row[])[0]));
}
