import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  DEFINITION_SELECT,
  toDefinitionRow,
  type TaskDefinitionRow,
} from "@/lib/api/mappers/task-group";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database";

// ============================================================================
// The chore library.
//
// ── `usedByGroups` IS WHY THE SCREEN CAN STOP OFFERING TO DELETE ──────────
//
// `facility_task_group_items.definition_id` is `on delete restrict`, so a chore
// a group names cannot be removed. A screen that offers a Delete button anyway
// gets a 409 for the ones people actually use — which is the worst kind of
// control, since it works right up until it matters. Counting the groups here
// lets the screen say "retire" instead, honestly, before anyone clicks.
// ============================================================================

export const dynamic = "force-dynamic";

export interface DefinitionsPayload {
  definitions: TaskDefinitionRow[];
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("facility_task_definitions")
    .select(DEFINITION_SELECT)
    .order("title");

  const context = await getFacilityContext();
  if (context) query = query.eq("facility_id", context.facilityId);

  // Retired chores are hidden by default and reachable on purpose: they are
  // still named by groups and still attached to work already done.
  if (params.get("includeRetired") !== "1") query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as Tables<"facility_task_definitions">[];

  // One extra query rather than an embed with a count: PostgREST can aggregate,
  // but a chore named by no group at all must come back as 0 rather than be
  // dropped, and an inner join is the easy way to lose exactly those.
  const { data: usage } = await supabase
    .from("facility_task_group_items")
    .select("definition_id")
    .in(
      "definition_id",
      rows.map((r) => r.id),
    );

  const counts = new Map<string, number>();
  for (const item of (usage ?? []) as { definition_id: string }[]) {
    counts.set(item.definition_id, (counts.get(item.definition_id) ?? 0) + 1);
  }

  const payload: DefinitionsPayload = {
    definitions: rows.map((row) =>
      toDefinitionRow(row, counts.get(row.id) ?? 0),
    ),
  };
  return NextResponse.json(payload);
}

export interface CreateDefinitionResult {
  definition: TaskDefinitionRow;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    category?: string;
    priority?: string;
    estimatedMinutes?: number | null;
    requiresPhoto?: boolean;
    requiresSignoff?: boolean;
  } | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json(
      { error: "A chore needs a name." },
      { status: 400 },
    );
  }

  const PRIORITIES = ["low", "medium", "high", "urgent"];
  if (body?.priority && !PRIORITIES.includes(body.priority)) {
    return NextResponse.json(
      { error: `A priority is one of ${PRIORITIES.join(", ")}.` },
      { status: 400 },
    );
  }

  // The FACILITY comes from the session, never the request.
  const insert: TablesInsert<"facility_task_definitions"> = {
    facility_id: context.facilityId,
    title,
    description: body?.description ?? null,
    category: body?.category ?? "general",
    priority: body?.priority ?? "medium",
    estimated_minutes: body?.estimatedMinutes ?? null,
    requires_photo: body?.requiresPhoto ?? false,
    requires_signoff: body?.requiresSignoff ?? false,
    created_by: viewer.userId,
  };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_task_definitions")
    .insert(insert)
    .select(DEFINITION_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Writing the chore list needs permission to manage team tasks.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You are not allowed to add to the chore list." },
      { status: 403 },
    );
  }

  const result: CreateDefinitionResult = {
    definition: toDefinitionRow(data as Tables<"facility_task_definitions">, 0),
  };
  return NextResponse.json(result, { status: 201 });
}
