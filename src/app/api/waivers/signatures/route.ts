import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  SIGNATURE_SELECT,
  toSignatureRow,
  type SignatureRecord,
  type WaiverSignatureRow,
} from "@/lib/api/mappers/waiver";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Who has signed what.
//
// One route for both readers, because RLS already tells them apart:
// `waiver_signatures_read` admits a staff member with `view_client_documents`
// — every front-of-house role, since "is this on file?" is a check-in question
// rather than an office one — or the CUSTOMER whose signature it is. So the
// facility's log and a customer's own list are the same query.
//
// The `status` on each row is COMPUTED here against the server's clock, not
// read from a column. The fixture stored it and nothing swept it, so a
// signature that lapsed last year still read `valid` — and a desk would wave
// somebody through on it.
// ============================================================================

export const dynamic = "force-dynamic";

export interface WaiverSignaturesPayload {
  signatures: WaiverSignatureRow[];
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("waiver_signatures")
    .select(SIGNATURE_SELECT)
    .order("signed_at", { ascending: false })
    .limit(500);

  // Narrowing to one facility is for the FACILITY's log. A customer has no
  // facility context of their own, so this is skipped for them and RLS does the
  // narrowing instead — to their own signatures, wherever they were given.
  const context = await getFacilityContext();
  if (context && params.get("mine") !== "1") {
    query = query.eq("facility_id", context.facilityId);
  }

  const clientRef = params.get("clientRef");
  if (clientRef && context) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("facility_id", context.facilityId)
      .eq("ref", Number(clientRef))
      .maybeSingle();
    // A ref nobody has is an empty list, not an error: "has this person signed
    // anything?" is a fair question with "no" as an answer.
    if (!client) return NextResponse.json({ signatures: [] });
    query = query.eq("client_id", (client as { id: string }).id);
  }

  const waiverId = params.get("waiverId");
  if (waiverId) query = query.eq("waiver_id", waiverId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const now = Date.now();
  const payload: WaiverSignaturesPayload = {
    signatures: ((data ?? []) as unknown as SignatureRecord[]).map((row) =>
      toSignatureRow(row, now),
    ),
  };

  return NextResponse.json(payload);
}
