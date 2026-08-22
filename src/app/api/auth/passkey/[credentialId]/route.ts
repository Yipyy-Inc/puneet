import type { NextRequest } from "next/server";

import { refuse } from "@/lib/auth/passkeys";
import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { createWorkosServerClient } from "@/lib/supabase/workos-server";

// ============================================================================
// Revoke one passkey.
//
// THROUGH THE SESSION CLIENT, NOT THE SERVICE ROLE. Deleting is the one write
// RLS can authorise on its own — the delete policy is
// `profile_id = auth.jwt()->>'sub'`, so the database refuses somebody else's
// credential without this route having to check anything. Enrolment needs the
// service role because no policy can validate an attestation; revocation needs
// nothing of the sort, and reaching for the bypass key here would throw that
// away.
//
// THE `.select()` IS LOAD-BEARING. A DELETE that RLS refuses does not raise —
// the row is invisible to the statement, so it removes nothing and PostgREST
// answers success. Without counting what was removed, this route would report
// "passkey removed" over a credential that is still there and still works.
// See src/lib/api/rls-write.ts; `bun run check:rls-writes` enforces it.
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const viewer = await getViewer();
  if (viewer.source !== "session") return refuse(401, "Sign in first.");

  const { credentialId } = await params;

  const { data, error } = await createWorkosServerClient()
    .from("user_passkeys")
    .delete()
    .eq("credential_id", credentialId)
    .select("credential_id");

  if (error) return refuse(500, "That passkey could not be removed.");

  // Zero rows means the credential is not theirs or is already gone. One
  // message for both, so this cannot be used to discover which credential IDs
  // exist.
  const denied = deniedIfUntouched(data, "That passkey could not be removed.");
  if (denied) return denied;

  return Response.json({ ok: true });
}
