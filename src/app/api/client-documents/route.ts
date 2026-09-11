import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { MAX_UPLOAD_BYTES, sniffContentType } from "@/lib/api/file-type";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  CLIENT_DOCUMENT_SELECT,
  CLIENT_DOCUMENT_TYPES,
  toClientDocument,
  type ClientDocumentRow,
  type ClientDocumentType,
} from "@/lib/api/mappers/client-document";

// ============================================================================
// The files on a client's record: list them with short-lived links, file one.
//
// Modelled on /api/staff-documents, for the same reasons:
//
//   READS ARE SIGNED URLS, 60 SECONDS. The bucket is private; a link minted
//   per request and dead in a minute is not worth forwarding.
//
//   THE PATH IS BUILT FROM THE RESOLVED CLIENT, never from the request —
//   {facility_id}/{client_id}/{uuid}-{name} is the storage policy's predicate,
//   so a caller-supplied path would be a caller-supplied permission.
//
//   THE DECLARED TYPE IS NOT CONSULTED. The first bytes decide, and the table's
//   CHECK repeats the same four types for anyone who skips this route.
//
// The client is resolved through RLS inside the ACTIVE facility, so a platform
// admin or somebody in two facilities files into the one they are looking at
// (check:facility-scoped-reads, check:facility-from-session).
// ============================================================================

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60;
const BUCKET = "client-documents";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const clientRef = Number(request.nextUrl.searchParams.get("clientRef"));
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
  // "What is on file for this person?" has "nothing you may see" as an answer.
  if (!client) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("client_documents")
    .select(CLIENT_DOCUMENT_SELECT)
    .eq("client_id", client.id)
    .match(inFacility(scope))
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as unknown as ClientDocumentRow[];
  if (rows.length === 0) return NextResponse.json([]);

  // One batch call rather than one per file.
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(
    rows.map((r) => r.storage_path),
    SIGNED_URL_TTL_SECONDS,
  );
  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path ?? "", s.signedUrl]),
  );

  return NextResponse.json(
    rows.map((row) =>
      toClientDocument(row, urlByPath.get(row.storage_path) ?? null),
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const clientRef = Number(form?.get("clientRef"));
  const petRefRaw = form?.get("petRef");
  const docTypeRaw = String(form?.get("docType") ?? "other");
  const notes = String(form?.get("notes") ?? "").trim();
  const expiresOnRaw = String(form?.get("expiresOn") ?? "").trim();

  if (!(file instanceof File) || !Number.isInteger(clientRef)) {
    return NextResponse.json(
      { error: "A file and a client are required." },
      { status: 422 },
    );
  }
  const docType: ClientDocumentType = (
    CLIENT_DOCUMENT_TYPES as readonly string[]
  ).includes(docTypeRaw)
    ? (docTypeRaw as ClientDocumentType)
    : "other";
  if (expiresOnRaw && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOnRaw)) {
    return NextResponse.json(
      { error: "An expiry date is YYYY-MM-DD." },
      { status: 422 },
    );
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Files must be between 1 byte and ${MAX_UPLOAD_BYTES / 1048576} MB.`,
      },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffContentType(bytes);
  if (!contentType) {
    return NextResponse.json(
      {
        error:
          "That file type is not accepted. Upload a PDF, PNG, JPEG or HEIC.",
        declared: file.type || null,
      },
      { status: 415 },
    );
  }

  // From the session, never the request.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, facility_id")
    .eq("ref", clientRef)
    .match(inFacility(facility.facilityId))
    .maybeSingle();
  if (!client) {
    return NextResponse.json(
      { error: "That client does not exist at this facility." },
      { status: 404 },
    );
  }

  let petId: string | null = null;
  if (petRefRaw !== null && String(petRefRaw) !== "") {
    const { data: pet } = await supabase
      .from("pets")
      .select("id")
      .eq("ref", Number(petRefRaw))
      .eq("client_id", client.id)
      .maybeSingle();
    if (!pet) {
      return NextResponse.json(
        { error: "That pet is not this client's." },
        { status: 422 },
      );
    }
    petId = pet.id;
  }

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${client.facility_id}/${client.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: "You do not have permission to file documents for clients." },
      { status: 403 },
    );
  }

  const viewer = await getViewer().catch(() => null);
  const { data: row, error } = await supabase
    .from("client_documents")
    .insert({
      // Overwritten by the trigger from the client.
      facility_id: client.facility_id,
      client_id: client.id,
      pet_id: petId,
      doc_type: docType,
      file_name: file.name.slice(-200),
      content_type: contentType,
      size_bytes: file.size,
      storage_path: path,
      notes: notes || null,
      expires_on: expiresOnRaw || null,
      uploaded_by: user.id,
      uploaded_by_name: viewer?.fullName ?? viewer?.email ?? null,
    })
    .select(CLIENT_DOCUMENT_SELECT)
    .single();

  if (error) {
    // Compensation, not a transaction: the bytes are removed rather than left
    // where no row points at them.
    await supabase.storage.from(BUCKET).remove([path]);
    return writeFailure(error, {
      denied: "You do not have permission to file documents for clients.",
      duplicate: "That document has already been filed.",
    });
  }

  return NextResponse.json(
    toClientDocument(row as unknown as ClientDocumentRow, null),
    { status: 201 },
  );
}
