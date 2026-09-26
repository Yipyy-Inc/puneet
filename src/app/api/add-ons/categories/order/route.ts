import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// "Sort the order of categories" (20260926223644).
//
// The body is every category id in its new order; each takes its position as
// `display_order`. Written row by row, and COUNTED: an UPDATE refused by RLS
// touches nothing and reports success, so a member without `manage_services`
// would otherwise watch the list reorder on screen and snap back on reload.
// ============================================================================

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
  } | null;
  const ids = Array.isArray(body?.ids) ? body.ids : null;
  if (
    !ids ||
    ids.length === 0 ||
    ids.length > 200 ||
    !ids.every((id): id is string => typeof id === "string" && UUID.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    return NextResponse.json(
      { error: "Send every category id once, in its new order." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  let moved = 0;
  for (const [position, id] of ids.entries()) {
    const { data, error } = await supabase
      .from("service_add_on_categories")
      .update({ display_order: position + 1 })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) {
      return writeFailure(error, {
        duplicate: "There is already a category with that name.",
        denied: "You do not have permission to sort these categories.",
      });
    }
    if (data) moved += 1;
  }

  if (moved !== ids.length) {
    return NextResponse.json(
      { error: "You do not have permission to sort these categories." },
      { status: 403 },
    );
  }

  return NextResponse.json({ moved });
}
