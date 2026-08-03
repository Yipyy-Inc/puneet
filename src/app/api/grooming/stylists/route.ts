import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  STYLIST_PROFILE_SELECT,
  rowToAvailability,
  rowToStylist,
  stylistAppId,
  type AvailabilityRow,
  type StylistProfileRow,
  type StylistStatsRow,
} from "@/lib/api/mappers/stylists";

// ============================================================================
// Groomers and the hours they work.
//
// ── ONE ROUTE, BOTH LISTS ─────────────────────────────────────────────────
//
// Availability is keyed by STAFF in the database and by STYLIST in the app, so
// serving it needs the profile lookup anyway. Splitting them into two routes
// would mean building that lookup twice per page — every screen that shows a
// schedule shows the groomers too.
//
// ── A GROOMER WITH NO PROFILE IS NOT A STYLIST ────────────────────────────
//
// Three groomers at this facility have staff records and no grooming profile.
// They are absent here, deliberately: `Stylist` promises a skill level, a
// capacity and a specialisation list, and inventing defaults for someone
// nobody has assessed would put a fabricated "standard / 6 a day" groomer into
// the assignment picker.
//
// The stylists ADMIN page is the one screen that must see them, and it already
// does it correctly — it reads the staff roster itself and marks
// `hasGroomingProfile: false`. That is the right split: the roster is a staff
// question, and this route answers a grooming one.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("grooming_stylist_profiles")
    .select(STYLIST_PROFILE_SELECT)
    .order("legacy_id", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as StylistProfileRow[];
  if (rows.length === 0) {
    return NextResponse.json({ stylists: [], availability: [] });
  }

  const staffIds = rows.map((r) => r.staff_id);
  const [{ data: statsRows }, { data: availabilityRows }] = await Promise.all([
    supabase
      .from("grooming_stylist_stats")
      .select("staff_id, total_appointments")
      .in("staff_id", staffIds),
    supabase
      .from("grooming_stylist_availability")
      .select("id, staff_id, day_of_week, start_time, end_time, is_available")
      .in("staff_id", staffIds)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const statsByStaff = new Map<string, StylistStatsRow>(
    ((statsRows ?? []) as unknown as StylistStatsRow[]).map((s) => [
      s.staff_id,
      s,
    ]),
  );

  const stylists = rows.map((row) =>
    rowToStylist(row, statsByStaff.get(row.staff_id)),
  );

  // staff id → the stylist the app addresses. Built once from the rows already
  // in hand rather than re-queried.
  const byStaff = new Map<string, { id: string; name: string }>();
  rows.forEach((row, index) => {
    byStaff.set(row.staff_id, {
      id: stylistAppId(row),
      name: stylists[index]!.name,
    });
  });

  const availability = (
    (availabilityRows ?? []) as unknown as AvailabilityRow[]
  )
    .map((row) => {
      const stylist = byStaff.get(row.staff_id);
      // Hours belonging to a groomer with no grooming profile: the `.in()`
      // above already excludes them, so this is belt-and-braces rather than a
      // live case.
      if (!stylist) return null;
      return rowToAvailability(row, stylist.id, stylist.name);
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return NextResponse.json({ stylists, availability });
}
