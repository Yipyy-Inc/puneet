import { getViewer } from "@/lib/auth/viewer";
import { refuse } from "@/lib/auth/passkeys";
import { createWorkosServerClient } from "@/lib/supabase/workos-server";

// ============================================================================
// The caller's own passkeys, for the settings card.
//
// No filter by owner in the query, because there is nothing to filter: the
// select policy on `user_passkeys` is `profile_id = auth.jwt()->>'sub'`, so the
// session client cannot see anyone else's rows. Adding `.eq("profile_id", …)`
// here would duplicate the rule in a second place that could later disagree
// with the first.
//
// `emailVerified` is deliberately NOT required to LIST. Someone who cannot yet
// enrol should still be able to see and revoke what they already have — the
// verification gate exists to stop a passkey minting a session, not to hide
// somebody's own devices from them.
// ============================================================================

export async function GET() {
  const viewer = await getViewer();
  if (viewer.source !== "session") return refuse(401, "Sign in first.");

  const { data, error } = await createWorkosServerClient()
    .from("user_passkeys")
    .select(
      "credential_id, nickname, transports, backed_up, created_at, last_used_at",
    )
    .order("created_at", { ascending: false });

  if (error) return refuse(500, "Could not read your passkeys.");

  return Response.json({ passkeys: data ?? [] });
}
