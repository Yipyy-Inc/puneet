import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TAG_ASSIGNMENT_SELECT,
  TAG_ENTITY_TABLE,
  TAG_SELECT,
  rowToTag,
  rowToTagAssignment,
  tagWriteSchema,
  tagWriteToInsert,
  type TagAssignmentRow,
  type TagRow,
} from "@/lib/api/mappers/tag";
import type { Tag, TagAssignment, TagType } from "@/types/tags";

// ============================================================================
// The tag catalogue, and what carries which tag.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// 76 tags and 41 assignments in src/data/tags-notes.ts, read by nineteen
// screens and edited by a settings builder whose own toast said "the tag list
// is not stored yet, so it resets when this page reloads."
//
// `public.facility_tags` and `public.facility_tag_assignments` have existed
// since 20260828134018, whose header promised of the tag components: "This
// makes THAT real." It did not — the tables carried zero rows for nine days
// while every screen went on reading the fixture. This route is the half that
// was missing.
//
// ── RLS IS THE BOUNDARY, AND THIS ROUTE DOES NOT SECOND-GUESS IT ──────────
//
// The read filters by nothing. `facility_tags_read` admits a member of the
// facility, and (since 20260906221303) a CLIENT of it for a `client_visible`
// tag; the assignment policy adds "on your own pet, client record or booking".
// A route that also filtered would be a second opinion that drifts from the
// policy — the same reasoning /api/locations states, and the reason a customer
// and a staff member can share one endpoint here.
//
// The facility comes from the session only to STAMP an insert.
// ============================================================================

export const dynamic = "force-dynamic";

/**
 * The refs of the rows an assignment set points at, per entity type.
 *
 * Three queries rather than one join because the FK is polymorphic and
 * therefore unkeyed — 20260828134018 took that trade deliberately so the three
 * shared components would not be forked into three.
 *
 * Each read passes through RLS, so a target the caller may not read resolves to
 * nothing and its assignment is dropped from the answer.
 */
async function resolveEntityRefs(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  rows: TagAssignmentRow[],
): Promise<Map<string, number>> {
  const byType = new Map<TagType, Set<string>>();
  for (const row of rows) {
    const type = row.entity_type as TagType;
    if (!TAG_ENTITY_TABLE[type]) continue;
    const set = byType.get(type) ?? new Set<string>();
    set.add(row.entity_id);
    byType.set(type, set);
  }

  const refs = new Map<string, number>();
  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const { data } = await supabase
        .from(TAG_ENTITY_TABLE[type])
        .select("id, ref")
        .in("id", [...ids]);
      for (const row of (data ?? []) as { id: string; ref: number | null }[]) {
        if (typeof row.ref === "number") refs.set(row.id, row.ref);
      }
    }),
  );
  return refs;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  const [tagResult, assignmentResult] = await Promise.all([
    supabase
      .from("facility_tags")
      .select(TAG_SELECT)
      .match(inFacility(scope))
      // Alphabetical. Creation order means nothing to anybody, and a tag row is
      // read by its name — the priority ordering the badges need is the
      // components' job, where `critical` sorts ahead of a word beginning c.
      .order("name", { ascending: true }),
    supabase
      .from("facility_tag_assignments")
      .select(TAG_ASSIGNMENT_SELECT)
      .match(inFacility(scope)),
  ]);

  if (tagResult.error) {
    return NextResponse.json(
      { error: tagResult.error.message },
      { status: 500 },
    );
  }
  if (assignmentResult.error) {
    return NextResponse.json(
      { error: assignmentResult.error.message },
      { status: 500 },
    );
  }

  const tagRows = (tagResult.data ?? []) as unknown as TagRow[];
  const assignmentRows = (assignmentResult.data ??
    []) as unknown as TagAssignmentRow[];

  const refs = await resolveEntityRefs(supabase, assignmentRows);

  const tags: Tag[] = tagRows.map(rowToTag);
  const assignments: TagAssignment[] = [];
  for (const row of assignmentRows) {
    const ref = refs.get(row.entity_id);
    // A target that did not resolve is dropped rather than given a ref of 0.
    // Zero is a real number a screen would compare against and quietly match.
    if (ref === undefined) continue;
    assignments.push(rowToTagAssignment(row, ref));
  }

  return NextResponse.json({ tags, assignments });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = tagWriteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a tag.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_tags")
    .insert(tagWriteToInsert(parsed.data, facility.facilityId, user.id))
    .select(TAG_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: `A ${parsed.data.type} tag named "${parsed.data.name}" already exists.`,
      denied: "You do not have permission to change this facility's tags.",
    });
  }

  return NextResponse.json(rowToTag(data as unknown as TagRow), {
    status: 201,
  });
}
