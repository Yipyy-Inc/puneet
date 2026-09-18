import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  ANNOUNCEMENT_SELECT,
  announcementInputSchema,
  inputToColumns,
  rowToAnnouncement,
  type AnnouncementRow,
} from "@/lib/announcements/mapper";

// One platform announcement: edit it, publish it now, archive it, or delete
// it. Publishing is what makes it appear; archiving is what takes it down
// straight away, wherever it is showing (20260918103842).

export const dynamic = "force-dynamic";

const actionSchema = z.object({ action: z.enum(["publish", "archive"]) });

const DENIED = "Only a platform administrator manages announcements.";

async function refusal() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json({ error: DENIED }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const refused = await refusal();
  if (refused) return refused;
  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const supabase = await createServerClient();

  const { data: current, error: readError } = await supabase
    .from("platform_announcements")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json(
      { error: "That announcement does not exist." },
      { status: 404 },
    );
  }
  const now = new Date().toISOString();

  let columns: Record<string, unknown>;
  const action = actionSchema.safeParse(raw);
  if (action.success) {
    columns =
      action.data.action === "publish"
        ? {
            status: "published",
            // "Publish now" means now: a schedule it had is dropped.
            starts_at: null,
            published_at: now,
          }
        : { status: "archived" };
  } else {
    const parsed = announcementInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid announcement." },
        { status: 422 },
      );
    }
    columns = inputToColumns(
      parsed.data,
      (current as { published_at: string | null }).published_at,
      now,
    );
  }

  const { data, error } = await supabase
    .from("platform_announcements")
    .update(columns as never)
    .eq("id", id)
    .select(ANNOUNCEMENT_SELECT);
  if (error) {
    return writeFailure(error, {
      denied: DENIED,
      duplicate: "That announcement already exists.",
    });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;
  return NextResponse.json(
    rowToAnnouncement((data as unknown as AnnouncementRow[])[0], Date.now()),
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const refused = await refusal();
  if (refused) return refused;
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("platform_announcements")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: DENIED,
      duplicate: "That announcement cannot be deleted.",
    });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;
  return new NextResponse(null, { status: 204 });
}
