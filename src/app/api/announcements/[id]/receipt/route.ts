import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// The caller has read or dismissed one announcement. A receipt is theirs alone
// (RLS: profile_id is the session's), so a dismissal follows the person across
// devices rather than living in one browser's storage (20260918103842).

export const dynamic = "force-dynamic";

const bodySchema = z.object({ action: z.enum(["read", "dismiss"]) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown action." }, { status: 422 });
  }
  const { id } = await params;
  const now = new Date().toISOString();
  const supabase = await createServerClient();

  // An upsert with only the one column: marking read never clears a dismissal.
  const { error } = await supabase
    .from("platform_announcement_receipts")
    .upsert(
      (parsed.data.action === "dismiss"
        ? { announcement_id: id, read_at: now, dismissed_at: now }
        : { announcement_id: id, read_at: now }) as never,
      { onConflict: "announcement_id,profile_id" },
    );
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to mark this announcement.",
      duplicate: "Already marked.",
    });
  }
  return new NextResponse(null, { status: 204 });
}
