import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";

// ============================================================================
// Remove a file from a client's record — the row first, then its bytes.
//
// `edit_clients` decides. A refusal deletes zero rows rather than erroring, so
// the delete reads back through `.select()` and an empty result is the 403 it
// was. Only once the row is gone are the bytes removed: the other order leaves
// a row pointing at nothing if the second step is refused.
// ============================================================================

export const dynamic = "force-dynamic";

const DENIED = "You do not have permission to remove client documents.";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("client_documents")
    .delete()
    .eq("id", id)
    .select("storage_path");

  if (error) {
    return writeFailure(error, { duplicate: "", denied: DENIED });
  }
  const refused = deniedIfUntouched(data, DENIED);
  if (refused) return refused;

  const paths = (data as { storage_path: string }[]).map((r) => r.storage_path);
  await supabase.storage.from("client-documents").remove(paths);

  return new NextResponse(null, { status: 204 });
}
