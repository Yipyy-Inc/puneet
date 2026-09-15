import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import {
  NO_PREFERENCES,
  notificationPreferencesSchema,
  notificationRoleDefaultsSchema,
  SHIPPED_NOTIFICATION_ROLE_DEFAULTS,
  STAFF_ROLES,
  type StaffRole,
} from "@/lib/notifications/catalog";
import type { MyNotificationSettings } from "@/lib/notifications/types";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Your own notification preferences at this facility.
//
// They were a localStorage map keyed by a staff id, read by nothing but the
// screen that wrote them. Now one row per membership, read by `notify_staff`
// when it decides who hears about what — through two functions that act on
// the CALLER's membership only, so there is no id in the request to aim at
// somebody else's switches.
//
// GET returns the role and the facility's role defaults too, so the screen can
// show what each untouched switch currently follows.
// ============================================================================

export const dynamic = "force-dynamic";

interface PreferenceRow {
  membership_id: string;
  role: string;
  in_app: unknown;
  email: unknown;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const readMine = supabase.rpc.bind(supabase) as unknown as (
    fn: "my_notification_preferences",
    args: { p_facility_id: string },
  ) => PromiseLike<{
    data: PreferenceRow[] | null;
    error: { message: string } | null;
  }>;

  const [mine, settings] = await Promise.all([
    readMine("my_notification_preferences", {
      p_facility_id: facility.facilityId,
    }),
    supabase
      .from("facility_settings")
      .select("value")
      .eq("facility_id", facility.facilityId)
      .eq("domain", "notification_role_defaults")
      .maybeSingle(),
  ]);
  if (mine.error) {
    return NextResponse.json({ error: mine.error.message }, { status: 500 });
  }

  const row = mine.data?.[0];
  const preferences = row
    ? notificationPreferencesSchema.safeParse({
        inApp: row.in_app,
        email: row.email,
      })
    : null;
  const stored = notificationRoleDefaultsSchema.safeParse(
    (settings.data as { value?: unknown } | null)?.value,
  );
  const role = STAFF_ROLES.find((r) => r === row?.role) ?? null;

  const body: MyNotificationSettings = {
    role: role as StaffRole | null,
    preferences: preferences?.success ? preferences.data : NO_PREFERENCES,
    roleDefaults: stored.success
      ? stored.data
      : SHIPPED_NOTIFICATION_ROLE_DEFAULTS,
  };
  return NextResponse.json(body);
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const parsed = notificationPreferencesSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Those are not notification preferences." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const save = supabase.rpc.bind(supabase) as unknown as (
    fn: "save_my_notification_preferences",
    args: { p_facility_id: string; p_in_app: unknown; p_email: unknown },
  ) => PromiseLike<{ error: { code?: string; message: string } | null }>;
  const { error } = await save("save_my_notification_preferences", {
    p_facility_id: facility.facilityId,
    p_in_app: parsed.data.inApp,
    p_email: parsed.data.email,
  });
  if (error) {
    return error.code === "42501"
      ? NextResponse.json(
          { error: "You are not on this facility's team." },
          { status: 403 },
        )
      : NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
}
