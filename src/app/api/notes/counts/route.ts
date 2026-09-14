import { NextResponse, type NextRequest } from "next/server";

import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import {
  NOTE_ENTITY_TABLE,
  noteEntityCategorySchema,
} from "@/lib/api/mappers/note";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/notes/counts?category=booking — how many notes each record has.
//
// The bookings list showed a note count per row from `getNoteCount`, over the
// fixture store in src/data/tags-notes, so a real booking with three notes
// read "0" and a fixture booking sharing its number read whatever the fixture
// said. The answer is `{ [ref]: count }` for the facility on screen; RLS on
// `notes` decides which categories the caller may count at all.
// ============================================================================

export const dynamic = "force-dynamic";

/** `.in()` travels in the query string; a facility's worth of ids does not fit. */
const BATCH = 200;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const category = noteEntityCategorySchema.safeParse(
    request.nextUrl.searchParams.get("category"),
  );
  if (!category.success) {
    return NextResponse.json({ error: "Name a category." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  // A count for every record is a staff list; a customer has no facility here.
  if (!scope) return NextResponse.json({});

  const { data, error } = await supabase
    .from("notes")
    .select("entity_id")
    .eq("category", category.data)
    .match(inFacility(scope))
    .limit(10000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const perEntity = new Map<string, number>();
  for (const row of (data ?? []) as { entity_id: string }[]) {
    perEntity.set(row.entity_id, (perEntity.get(row.entity_id) ?? 0) + 1);
  }

  const ids = [...perEntity.keys()];
  const counts: Record<number, number> = {};
  for (let i = 0; i < ids.length; i += BATCH) {
    const { data: rows, error: refError } = await supabase
      .from(NOTE_ENTITY_TABLE[category.data])
      .select("id, ref")
      .in("id", ids.slice(i, i + BATCH))
      .match(inFacility(scope));
    if (refError) {
      return NextResponse.json({ error: refError.message }, { status: 500 });
    }
    for (const row of (rows ?? []) as { id: string; ref: number }[]) {
      counts[row.ref] = perEntity.get(row.id) ?? 0;
    }
  }

  return NextResponse.json(counts);
}
