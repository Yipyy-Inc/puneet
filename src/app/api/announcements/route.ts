import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import {
  activeRowToAnnouncement,
  type ActiveAnnouncementRow,
} from "@/lib/announcements/mapper";

// The platform announcements live for the facility this portal is showing,
// with the caller's own read / dismissed state (20260918103842). With nothing
// published, this is an empty list and the banner and bell show nothing.
// The facility comes from the session, never the request.

export const dynamic = "force-dynamic";

export async function GET() {
  const facilityId = await activeFacilityIdForStaff();
  if (!facilityId) return NextResponse.json([]);
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("active_platform_announcements", {
    p_facility_id: facilityId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as ActiveAnnouncementRow[]).map(
      activeRowToAnnouncement,
    ),
  );
}
