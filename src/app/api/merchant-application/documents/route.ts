import { NextResponse, type NextRequest } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { sniffContentType } from "@/lib/api/file-type";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  isEditable,
  type ApplicationStatus,
  type DocumentType,
} from "@/lib/merchant-application/application";

// ============================================================================
// The identity documents.
//
// ── THE DECLARED TYPE IS NOT CONSULTED ────────────────────────────────────
//
// `file.type` is whatever the browser put there. What gets stored is what the
// first bytes prove, through the same `sniffContentType` the staff-documents
// route uses — one implementation, so the two cannot disagree about what a HEIC
// looks like.
//
// ── AND THE PATH IS BUILT FROM THE SERVER'S ANSWER ────────────────────────
//
// {facility_id}/{application_id}/{uuid}. That prefix is what the storage
// policies match on, so every segment comes from a row this server resolved
// through the session — never from anything the caller sent. A caller-supplied
// path segment is a caller-supplied authorisation decision.
//
// ── READS ARE SIGNED URLS, SIXTY SECONDS ──────────────────────────────────
//
// The bucket is private and there is no URL that works without a token. A long
// expiry would turn "private bucket" back into "public bucket with a longer
// name" — for a passport scan that is the difference that matters.
// ============================================================================

export const dynamic = "force-dynamic";

const BUCKET = "merchant-applications";
const SIGNED_URL_TTL_SECONDS = 60;

const VALID_TYPES = new Set<string>(DOCUMENT_TYPES.map((d) => d.value));

async function liveApplication() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  const active = await activeAdminFacility();
  if (active.kind !== "resolved") {
    return {
      error: NextResponse.json(
        {
          error:
            active.kind === "ambiguous"
              ? "You administer more than one facility. Open the one you mean at its own address."
              : "Only an owner or administrator can add documents.",
        },
        { status: active.kind === "ambiguous" ? 409 : 403 },
      ),
    };
  }

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("merchant_applications")
    .select("id, status, facility_id")
    .eq("facility_id", active.facility.id)
    .not("status", "in", '("withdrawn","rejected")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      error: NextResponse.json(
        { error: "There is no application to add documents to." },
        { status: 404 },
      ),
    };
  }

  return { application: data, supabase, viewer };
}

/** A short-lived link per document, minted on request. */
export async function GET() {
  const resolved = await liveApplication();
  if ("error" in resolved) return resolved.error;

  const { data: rows } = await resolved.supabase
    .from("merchant_application_documents")
    .select("id, doc_type, principal_id, file_name, storage_path, purged_at")
    .eq("application_id", resolved.application.id)
    .is("purged_at", null)
    .order("uploaded_at");

  const documents = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await resolved.supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path as string, SIGNED_URL_TTL_SECONDS);
      return {
        id: row.id as string,
        docType: row.doc_type as DocumentType,
        principalId: (row.principal_id as string | null) ?? null,
        fileName: row.file_name as string,
        url: signed?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const resolved = await liveApplication();
  if ("error" in resolved) return resolved.error;

  if (!isEditable(resolved.application.status as ApplicationStatus)) {
    return NextResponse.json(
      { error: "This application has been submitted and cannot be changed." },
      { status: 409 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const docType = String(form?.get("docType") ?? "");
  const principalId = form?.get("principalId")
    ? String(form.get("principalId"))
    : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was sent." }, { status: 422 });
  }
  if (!VALID_TYPES.has(docType)) {
    return NextResponse.json(
      { error: "Say what kind of document this is." },
      { status: 422 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 422 });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 10 MB." },
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

  // A principal named here has to belong to this application. Read through the
  // ordinary client so RLS answers — the caller has to be able to see the
  // person whose passport they claim to be uploading.
  if (principalId) {
    const { data: principal } = await resolved.supabase
      .from("merchant_application_principals")
      .select("id")
      .eq("id", principalId)
      .eq("application_id", resolved.application.id)
      .maybeSingle();
    if (!principal) {
      return NextResponse.json({ error: "No such person." }, { status: 404 });
    }
  }

  // Every segment from a row the server resolved. The file name is NOT in the
  // path — a passport scan called "dave-passport.pdf" would put a name in a
  // storage key, and storage keys turn up in logs.
  const path = `${resolved.application.facility_id}/${resolved.application.id}/${crypto.randomUUID()}`;

  const { error: uploadError } = await resolved.supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: "That document could not be stored." },
      { status: 500 },
    );
  }

  const { data, error } = await resolved.supabase
    .from("merchant_application_documents")
    .insert({
      application_id: resolved.application.id,
      facility_id: resolved.application.facility_id,
      principal_id: principalId,
      doc_type: docType,
      file_name: file.name.slice(0, 200),
      content_type: contentType,
      size_bytes: file.size,
      storage_path: path,
      uploaded_by: resolved.viewer.userId,
    } as never)
    .select("id")
    .single();

  if (error) {
    // The object landed and the row did not. Remove the orphan rather than
    // leaving a file nothing points at in a bucket nobody lists.
    await resolved.supabase.storage.from(BUCKET).remove([path]);
    return writeFailure(error, {
      duplicate: "That document has already been uploaded.",
      denied:
        "You do not have permission to add documents to this application.",
    });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
