import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import {
  toDepartment,
  toPosition,
  type DepartmentRow,
  type PositionPayRow,
  type PositionRow,
} from "@/lib/api/mappers/scheduling";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import type { Department, Position } from "@/types/scheduling";

// ============================================================================
// A facility's departments and positions — the shape a roster is built on.
//
// ── ONE ROUTE FOR BOTH, BECAUSE NOTHING EVER WANTS ONE ────────────────────
//
// A position without its department is a name with no place in the
// organisation, and every screen that draws one draws the other. Two endpoints
// would mean two round trips and a moment where the page has half an org chart.
//
// ── THE PAY IS A SEPARATE READ, AND THAT IS THE POINT ─────────────────────
//
// `facility_position_pay` has its own policy: `scheduling_view_labor_cost`,
// which owner, admin, manager and ACCOUNTANT hold. A caller without it gets
// zero rows from that table — not an error, not a zero, just nothing — and the
// mapper leaves `hourlyRate` and `salary` undefined.
//
// So this route does not check a permission before reading pay. It asks, and
// RLS answers. A route that decided for itself would be a second opinion about
// the same question, and the two would drift.
// ============================================================================

export const dynamic = "force-dynamic";

export interface SchedulingStructure {
  departments: Department[];
  positions: Position[];
  /** False when the caller cannot see labour cost — so a screen can say so. */
  canSeePay: boolean;
}

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();

  const [departments, positions, pay, members, permissions] = await Promise.all(
    [
      supabase
        .from("facility_departments")
        .select(
          "id, facility_id, name, color, description, is_active, created_at",
        )
        .order("name"),
      supabase
        .from("facility_positions")
        .select(
          "id, facility_id, department_id, name, color, description, is_active",
        )
        .order("name"),
      supabase
        .from("facility_position_pay")
        .select("position_id, pay_type, hourly_rate, salary"),
      supabase.from("staff_departments").select("staff_id, department_id"),
      supabase.rpc("my_permissions"),
    ],
  );

  if (departments.error) {
    return NextResponse.json(
      { error: departments.error.message },
      { status: 500 },
    );
  }

  const payByPosition = new Map<string, PositionPayRow>(
    ((pay.data ?? []) as PositionPayRow[]).map((row) => [row.position_id, row]),
  );

  const staffByDepartment = new Map<string, string[]>();
  for (const link of (members.data ?? []) as {
    staff_id: string;
    department_id: string;
  }[]) {
    const list = staffByDepartment.get(link.department_id) ?? [];
    list.push(link.staff_id);
    staffByDepartment.set(link.department_id, list);
  }

  return NextResponse.json({
    departments: ((departments.data ?? []) as DepartmentRow[]).map((row) =>
      toDepartment(
        row,
        staffByDepartment.get(row.id) ?? [],
        context.legacyRef ?? 0,
      ),
    ),
    positions: ((positions.data ?? []) as PositionRow[]).map((row) =>
      toPosition(row, payByPosition.get(row.id) ?? null),
    ),
    // ASKED, not inferred. The first version read `pay.error === null`, and
    // RLS does not error — it returns zero rows — so every caller was told they
    // could see pay, including the groomer the separate table exists to keep
    // out. `my_permissions()` is the cascade's own answer to the same question
    // the policy asks.
    // The SCOPE, not the presence of the key. `my_permissions()` returns a row
    // for every permission in the catalogue with the scope it resolved to, and
    // `none` is one of them — so asking "is the key there" said yes for the
    // groomer this separate table exists to keep out. `private.has_permission`,
    // which the policy uses, is `scope <> 'none'`; this has to mean the same.
    canSeePay: (
      (permissions.data ?? []) as { permission_key: string; scope: string }[]
    ).some(
      (entry) =>
        entry.permission_key === "scheduling_view_labor_cost" &&
        entry.scope !== "none",
    ),
  } satisfies SchedulingStructure);
}

interface DepartmentInput {
  kind: "department";
  name?: string;
  color?: string;
  description?: string | null;
}

interface PositionInput {
  kind: "position";
  name?: string;
  departmentId?: string;
  color?: string;
  description?: string | null;
  payType?: "hourly" | "salary";
  hourlyRate?: number | null;
  salary?: number | null;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as
    | DepartmentInput
    | PositionInput;

  if (!input.name?.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 422 });
  }

  const supabase = await createServerClient();

  if (input.kind === "department") {
    const { data, error } = await supabase
      .from("facility_departments")
      .insert({
        facility_id: context.facilityId,
        name: input.name.trim(),
        ...(input.color ? { color: input.color } : {}),
        description: input.description ?? null,
      } as never)
      .select(
        "id, facility_id, name, color, description, is_active, created_at",
      )
      .maybeSingle();

    // A refusal here is RLS saying this caller may not shape the organisation,
    // and it is a 403 rather than a 500 — "you may not do this" is not a bug.
    if (error) {
      return writeFailure(error, {
        duplicate: `This facility already has a department called "${input.name.trim()}".`,
        denied: "You do not have permission to add a department.",
      });
    }
    if (!data) {
      return NextResponse.json(
        { error: "You do not have permission to add a department." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      toDepartment(data as DepartmentRow, [], context.legacyRef ?? 0),
      { status: 201 },
    );
  }

  if (!input.departmentId) {
    return NextResponse.json(
      { error: "A position belongs to a department." },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("facility_positions")
    .insert({
      facility_id: context.facilityId,
      department_id: input.departmentId,
      name: input.name.trim(),
      ...(input.color ? { color: input.color } : {}),
      description: input.description ?? null,
    } as never)
    .select(
      "id, facility_id, department_id, name, color, description, is_active",
    )
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: `This facility already has a position called "${input.name.trim()}".`,
      denied: "You do not have permission to add a position.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to add a position." },
      { status: 403 },
    );
  }

  const row = data as PositionRow;

  // Pay is written only when it was given, and its own policy decides whether
  // this caller may. A failure does NOT undo the position: the position is real
  // and useful without a rate on it.
  //
  // But it is REPORTED. The first version swallowed the error, and the pay was
  // being refused at the table-PRIVILEGE level — `revoke all` had taken INSERT
  // with it, and RLS cannot grant back what the role does not hold — so a
  // facility set a wage, saw no complaint, and got a position with no rate.
  // A write that quietly does nothing is the exact shape this project keeps
  // finding.
  let payRow: PositionPayRow | null = null;
  let payProblem: string | null = null;

  if (input.payType) {
    const { data: saved, error: payError } = await supabase
      .from("facility_position_pay")
      .insert({
        position_id: row.id,
        facility_id: context.facilityId,
        pay_type: input.payType,
        hourly_rate: input.hourlyRate ?? null,
        salary: input.salary ?? null,
      } as never)
      .select("position_id, pay_type, hourly_rate, salary")
      .maybeSingle();

    payRow = (saved as PositionPayRow | null) ?? null;
    if (payError || !payRow) {
      payProblem =
        payError?.message ??
        "The position was created, but you do not have permission to set what it pays.";
    }
  }

  return NextResponse.json(
    { ...toPosition(row, payRow), ...(payProblem ? { payProblem } : {}) },
    { status: 201 },
  );
}

/**
 * Remove a position or a department.
 *
 * Both references are RESTRICT in the schema, on purpose: a shift pointing at a
 * deleted position is a shift nobody can describe, and a position in a deleted
 * department is a role with no place in the organisation. So this does not
 * cascade — it refuses, and says what is still in the way.
 *
 * That refusal arrives from Postgres as 23503, and it is a 409 rather than a
 * 500: "there is still something here" is an answer, not a fault.
 */
export async function DELETE(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const departmentId = params.get("department");
  const positionId = params.get("position");

  if (!departmentId && !positionId) {
    return NextResponse.json(
      { error: "Name a `department` or a `position` to remove." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const table = positionId ? "facility_positions" : "facility_departments";
  const id = positionId ?? departmentId!;

  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        {
          error: positionId
            ? "That position still has shifts on it. Remove them first."
            : "That department still has positions in it. Remove them first.",
        },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      duplicate: "That could not be removed.",
      denied: "You do not have permission to change the organisation.",
    });
  }

  // 0 rows and no error is an RLS refusal, not a success — see
  // check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    "Nothing you can remove with that id.",
  );
  if (refused) return refused;

  return NextResponse.json({ removed: id });
}

interface DepartmentPatch {
  kind: "department";
  id?: string;
  name?: string;
  color?: string;
  description?: string | null;
  isActive?: boolean;
}

interface PositionPatch {
  kind: "position";
  id?: string;
  name?: string;
  departmentId?: string;
  color?: string;
  description?: string | null;
  isActive?: boolean;
  payType?: "hourly" | "salary";
  hourlyRate?: number | null;
  salary?: number | null;
}

/**
 * Rename a department, move a position, change what it pays.
 *
 * ── THIS DID NOT EXIST, AND THAT WAS THE GAP ──────────────────────────────
 *
 * The Departments and Positions screens — where a facility SETS SCHEDULING UP
 * — held everything in `useState` over a fixture, while the calendar, the
 * roster and payroll all read the real tables. So a facility could add a
 * department, watch it appear, reload, and find it gone, with the calendar next
 * door reading a table that screen could not write to.
 *
 * Reading was converted first and the editors were not. That is worse than
 * leaving both alone: before, everything was equally unreal.
 *
 * ── PAY IS UPSERTED SEPARATELY, AND MAY FAIL ON ITS OWN ───────────────────
 *
 * `facility_position_pay` has its own policy, so a caller may be allowed to
 * rename a position and not to change its rate. The rename stands and the pay
 * problem is REPORTED — the same shape as POST, and for the same reason: a
 * write that quietly does nothing is what this project keeps finding.
 */
export async function PATCH(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as
    | DepartmentPatch
    | PositionPatch;

  if (!input.id) {
    return NextResponse.json({ error: "`id` is required." }, { status: 400 });
  }
  if (input.name !== undefined && !input.name.trim()) {
    return NextResponse.json(
      { error: "A name cannot be blank." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.color !== undefined) patch.color = input.color;
  if (input.description !== undefined) patch.description = input.description;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  if (input.kind === "department") {
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Nothing to change." },
        { status: 422 },
      );
    }

    const { data, error } = await supabase
      .from("facility_departments")
      .update(patch as never)
      .eq("id", input.id)
      .select(
        "id, facility_id, name, color, description, is_active, created_at",
      );

    if (error) {
      return writeFailure(error, {
        duplicate: "This facility already has a department with that name.",
        denied: "You do not have permission to change a department.",
      });
    }

    // An RLS-refused UPDATE affects 0 rows and does NOT raise — see
    // check:rls-writes.
    const refused = deniedIfUntouched(
      data,
      "No department you can change with that id.",
    );
    if (refused) return refused;

    return NextResponse.json(
      toDepartment((data as DepartmentRow[])[0]!, [], context.legacyRef ?? 0),
    );
  }

  if (input.departmentId !== undefined)
    patch.department_id = input.departmentId;

  let row: PositionRow | null = null;

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase
      .from("facility_positions")
      .update(patch as never)
      .eq("id", input.id)
      .select(
        "id, facility_id, department_id, name, color, description, is_active",
      );

    if (error) {
      return writeFailure(error, {
        duplicate: "This facility already has a position with that name.",
        denied: "You do not have permission to change a position.",
      });
    }

    const refused = deniedIfUntouched(
      data,
      "No position you can change with that id.",
    );
    if (refused) return refused;

    row = (data as PositionRow[])[0]!;
  } else {
    const { data } = await supabase
      .from("facility_positions")
      .select(
        "id, facility_id, department_id, name, color, description, is_active",
      )
      .eq("id", input.id)
      .maybeSingle();
    row = (data as PositionRow | null) ?? null;
  }

  if (!row) {
    return NextResponse.json(
      { error: "No position you can change with that id." },
      { status: 404 },
    );
  }

  let payRow: PositionPayRow | null = null;
  let payProblem: string | null = null;

  if (input.payType) {
    const { data: saved, error: payError } = await supabase
      .from("facility_position_pay")
      .upsert(
        {
          position_id: row.id,
          facility_id: context.facilityId,
          pay_type: input.payType,
          hourly_rate: input.hourlyRate ?? null,
          salary: input.salary ?? null,
        } as never,
        { onConflict: "position_id" },
      )
      .select("position_id, pay_type, hourly_rate, salary")
      .maybeSingle();

    payRow = (saved as PositionPayRow | null) ?? null;
    if (payError || !payRow) {
      payProblem =
        payError?.message ??
        "The position was updated, but you do not have permission to change what it pays.";
    }
  } else {
    const { data: existing } = await supabase
      .from("facility_position_pay")
      .select("position_id, pay_type, hourly_rate, salary")
      .eq("position_id", row.id)
      .maybeSingle();
    payRow = (existing as PositionPayRow | null) ?? null;
  }

  return NextResponse.json({
    ...toPosition(row, payRow),
    ...(payProblem ? { payProblem } : {}),
  });
}

interface MembersInput {
  departmentId?: string;
  /** The COMPLETE set. Anybody not named is removed. */
  employeeIds?: string[];
}

/**
 * Set who is in a department.
 *
 * ── `staff_departments` HAD NO WRITER AT ALL ──────────────────────────────
 *
 * The table shipped with the roster, this route READ it into
 * `Department.employeeIds`, and nothing anywhere populated it — so every
 * department had zero declared members. The calendar only drew anybody because
 * it falls back to "plus whoever is rostered this week".
 *
 * ── A COMPLETE SET, NOT A DIFF ────────────────────────────────────────────
 *
 * The screen is a checklist: you tick people and save. Sending the additions
 * and removals separately would make the result depend on the order two
 * managers pressed Save. Delete-then-insert inside one request means the
 * department has the membership the last writer saw, whole.
 */
export async function PUT(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as MembersInput;

  if (!input.departmentId || !Array.isArray(input.employeeIds)) {
    return NextResponse.json(
      { error: "A `departmentId` and the complete `employeeIds` set." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // Clearing a department that has no members legitimately removes 0 rows, so
  // `deniedIfUntouched` would turn "nothing to do" into "you may not". The
  // refusal is caught below by comparing the membership READ BACK against the
  // one requested — exact, rather than inferred from a row count.
  //
  // rls-write-ok: the read-back comparison below answers 403 on a refusal.
  const { error: cleared } = await supabase
    .from("staff_departments")
    .delete()
    .eq("department_id", input.departmentId);

  if (cleared) {
    return writeFailure(cleared, {
      duplicate: "That membership could not be changed.",
      denied: "You do not have permission to change who is in a department.",
    });
  }

  if (input.employeeIds.length > 0) {
    const { error } = await supabase.from("staff_departments").insert(
      input.employeeIds.map((staffId) => ({
        staff_id: staffId,
        department_id: input.departmentId,
        facility_id: context.facilityId,
      })) as never,
    );

    if (error) {
      return writeFailure(error, {
        duplicate: "Somebody is listed twice.",
        denied: "You do not have permission to change who is in a department.",
      });
    }
  }

  // Read it back rather than echoing the request: an RLS-refused DELETE removes
  // nothing and raises nothing, so a route that reported the set it was SENT
  // would confirm a change it had not made.
  const { data } = await supabase
    .from("staff_departments")
    .select("staff_id")
    .eq("department_id", input.departmentId);

  const saved = ((data ?? []) as { staff_id: string }[]).map(
    (row) => row.staff_id,
  );

  // ── THE REFUSAL, CAUGHT EXACTLY ─────────────────────────────────────────
  //
  // If the membership is not what was asked for, the write did not take —
  // which for this endpoint means the DELETE was refused and the insert never
  // ran (an empty set has nothing to insert, so nothing would have raised).
  // Reporting 200 here would be a screen saying "saved" over an unchanged
  // department.
  const asked = new Set(input.employeeIds);
  const unchanged =
    saved.length !== asked.size || saved.some((id) => !asked.has(id));

  if (unchanged) {
    return NextResponse.json(
      { error: "You do not have permission to change who is in a department." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    departmentId: input.departmentId,
    employeeIds: saved,
  });
}
