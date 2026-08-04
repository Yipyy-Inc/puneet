import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  OFFBOARDING_SELECT,
  actorIdsOf,
  rowToOffboardingInstance,
  type InstanceRow,
} from "@/lib/api/mappers/offboarding";
import { resolveActorNames } from "@/lib/api/actor-names";

// ============================================================================
// One staff member's offboarding record: read it, tick a task, untick a task.
//
// ADDRESSED BY `task_key`, NOT by the state row's uuid. The UI has always
// addressed offboarding tasks by their TEMPLATE id, and `task_key` is exactly
// that (offboarding_tasks.legacy_id, falling back to its uuid). Using the state
// row's own id would work today and break the first time a checklist is
// re-materialised, because those ids are regenerated and the template's are not.
//
// THE ROUTE DOES NOT DECIDE WHO COMPLETED THE TASK. `completed_by` is the
// session's user id, taken from the server-resolved session — never from the
// body. A caller-supplied actor on an audit field is a caller-supplied audit
// trail.
//
// `completed_at` is also set here rather than accepted, for the same reason:
// the one thing a completion record must not be is a time the client chose.
// ============================================================================

export const dynamic = "force-dynamic";

/** The instance id for a staff legacy id, or null if the caller cannot see it. */
async function resolveInstance(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  staffLegacyId: string,
): Promise<{ instanceId: string } | null> {
  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("legacy_id", staffLegacyId)
    .maybeSingle();
  if (!staff) return null;

  const { data: instance } = await supabase
    .from("offboarding_instances")
    .select("id")
    .eq("staff_id", staff.id)
    .maybeSingle();
  if (!instance) return null;

  return { instanceId: instance.id as string };
}

async function readBack(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  instanceId: string,
) {
  const { data, error } = await supabase
    .from("offboarding_instances")
    .select(OFFBOARDING_SELECT)
    .eq("id", instanceId)
    .single();
  if (error || !data) return null;

  const row = data as unknown as InstanceRow;
  const names = await resolveActorNames(supabase, actorIdsOf([row]));
  return rowToOffboardingInstance(row, names);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { staffId } = await params;
  const supabase = await createServerClient();

  const resolved = await resolveInstance(supabase, staffId);
  if (!resolved) {
    // No record and no permission look the same from here on purpose: this
    // endpoint should not confirm that a staff member exists to someone who
    // cannot read them.
    return NextResponse.json(
      { error: "No offboarding record for that staff member." },
      { status: 404 },
    );
  }

  const instance = await readBack(supabase, resolved.instanceId);
  if (!instance) {
    return NextResponse.json(
      { error: "Could not read that offboarding record." },
      { status: 500 },
    );
  }
  return NextResponse.json(instance);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { staffId } = await params;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    taskKey?: string;
    complete?: boolean;
    note?: string;
  } | null;

  if (body?.action !== "set-task" || !body.taskKey) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 422 });
  }

  const supabase = await createServerClient();

  const resolved = await resolveInstance(supabase, staffId);
  if (!resolved) {
    return NextResponse.json(
      { error: "No offboarding record for that staff member." },
      { status: 404 },
    );
  }

  const complete = body.complete !== false;

  // Reopening CLEARS the completion note as well as the timestamp and the
  // actor. A note that outlived the completion it described would read as
  // current — "ROE submitted, ref #XYZ" next to a task marked pending.
  const patch = complete
    ? {
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        completion_note: body.note?.trim() || null,
      }
    : { completed_at: null, completed_by: null, completion_note: null };

  const { data: touched, error } = await supabase
    .from("offboarding_task_states")
    .update(patch as never)
    .eq("instance_id", resolved.instanceId)
    .eq("task_key", body.taskKey)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to update this offboarding checklist.",
      // Not reachable through this path — the update is keyed by
      // (instance_id, task_key), which is the unique constraint itself — but
      // the helper takes both messages and a generic fallback beats a lie.
      duplicate: "That task has already been recorded.",
    });
  }
  const denied = deniedIfUntouched(
    touched,
    "Not allowed to update this offboarding checklist.",
  );
  if (denied) return denied;

  const instance = await readBack(supabase, resolved.instanceId);
  if (!instance) {
    return NextResponse.json(
      { error: "Could not read that offboarding record." },
      { status: 500 },
    );
  }
  return NextResponse.json(instance);
}
