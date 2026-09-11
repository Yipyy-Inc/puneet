import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// Mark a training session held — or put it back.
//
// Only the status moves (20260911143447: authenticated holds UPDATE on that
// column alone, and RLS admits check_in_out or training_manage_programs).
// The session view's "Complete session" changed the screen and nothing else,
// so a class that ran last week stayed "scheduled" on the calendar.
// ============================================================================

export const dynamic = "force-dynamic";

const STATUSES = new Set(["scheduled", "completed", "cancelled"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
  } | null;
  if (!body?.status || !STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: "A session is scheduled, completed or cancelled." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("training_series_sessions")
    .update({ status: body.status } as never)
    .eq("id", id)
    .select("id, status");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to mark this session.",
      duplicate: "That session is already marked.",
    });
  }
  const denied = deniedIfUntouched(data, "Not allowed to mark this session.");
  if (denied) return denied;

  return NextResponse.json(data?.[0] ?? null);
}
