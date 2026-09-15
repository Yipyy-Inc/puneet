import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Mark one of your notifications read or unread, archived or not.
//
// Through `set_my_notification_state`, which changes those two stamps on the
// caller's own row and nothing else — a notification is not the caller's to
// rewrite. Somebody else's id answers exactly as a missing one does.
// ============================================================================

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodySchema = z
  .object({
    read: z.boolean().optional(),
    archived: z.boolean().optional(),
  })
  .refine((b) => b.read !== undefined || b.archived !== undefined, {
    message: "Say whether it is read, archived, or both.",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "No such notification." },
      { status: 404 },
    );
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid change." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const setState = supabase.rpc.bind(supabase) as unknown as (
    fn: "set_my_notification_state",
    args: { p_id: string; p_read: boolean | null; p_archived: boolean | null },
  ) => PromiseLike<{
    data: boolean | null;
    error: { code?: string; message: string } | null;
  }>;
  const { error } = await setState("set_my_notification_state", {
    p_id: id,
    p_read: parsed.data.read ?? null,
    p_archived: parsed.data.archived ?? null,
  });
  if (error) {
    return error.code === "42501"
      ? NextResponse.json({ error: "No such notification." }, { status: 404 })
      : NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id, ...parsed.data });
}
