import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { MAX_UPLOAD_BYTES, sniffContentType } from "@/lib/api/file-type";

// ============================================================================
// Staff documents: list with short-lived signed URLs, and upload.
//
// READS ARE SIGNED URLS, 60 SECONDS. The bucket is private, so there is no URL
// that works without a token; these are minted per request and expire before
// they are worth sharing. A long expiry would turn "private bucket" back into
// "public bucket with a longer name" — anything pasted into a chat outlives its
// usefulness in about a minute, which is the point.
//
// Uploads go to {facility_id}/{staff_id}/{uuid}-{name}. The prefix is the
// authorisation boundary that storage RLS matches on, so it is built from the
// STAFF ROW the server resolved, never from anything the caller sent.
//
// WHAT THE ROUTE VALIDATES AND WHAT THE DATABASE VALIDATES. The route sniffs
// magic bytes and stores what it found — the declared MIME type is discarded.
// The CHECK constraints on staff_documents repeat the same limits, because
// PostgREST is reachable without this route and a rule enforced only here is a
// rule enforced nowhere. Neither is redundant: one is the real check, the other
// is the floor.
// ============================================================================

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60;
const BUCKET = "staff-documents";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const staffId = new URL(request.url).searchParams.get("staffId");

  let query = supabase
    .from("staff_documents")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (staffId) {
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("legacy_id", staffId)
      .maybeSingle();
    // An unreadable staff member yields an empty list, not an error: the caller
    // asked a legitimate question and the answer is "none you may see".
    if (!staff) return NextResponse.json([]);
    query = query.eq("staff_id", staff.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // One batch call rather than N. A list of twenty documents should not be
  // twenty round trips to storage.
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(
    data.map((d) => d.storage_path),
    SIGNED_URL_TTL_SECONDS,
  );

  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path ?? "", s.signedUrl]),
  );

  return NextResponse.json(
    data.map((d) => ({
      id: d.id,
      staffId: d.staff_id,
      name: d.file_name,
      type: d.doc_type,
      contentType: d.content_type,
      sizeBytes: d.size_bytes,
      uploadedAt: d.uploaded_at,
      visibleToEmployee: d.visible_to_employee,
      taskKey: d.task_key,
      retainUntil: d.retain_until,
      // Absent rather than empty when signing failed — a broken link is worse
      // than a disabled button, because only one of them tells the truth.
      fileUrl: urlByPath.get(d.storage_path) ?? null,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    })),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const staffLegacyId = form?.get("staffId");

  if (!(file instanceof File) || typeof staffLegacyId !== "string") {
    return NextResponse.json(
      { error: "A file and a staff member are required." },
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

  // THE DECLARED TYPE IS NOT CONSULTED. `file.type` is whatever the browser
  // put there; what gets stored is what the first bytes prove.
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

  const supabase = await createServerClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, facility_id")
    .eq("legacy_id", staffLegacyId)
    .maybeSingle();

  if (!staff) {
    return NextResponse.json(
      { error: "That staff member does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // Built from the resolved row, never from the request. The prefix IS the
  // storage policy's predicate, so a caller-supplied path would be a caller-
  // supplied permission.
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${staff.facility_id}/${staff.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType,
      // No overwrite, ever. The append-only story has to be true of the BYTES
      // and not only of the row that describes them.
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Not allowed to upload for that staff member." },
      { status: 403 },
    );
  }

  // RETENTION IS COMPUTED HERE, NOT ACCEPTED. The client sends nothing; the
  // date comes from the facility's own hrDocRetentionYears, because "how long
  // we must keep this" is a policy of the business and not a property of the
  // upload. A caller-supplied retain_until would let whoever files a document
  // decide when it may be destroyed.
  //
  // Only the offboarding kinds get one. An ordinary certification has no
  // statutory retention attached to it, and stamping every upload with a date
  // would turn a legal obligation into decoration.
  const docType = (form?.get("docType") as string | null) || "other";
  const RETAINED = ["roe", "termination_letter", "settlement_agreement"];

  let retainUntil: string | null = null;
  if (RETAINED.includes(docType)) {
    const { data: config } = await supabase
      .from("staff_hr_config")
      .select("hr_doc_retention_years")
      .eq("facility_id", staff.facility_id)
      .maybeSingle();

    const years = (config?.hr_doc_retention_years as number | null) ?? 7;
    const until = new Date();
    until.setFullYear(until.getFullYear() + years);
    retainUntil = until.toISOString().split("T")[0];
  }

  const { data: row, error } = await supabase
    .from("staff_documents")
    .insert({
      facility_id: staff.facility_id,
      staff_id: staff.id,
      task_key: (form?.get("taskKey") as string | null) || null,
      doc_type: docType,
      retain_until: retainUntil,
      file_name: file.name.slice(-200),
      content_type: contentType,
      size_bytes: file.size,
      storage_path: path,
      uploaded_by: user.id,
    } as never)
    .select("id, file_name, content_type, size_bytes, uploaded_at")
    .single();

  if (error) {
    // COMPENSATION, not a transaction: storage and Postgres are separate
    // systems. If the row failed, the object is orphaned bytes nothing points
    // at — remove it rather than leave a file no policy will ever surface and
    // no record will ever explain.
    await supabase.storage.from(BUCKET).remove([path]);
    return writeFailure(error, {
      denied: "Not allowed to file a document for that staff member.",
      duplicate: "That document has already been uploaded.",
    });
  }

  return NextResponse.json(row, { status: 201 });
}
