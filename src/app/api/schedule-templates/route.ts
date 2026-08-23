import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  TEMPLATE_SELECT,
  toScheduleTemplateRow,
  type ScheduleTemplateRecord,
  type ScheduleTemplateRow,
} from "@/lib/api/mappers/schedule-template";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

// ============================================================================
// Schedule templates: the week a facility keeps re-typing.
//
// ── THE LINES COME BACK WITH THE TEMPLATE ─────────────────────────────────
//
// A template with no shifts is a name, so the list embeds them rather than
// making the screen fetch each one. Applied weeks come too, because "have we
// already done this week?" is the first question anybody asks of this screen
// and answering it per-row would be a request per template.
//
// ── TIMES ARE STRINGS AND STAY STRINGS ────────────────────────────────────
//
// "08:00" means eight in the morning where the kennels are. It becomes an
// instant exactly once, inside `apply_schedule_template`, using the facility's
// own timezone. Nothing on this path may turn it into a Date.
// ============================================================================

export const dynamic = "force-dynamic";

export interface TemplatesPayload {
  templates: ScheduleTemplateRow[];
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("schedule_templates")
    .select(TEMPLATE_SELECT)
    .order("name");

  const context = await getFacilityContext();
  if (context) query = query.eq("facility_id", context.facilityId);

  // Retired templates are hidden by default and reachable on purpose: weeks
  // already applied from one still point at it.
  if (params.get("includeRetired") !== "1") query = query.eq("is_active", true);

  const departmentId = params.get("departmentId");
  if (departmentId) query = query.eq("department_id", departmentId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload: TemplatesPayload = {
    templates: (data as unknown as ScheduleTemplateRecord[]).map(
      toScheduleTemplateRow,
    ),
  };
  return NextResponse.json(payload);
}

export interface CreateTemplateResult {
  template: ScheduleTemplateRow;
}

interface ShiftInput {
  dayOfWeek?: number;
  staffId?: string | null;
  departmentId?: string;
  positionId?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  slots?: number;
  requiredSkills?: string[];
}

/** "08:00" or "08:00:00". Anything else is a typo, not a time. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function badShift(shift: ShiftInput, index: number): string | null {
  if (
    shift.dayOfWeek === undefined ||
    !Number.isInteger(shift.dayOfWeek) ||
    shift.dayOfWeek < 0 ||
    shift.dayOfWeek > 6
  ) {
    return `Line ${index + 1}: a day of the week is 0 (Sunday) to 6 (Saturday).`;
  }
  if (!shift.departmentId || !shift.positionId) {
    return `Line ${index + 1}: a shift needs a department and a position.`;
  }
  if (!shift.startTime || !TIME.test(shift.startTime)) {
    return `Line ${index + 1}: '${shift.startTime ?? ""}' is not a start time.`;
  }
  if (!shift.endTime || !TIME.test(shift.endTime)) {
    return `Line ${index + 1}: '${shift.endTime ?? ""}' is not an end time.`;
  }
  // NO check that the end is after the start. A night shift runs 22:00 to
  // 06:00 and refusing that would refuse the night shift.
  if (
    shift.slots !== undefined &&
    (!Number.isInteger(shift.slots) || shift.slots < 1)
  ) {
    return `Line ${index + 1}: a shift covers at least one person.`;
  }
  if (
    shift.breakMinutes !== undefined &&
    (!Number.isInteger(shift.breakMinutes) || shift.breakMinutes < 0)
  ) {
    return `Line ${index + 1}: a break cannot be negative.`;
  }
  return null;
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
    departmentId?: string | null;
    shifts?: ShiftInput[];
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A template needs a name." },
      { status: 400 },
    );
  }

  const shifts = body?.shifts ?? [];
  for (let i = 0; i < shifts.length; i += 1) {
    const complaint = badShift(shifts[i], i);
    if (complaint) {
      return NextResponse.json({ error: complaint }, { status: 400 });
    }
  }

  // The FACILITY comes from the session, never the request.
  const insert: TablesInsert<"schedule_templates"> = {
    facility_id: context.facilityId,
    name,
    description: body?.description ?? null,
    department_id: body?.departmentId ?? null,
    created_by: viewer.userId,
  };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("schedule_templates")
    .insert(insert)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Building a schedule template needs permission to create shifts.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You are not allowed to create a schedule template." },
      { status: 403 },
    );
  }

  const templateId = (data as { id: string }).id;

  if (shifts.length > 0) {
    const { error: lineError } = await supabase
      .from("schedule_template_shifts")
      .insert(
        shifts.map((shift, index) => ({
          template_id: templateId,
          day_of_week: shift.dayOfWeek as number,
          staff_id: shift.staffId ?? null,
          department_id: shift.departmentId as string,
          position_id: shift.positionId as string,
          start_time: shift.startTime as string,
          end_time: shift.endTime as string,
          break_minutes: shift.breakMinutes ?? 0,
          slots: shift.slots ?? 1,
          required_skills: shift.requiredSkills ?? [],
          sort_order: index,
        })),
      );
    if (lineError) {
      // The template exists and is empty. Better than deleting a row somebody
      // may already be looking at — the screen can add the lines again.
      return NextResponse.json(
        {
          error: `The template was created but its shifts were not added: ${lineError.message}`,
        },
        { status: 400 },
      );
    }
  }

  // Read back through the same select the list uses, so a caller gets the
  // template with its lines rather than a shape only this route produces.
  const { data: full } = await supabase
    .from("schedule_templates")
    .select(TEMPLATE_SELECT)
    .eq("id", templateId)
    .maybeSingle();

  const result: CreateTemplateResult = {
    template: toScheduleTemplateRow(full as unknown as ScheduleTemplateRecord),
  };
  return NextResponse.json(result, { status: 201 });
}
