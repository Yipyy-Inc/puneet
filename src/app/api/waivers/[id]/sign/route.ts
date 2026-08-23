import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import {
  SIGNATURE_SELECT,
  toSignatureRow,
  type SignatureRecord,
  type WaiverSignatureRow,
} from "@/lib/api/mappers/waiver";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// ============================================================================
// Somebody agreeing to a waiver.
//
// ── THE TEXT IS READ FROM POSTGRES, NEVER FROM THE CALLER ─────────────────
//
// This is the single most important line in the file. The signature stores a
// COPY of what was agreed to, and if that copy came from the request body then
// a caller could show a person one thing and store another — which would make
// the record worse than useless, because it would look authoritative.
//
// So the waiver is loaded here, its `body` is what gets copied, and the sha256
// is computed server-side over exactly those bytes. Identical to
// `/api/staff-signatures`, which worked this out first for the employee side.
//
// ── AND IT IS A COPY BECAUSE THE DOCUMENT IS EDITABLE ─────────────────────
//
// `waivers` is a live table its owner can rewrite. A signature that pointed at
// it would prove only that somebody clicked something once, near a row that has
// since changed. The fixture this replaces stored exactly that pointer
// (`waiverId` + `waiverName`) and no text at all.
//
// ── WHO MAY SIGN IS RLS'S PROBLEM, NOT THIS ROUTE'S ───────────────────────
//
// `waiver_signatures_insert` admits the customer signing for themselves, or
// staff with `edit_clients` capturing one at the counter — `edit_clients`
// rather than `view_client_documents`, because a VIEW permission must not
// authorise a WRITE. An INSERT refused by `with check` RAISES, so it comes back
// as a 403 rather than a silent no-op.
// ============================================================================

export const dynamic = "force-dynamic";

export interface SignWaiverResult {
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
    clientRef?: number | string;
    petRef?: number | string;
    signatureName?: string;
    signatureData?: string;
    witnessName?: string;
    witnessSignatureData?: string;
  } | null;

  const signatureName = body?.signatureName?.trim();
  if (!signatureName) {
    return NextResponse.json(
      { error: "A signature needs the name of the person agreeing." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // RLS narrows this to waivers the caller may see, so a waiver at another
  // facility is simply not found.
  const { data: waiver } = await supabase
    .from("waivers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!waiver) {
    return NextResponse.json({ error: "No such waiver." }, { status: 404 });
  }

  const doc = waiver as unknown as Tables<"waivers">;

  if (!doc.active) {
    // A retired waiver is one the business has stopped standing behind. Signing
    // it would produce a record of agreement to something withdrawn.
    return NextResponse.json(
      { error: "That waiver is no longer in use." },
      { status: 409 },
    );
  }

  const text = doc.body?.trim();
  if (!text) {
    // Refused rather than defaulted, exactly as the staff route does: a
    // signature against an agreement with no text is a row that looks like
    // proof and is not one, and storing it is worse than storing nothing.
    return NextResponse.json(
      { error: "That waiver has no text to sign." },
      { status: 422 },
    );
  }

  if (doc.requires_witness && !body?.witnessName?.trim()) {
    return NextResponse.json(
      { error: "That waiver has to be witnessed." },
      { status: 422 },
    );
  }

  // The customer. A ref rather than a uuid, because that is what every screen
  // and URL in this app carries — and it is resolved WITHIN the waiver's own
  // facility, since refs are per-facility and the same number names a different
  // person elsewhere.
  const clientRef = Number(body?.clientRef);
  if (!Number.isFinite(clientRef)) {
    return NextResponse.json(
      { error: "Which customer is signing?" },
      { status: 400 },
    );
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("facility_id", doc.facility_id)
    .eq("ref", clientRef)
    .maybeSingle();

  if (!client) {
    return NextResponse.json(
      { error: "No client with that number at this facility." },
      { status: 404 },
    );
  }

  let petId: string | null = null;
  if (
    body?.petRef !== undefined &&
    body.petRef !== null &&
    body.petRef !== ""
  ) {
    const petRef = Number(body.petRef);
    if (Number.isFinite(petRef)) {
      const { data: pet } = await supabase
        .from("pets")
        .select("id")
        .eq("client_id", (client as { id: string }).id)
        .eq("ref", petRef)
        .maybeSingle();
      // A pet that does not resolve is left null rather than refused: the
      // waiver is the person's, and the pet is which animal it was about.
      petId = (pet as { id: string } | null)?.id ?? null;
    }
  }

  // Over exactly the bytes being stored. Not over the request, not over a
  // rendering of it — over `waiver_text` itself, so the hash can later prove
  // that stored text has not been altered.
  const hash = createHash("sha256").update(text, "utf8").digest("hex");

  // Computed at SIGNING from the waiver's rule, then frozen. Changing
  // `expiry_days` later must not retroactively expire or extend a signature
  // somebody already gave.
  const expiresAt =
    doc.expiry_days === null
      ? null
      : new Date(Date.now() + doc.expiry_days * 86400000).toISOString();

  const { data: inserted, error } = await supabase
    .from("waiver_signatures")
    .insert({
      facility_id: doc.facility_id,
      waiver_id: doc.id,
      client_id: (client as { id: string }).id,
      pet_id: petId,
      waiver_name: doc.name,
      waiver_version: doc.version,
      waiver_text: text,
      waiver_hash: hash,
      signature_name: signatureName,
      signature_data: body?.signatureData ?? null,
      witness_name: body?.witnessName?.trim() || null,
      witness_signature_data: body?.witnessSignatureData ?? null,
      // Evidence, not authentication. `signed_by` is who they were.
      ip_address:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      signed_by: viewer.userId,
      expires_at: expiresAt,
    })
    .select(SIGNATURE_SELECT)
    .single();

  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "You are not allowed to record a signature for that customer."
          : error.message,
      },
      { status: denied ? 403 : 400 },
    );
  }

  const result: SignWaiverResult = {
    signature: toSignatureRow(
      inserted as unknown as SignatureRecord,
      Date.now(),
    ),
  };

  return NextResponse.json(result, { status: 201 });
}
