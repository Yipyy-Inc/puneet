import { NextResponse, type NextRequest } from "next/server";

import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import {
  isNotificationKind,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/lib/notifications/catalog";
import type {
  StaffNotification,
  StaffNotificationFeed,
} from "@/lib/notifications/types";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The signed-in person's notifications at this facility.
//
// Replaced a seeded localStorage array that every viewer shared, merged with
// four feeds derived in the browser. Rows are addressed to one person
// (lib/notifications/notify-staff.ts), and RLS returns only the caller's own,
// so there is no filter here that could be got wrong in a way that leaks
// somebody else's inbox. The facility is still scoped explicitly: somebody in
// two facilities reads one bell per facility (check:facility-scoped-reads).
//
//   GET  ?view=active|archive&category=<c>&limit=<n>
//   POST                         mark every unread one here read
// ============================================================================

export const dynamic = "force-dynamic";

const SELECT =
  "id, kind, category, urgent, params, link, read_at, archived_at, created_at";

interface Row {
  id: string;
  kind: string;
  category: string;
  urgent: boolean;
  params: Record<string, string | number> | null;
  link: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

function toNotification(row: Row): StaffNotification | null {
  if (!isNotificationKind(row.kind)) return null;
  return {
    id: row.id,
    kind: row.kind,
    category: row.category as NotificationCategory,
    urgent: row.urgent,
    params: row.params ?? {},
    link: row.link,
    read: row.read_at !== null,
    archived: row.archived_at !== null,
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const archive = params.get("view") === "archive";
  const asked = params.get("category");
  const category = NOTIFICATION_CATEGORIES.find((c) => c === asked);
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 200);

  const scope = await activeFacilityIdForStaff();
  const supabase = await createServerClient();

  let list = supabase
    .from("staff_notifications")
    .select(SELECT)
    .match(inFacility(scope))
    .order("created_at", { ascending: false })
    .limit(limit);
  list = archive
    ? list.not("archived_at", "is", null)
    : list.is("archived_at", null);
  if (category) list = list.eq("category", category);

  const [listed, counted] = await Promise.all([
    list,
    supabase
      .from("staff_notifications")
      .select("id", { count: "exact", head: true })
      .match(inFacility(scope))
      .is("read_at", null)
      .is("archived_at", null),
  ]);

  if (listed.error) {
    return NextResponse.json({ error: listed.error.message }, { status: 500 });
  }

  const feed: StaffNotificationFeed = {
    items: ((listed.data ?? []) as unknown as Row[])
      .map(toNotification)
      .filter((n): n is StaffNotification => n !== null),
    unread: counted.count ?? 0,
  };
  return NextResponse.json(feed);
}

export async function POST() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const markAll = supabase.rpc.bind(supabase) as unknown as (
    fn: "mark_all_my_notifications_read",
    args: { p_facility_id: string },
  ) => PromiseLike<{ data: number | null; error: { message: string } | null }>;
  const { data, error } = await markAll("mark_all_my_notifications_read", {
    p_facility_id: facility.facilityId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: data ?? 0 });
}
