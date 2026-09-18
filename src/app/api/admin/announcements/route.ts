import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  ANNOUNCEMENT_SELECT,
  announcementInputSchema,
  inputToColumns,
  rowToAnnouncement,
  type AnnouncementRow,
} from "@/lib/announcements/mapper";
import type { AnnouncementOptions } from "@/types/announcement";

// Platform announcements, for the super-admin (20260918103842). GET lists every
// one with what the composer's target pickers choose from; POST creates one.
// RLS admits only a platform admin; the check here only makes the answer a 403
// rather than an empty list.

export const dynamic = "force-dynamic";

async function platformAdmin() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return {
      viewer: null,
      refusal: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  if (!viewer.isPlatformAdmin) {
    return {
      viewer: null,
      refusal: NextResponse.json(
        { error: "Only a platform administrator manages announcements." },
        { status: 403 },
      ),
    };
  }
  return { viewer, refusal: null };
}

export async function GET() {
  const { refusal } = await platformAdmin();
  if (refusal) return refusal;

  const supabase = await createServerClient();
  const [announcements, tiers, facilities] = await Promise.all([
    supabase
      .from("platform_announcements")
      .select(ANNOUNCEMENT_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("subscription_tiers")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("facilities").select("id, name").order("name"),
  ]);
  if (announcements.error) {
    return NextResponse.json(
      { error: announcements.error.message },
      { status: 500 },
    );
  }
  const now = Date.now();
  const options: AnnouncementOptions = {
    tiers: tiers.data ?? [],
    facilities: facilities.data ?? [],
  };
  return NextResponse.json({
    announcements: (announcements.data as unknown as AnnouncementRow[]).map(
      (row) => rowToAnnouncement(row, now),
    ),
    options,
  });
}

export async function POST(request: NextRequest) {
  const { viewer, refusal } = await platformAdmin();
  if (refusal) return refusal;

  const parsed = announcementInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid announcement." },
      { status: 422 },
    );
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("platform_announcements")
    .insert({
      ...inputToColumns(parsed.data, null, new Date().toISOString()),
      author_name: viewer?.fullName ?? viewer?.email ?? null,
    } as never)
    .select(ANNOUNCEMENT_SELECT)
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Only a platform administrator manages announcements.",
      duplicate: "That announcement already exists.",
    });
  }
  return NextResponse.json(
    rowToAnnouncement(data as unknown as AnnouncementRow, Date.now()),
    { status: 201 },
  );
}
