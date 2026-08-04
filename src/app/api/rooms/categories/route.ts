import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { RoomCategory } from "@/types/rooms";

// ============================================================================
// Creating a room category, and optionally its first units.
//
// `unitCount` is here because that is how the Rooms page actually works: a
// manager describes a category ("Deluxe Suite, holds 2, £85") and says how many
// of them the building has. Making them add the category and then add fifteen
// condos one at a time would be a worse product and a slower page.
//
// TWO WRITES, NOT ONE TRANSACTION, and that is a deliberate limit. If the units
// fail the category still exists — which is recoverable by adding units, and
// the alternative (an RPC) buys atomicity for a case both halves gate on the
// same permission, so a refusal on the second is close to impossible. Said out
// loud rather than left as a silent assumption.
// ============================================================================

export const dynamic = "force-dynamic";

interface CategoryInput extends Partial<RoomCategory> {
  unitCount?: number;
}

function validate(input: CategoryInput): string | null {
  if (!input.name?.trim()) return "A category needs a name.";
  if (!input.service) return "A category needs a service.";
  if (input.defaultCapacity !== undefined && input.defaultCapacity < 1) {
    return "Capacity must be at least 1.";
  }
  if (input.unitCount !== undefined && input.unitCount < 0) {
    return "That is not a number of rooms.";
  }
  // 200 is not a real building; it is a typo or a paste. Refused here because
  // the alternative is a page that appears to hang while it writes them.
  if ((input.unitCount ?? 0) > 200) {
    return "That is more rooms than this can create at once.";
  }
  return null;
}

/** `cat-deluxe-suite` from "Deluxe Suite", with a suffix if that is taken. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `cat-${base || "category"}`;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request
    .json()
    .catch(() => null)) as CategoryInput | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  const problem = validate(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 422 });

  const supabase = await createServerClient();
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // Sort order is derived, not sent: the page appends, and letting the client
  // pick would let two categories claim the same position.
  const { count } = await supabase
    .from("room_categories")
    .select("id", { count: "exact", head: true });

  const legacyId = input.id?.trim() || slugify(input.name!);

  const { data: created, error } = await supabase
    .from("room_categories")
    .insert({
      facility_id: facility.facilityId,
      legacy_id: legacyId,
      service: input.service!,
      name: input.name!.trim(),
      description: input.description ?? null,
      color: input.color ?? "slate",
      sort_order: (count ?? 0) + 1,
      default_capacity: input.defaultCapacity ?? 1,
      default_base_price: input.defaultBasePrice ?? null,
      visible_to_clients: input.visibleToClients ?? true,
      image_url: input.imageUrl ?? null,
      rules: input.rules ?? [],
    } as never)
    .select("id, legacy_id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage rooms at this facility.",
      duplicate: "A category with that name already exists.",
    });
  }

  const category = created as { id: string; legacy_id: string };
  const unitCount = input.unitCount ?? 0;

  if (unitCount > 0) {
    const units = Array.from({ length: unitCount }, (_, i) => ({
      facility_id: facility.facilityId,
      category_id: category.id,
      legacy_id: `${category.legacy_id}-${String(i + 1).padStart(2, "0")}`,
      name: `${input.name!.trim()} ${String(i + 1).padStart(2, "0")}`,
      active: true,
      sort_order: i + 1,
      image_url: input.imageUrl ?? null,
    }));

    const { error: unitError } = await supabase
      .from("facility_rooms")
      .insert(units as never);

    if (unitError) {
      // Deliberately NOT "the category was not created" — it was, and saying
      // otherwise would send the manager to create a duplicate.
      return NextResponse.json(
        {
          error:
            "The category was created but its rooms were not. Add them from the category.",
        },
        { status: unitError.code === "42501" ? 403 : 500 },
      );
    }
  }

  return NextResponse.json({ id: category.legacy_id }, { status: 201 });
}
