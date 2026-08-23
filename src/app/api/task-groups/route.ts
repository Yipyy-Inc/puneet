import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  GROUP_SELECT,
  toGroupRow,
  type TaskGroupRecord,
  type TaskGroupRow,
} from "@/lib/api/mappers/task-group";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

// ============================================================================
// The named sets of chores: a shift's opening list, a department's daily round.
//
// ── THE SCOPE DECIDES WHICH TARGET IS MEANINGFUL ──────────────────────────
//
// A shift group names a daypart; a position group names a department; and the
// table refuses a row claiming both or neither. The route mirrors that rather
// than letting the constraint be the error message, because "violates check
// constraint facility_task_groups_scope_target" is not a sentence anybody can
// act on.
//
// ── AN EMPTY `daysOfWeek` MEANS EVERY DAY ─────────────────────────────────
//
// Not "never". That is what the fixture meant and it is worth keeping — a
// morning checklist that runs daily should not require ticking seven boxes,
// and the generator reads it the same way.
// ============================================================================

export const dynamic = "force-dynamic";

export interface GroupsPayload {
  groups: TaskGroupRow[];
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("facility_task_groups")
    .select(GROUP_SELECT)
    .order("name");

  const context = await getFacilityContext();
  if (context) query = query.eq("facility_id", context.facilityId);

  const scope = params.get("scope");
  if (scope === "shift" || scope === "position") {
    query = query.eq("scope", scope);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload: GroupsPayload = {
    groups: (data as unknown as TaskGroupRecord[]).map(toGroupRow),
  };
  return NextResponse.json(payload);
}

export interface CreateGroupResult {
  group: TaskGroupRow;
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
    name?: string;
    description?: string | null;
    scope?: string;
    shiftKey?: string | null;
    departmentId?: string | null;
    daysOfWeek?: number[];
    isRecurring?: boolean;
    specificDate?: string | null;
    definitionIds?: string[];
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A group needs a name." },
      { status: 400 },
    );
  }

  if (body?.scope !== "shift" && body?.scope !== "position") {
    return NextResponse.json(
      { error: "A group is either a shift group or a position group." },
      { status: 400 },
    );
  }

  const SHIFTS = ["morning", "afternoon", "night"];
  if (body.scope === "shift") {
    if (!body.shiftKey || !SHIFTS.includes(body.shiftKey)) {
      return NextResponse.json(
        { error: `A shift group runs on ${SHIFTS.join(", ")}.` },
        { status: 400 },
      );
    }
  } else if (!body.departmentId) {
    return NextResponse.json(
      { error: "A position group needs a department." },
      { status: 400 },
    );
  }

  const isRecurring = body.isRecurring ?? true;
  if (!isRecurring && !body.specificDate) {
    return NextResponse.json(
      { error: "A one-off group needs the date it runs on." },
      { status: 400 },
    );
  }

  const insert: TablesInsert<"facility_task_groups"> = {
    facility_id: context.facilityId,
    name,
    description: body.description ?? null,
    scope: body.scope,
    shift_key: body.scope === "shift" ? body.shiftKey : null,
    department_id: body.scope === "position" ? body.departmentId : null,
    days_of_week: body.daysOfWeek ?? [],
    is_recurring: isRecurring,
    specific_date: isRecurring ? null : (body.specificDate ?? null),
    created_by: viewer.userId,
  };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_task_groups")
    .insert(insert)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Building a chore group needs permission to manage team tasks.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You are not allowed to create a chore group." },
      { status: 403 },
    );
  }

  const groupId = (data as { id: string }).id;

  // The chores, in the order they were given. A failure here leaves an empty
  // group rather than a half-filled one, and the screen can add to it — better
  // than deleting a group somebody may already be looking at.
  const definitionIds = body.definitionIds ?? [];
  if (definitionIds.length > 0) {
    const { error: itemError } = await supabase
      .from("facility_task_group_items")
      .insert(
        definitionIds.map((definitionId, index) => ({
          group_id: groupId,
          definition_id: definitionId,
          sort_order: index,
        })),
      );
    if (itemError) {
      return NextResponse.json(
        {
          error: `The group was created but its chores were not added: ${itemError.message}`,
        },
        { status: 400 },
      );
    }
  }

  // Read back through the same select the list uses, so the caller gets the
  // group with its chores rather than a shape only this route produces.
  const { data: full } = await supabase
    .from("facility_task_groups")
    .select(GROUP_SELECT)
    .eq("id", groupId)
    .maybeSingle();

  const result: CreateGroupResult = {
    group: toGroupRow(full as unknown as TaskGroupRecord),
  };
  return NextResponse.json(result, { status: 201 });
}
