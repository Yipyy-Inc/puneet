import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { AccessScope, PermissionKey } from "@/types/facility-staff";

// ============================================================================
// The signed-in viewer's effective permissions, as the DATABASE resolves them.
//
// Until now the browser computed this itself, from a mock staff array plus
// overrides held in localStorage. Two independent implementations of the same
// three-layer cascade — and the one the client could edit was the one the UI
// obeyed.
//
// This returns the map the database will actually enforce, so the two can no
// longer disagree. Note the direction of trust: this is a convenience for
// drawing the right UI, not the enforcement. RLS refuses the row regardless of
// what any client believes about its own permissions.
// ============================================================================

export const dynamic = "force-dynamic";

export type PermissionMap = Partial<Record<PermissionKey, AccessScope>>;

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("my_permissions");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map: PermissionMap = {};
  for (const row of data ?? []) {
    map[row.permission_key as PermissionKey] = row.scope;
  }

  return NextResponse.json(map);
}
