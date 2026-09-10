import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  NOTE_ENTITY_TABLE,
  NOTE_SELECT,
  noteEntityCategorySchema,
  noteWriteSchema,
  rowToNote,
  type NoteEntityCategory,
  type NoteRow,
} from "@/lib/api/mappers/note";

// ============================================================================
// The notes on one pet, client, booking or incident.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `useNotesForEntity` kept notes in React state seeded from the
// `@/data/tags-notes` fixture and pushed new ones onto that module array, so
// "Note added" was true until the next reload — and a real pet whose numeric
// ref happened to match a fixture pet showed that pet's notes.
//
// ── THE ENTITY IS RESOLVED THROUGH RLS, NOT TRUSTED ───────────────────────
//
// The caller sends the `ref` its screen holds; this looks the row up in its
// own table, which RLS has already scoped, and uses the uuid that comes back.
// The facility on an insert is then asserted by the `notes_set_facility`
// trigger from that same entity — the one this route stamps from the session
// is overwritten, and exists only because the column is not null.
//
// A customer reaches this route too: the read policy admits a note SHARED
// with them about their own pet, record or booking (20260910202241), and
// nothing else. So the read filters by the facility only for staff.
// ============================================================================

export const dynamic = "force-dynamic";

async function resolveEntity(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  category: NoteEntityCategory,
  ref: number,
  scope: string | null,
): Promise<string | null> {
  const { data } = await supabase
    .from(NOTE_ENTITY_TABLE[category])
    .select("id")
    .eq("ref", ref)
    .match(inFacility(scope))
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const category = noteEntityCategorySchema.safeParse(params.get("category"));
  const ref = Number(params.get("ref"));
  if (!category.success || !Number.isInteger(ref) || ref <= 0) {
    return NextResponse.json(
      { error: "Name a category and a ref." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const entityId = await resolveEntity(supabase, category.data, ref, scope);
  // Something the caller cannot see has no notes they can see either.
  if (!entityId) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("category", category.data)
    .eq("entity_id", entityId)
    .match(inFacility(scope))
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data ?? []) as unknown as NoteRow[]).map((row) => rowToNote(row, ref)),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = noteWriteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a note.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const write = parsed.data;

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const entityId = await resolveEntity(
    supabase,
    write.category,
    write.entityRef,
    facility.facilityId,
  );
  if (!entityId) {
    return NextResponse.json(
      { error: "That record does not exist at this facility." },
      { status: 404 },
    );
  }

  const viewer = await getViewer().catch(() => null);
  const { data, error } = await supabase
    .from("notes")
    .insert({
      facility_id: facility.facilityId,
      category: write.category,
      entity_id: entityId,
      content: write.content,
      visibility: write.visibility ?? "internal",
      sub_type: write.category === "pet" ? (write.subType ?? null) : null,
      is_pinned: write.isPinned ?? false,
      created_by_name: viewer?.fullName ?? viewer?.email ?? null,
    })
    .select(NOTE_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "That note already exists.",
      denied: "You do not have permission to add notes here.",
    });
  }

  return NextResponse.json(
    rowToNote(data as unknown as NoteRow, write.entityRef),
    { status: 201 },
  );
}
