import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { instantFromWallClock } from "@/lib/time/facility-time";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Publishing a week.
//
// ── WHY THIS IS NOT N CALLS TO PATCH ──────────────────────────────────────
//
// Publishing is one decision about a whole week, and a rota half-published is a
// rota nobody can act on: some people see their Tuesday and some do not, with
// no way to tell which from the screen. One statement either publishes the
// window or leaves it alone.
//
// ── AND NOT `update … where status = 'draft'` WITHOUT A WINDOW ────────────
//
// A facility plans several weeks ahead. Publishing "the drafts" would push out
// next month's half-finished rota along with this week's finished one, which is
// the kind of mistake that is only visible to the people it inconveniences.
//
// ── THE WINDOW IS IN THE FACILITY'S OWN TIME ──────────────────────────────
//
// Same trap as the roster read: `${from}T00:00:00Z` is not the start of a
// facility day, and a night shift stored as tomorrow-in-UTC would be left
// unpublished by a window that looked right.
// ============================================================================

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface PublishInput {
  departmentId?: string;
  from?: string;
  to?: string;
}

export interface PublishResult {
  published: number;
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

  const input = (await request.json().catch(() => ({}))) as PublishInput;

  if (
    !input.departmentId ||
    !input.from ||
    !DATE.test(input.from) ||
    !input.to ||
    !DATE.test(input.to)
  ) {
    return NextResponse.json(
      { error: "A department and a `from`/`to` window as YYYY-MM-DD." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // ── ASKED FIRST, SO THAT ZERO MEANS ZERO ────────────────────────────────
  //
  // RLS gates the write on `scheduling_edit_shifts`, and a refused UPDATE
  // affects no rows without raising — which here is indistinguishable from a
  // week that simply had no drafts in it. Both would report "0 published", and
  // one of those is a lie of omission to somebody who is not allowed to do this.
  //
  // `scheduling_publish` is the catalogue's own key for this act and it is
  // NARROWER than editing on purpose: owner, admin and manager hold it, and a
  // supervisor — who may drag a shift around all day — does not. Publishing a
  // week is announcing it to everybody on it.
  const { data: permissions } = await supabase.rpc("my_permissions");
  const mayPublish = (
    (permissions ?? []) as { permission_key: string; scope: string }[]
  ).some(
    (entry) =>
      entry.permission_key === "scheduling_publish" && entry.scope !== "none",
  );

  if (!mayPublish) {
    return NextResponse.json(
      { error: "You do not have permission to publish schedules." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("staff_shifts")
    .update({ status: "published" } as never)
    .eq("department_id", input.departmentId)
    .eq("status", "draft")
    .gte(
      "starts_at",
      instantFromWallClock(input.from, "00:00", context.timeZone),
    )
    .lte("starts_at", instantFromWallClock(input.to, "23:59", context.timeZone))
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "Those shifts could not be published.",
      denied: "You do not have permission to publish schedules.",
    });
  }

  // Zero rows is now unambiguous: the permission was established above, so this
  // is a window with no drafts in it — an ordinary thing to publish twice.
  // `deniedIfUntouched` would turn "nothing to do" into "you may not".
  return NextResponse.json({
    published: (data ?? []).length,
  } satisfies PublishResult);
}
