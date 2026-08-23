import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  SIGNATURE_SELECT,
  toSignatureRow,
  type SignatureRecord,
  type WaiverSignatureRow,
} from "@/lib/api/mappers/waiver";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Revoking a signature — the only change one ever accepts.
//
// A signature is append-only, and strictly append-only would be the simpler
// rule and the wrong one: a signature captured in error, or consent a customer
// withdraws, has to be recordable. So there is exactly one transition and it
// runs one way. Un-revoking is not a transition; somebody signs again.
//
// The database enforces the shape (`private.waiver_signature_is_append_only`
// refuses a second revocation and refuses any other column moving alongside
// it), and `waiver_signatures_revoke` decides who. This route is the door, not
// the guard.
//
// ── A REASON IS REQUIRED, AND THE CHECK SAYS SO TWICE ─────────────────────
//
// Revoking is the one act here with no document behind it, so the sentence
// explaining it is the only audit there will be. Refused at the route for a
// readable message and by `waiver_signatures_revocation_has_a_reason` for real.
// ============================================================================

export const dynamic = "force-dynamic";

export interface RevokeSignatureResult {
  signature: WaiverSignatureRow;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    reason?: string;
  } | null;

  const reason = body?.reason?.trim();
  if (!reason) {
    return NextResponse.json(
      {
        error:
          "Revoking a signature needs a reason. It is the only record of why it no longer stands.",
      },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // `.select()` is what makes the refusal visible: an UPDATE that fails a
  // `using` policy affects zero rows and returns SUCCESS, so without counting
  // what was touched this would report a revocation that never happened.
  const { data, error } = await supabase
    .from("waiver_signatures")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
      revoked_by: viewer.userId,
    })
    .eq("id", id)
    .select(SIGNATURE_SELECT);

  if (error) {
    // 42501 is both the RLS refusal and the append-only trigger's own message —
    // "already revoked", or an attempt to change something else alongside. The
    // trigger writes for a person, so its sentence is the one to show.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refused = deniedIfUntouched(
    data,
    "You are not allowed to revoke that signature.",
  );
  if (refused) return refused;

  const result: RevokeSignatureResult = {
    signature: toSignatureRow(
      (data as unknown as SignatureRecord[])[0],
      Date.now(),
    ),
  };

  return NextResponse.json(result);
}
