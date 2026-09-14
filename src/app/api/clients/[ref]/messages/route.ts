import { NextResponse, type NextRequest } from "next/server";

import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import {
  MESSAGE_SEND_SELECT,
  rowToClientMessage,
  type MessageSendRow,
} from "@/lib/api/mappers/client-message";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/clients/[ref]/messages — what the facility sent this client.
//
// The client is looked up by ref inside the caller's facility, so a ref from
// another facility finds nobody and answers with an empty list; RLS on
// `message_sends` decides the rest. Newest first, the last hundred.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const clientRef = Number(ref);
  if (!Number.isInteger(clientRef) || clientRef <= 0) {
    return NextResponse.json({ error: "Name a client." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", clientRef)
    .match(inFacility(scope))
    .maybeSingle();
  if (!client) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("message_sends")
    .select(MESSAGE_SEND_SELECT)
    .eq("client_id", (client as { id: string }).id)
    .match(inFacility(scope))
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data ?? []) as MessageSendRow[]).map(rowToClientMessage),
  );
}
