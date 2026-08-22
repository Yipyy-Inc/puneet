import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { MAX_UPLOAD_BYTES, sniffImageContentType } from "@/lib/api/file-type";

// ============================================================================
// Report-card photos: upload.
//
// Modelled on api/grooming/appointments/photos, and for the same reasons.
//
// ── WHAT THE ROUTE CHECKS AND WHAT THE DATABASE CHECKS ─────────────────────
//
// The route sniffs magic bytes and stores what it FOUND; `file.type` is
// whatever the browser put there and is discarded. The bucket's
// `allowed_mime_types` and the CHECK on `report_card_photos.content_type`
// repeat the same set, because PostgREST and the Storage API are both
// reachable without this route.
//
// ── THE PATH IS BUILT FROM RESOLVED ROWS, NEVER FROM THE REQUEST ───────────
//
// {facility_id}/{report_card_id}/{uuid}-{name}. The SECOND segment is this
// bucket's write predicate (20260822300000 matches the card, not the facility,
// so the upload takes the same service-specific permission the card took), so
// a caller-supplied path would be a caller-supplied permission. Both ids come
// from a row the server looked up.
//
// ── TWO SYSTEMS, SO THE FAILURE PATH IS COMPENSATION ───────────────────────
//
// Storage and Postgres do not share a transaction. If the row insert fails the
// object is orphaned bytes nothing points at, so it is removed. If the upload
// fails there is no row to clean up.
//
// ── WHY THE CARD MUST ALREADY EXIST ────────────────────────────────────────
//
// The storage policy matches the card segment against `report_cards`, so there
// is no way to upload to a card that has not been created. That ordering is
// deliberate: it means this bucket cannot accumulate objects belonging to a
// card that was never saved.
// ============================================================================

export const dynamic = "force-dynamic";

const BUCKET = "report-card-photos";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: cardId } = await params;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  const caption = form?.get("caption");
  const sortOrder = form?.get("sortOrder");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A photo is required." },
      { status: 422 },
    );
  }

  const photoKind =
    kind === "before" || kind === "after" || kind === "moment"
      ? kind
      : "moment";

  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Photos must be between 1 byte and ${MAX_UPLOAD_BYTES / 1048576} MB.`,
      },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // THE DECLARED TYPE IS NOT CONSULTED. A PDF renamed to .jpg and announced as
  // image/jpeg gets refused here, by its first bytes.
  const contentType = sniffImageContentType(bytes);
  if (!contentType) {
    return NextResponse.json(
      {
        error: "That is not a photo. Upload a PNG, JPEG or HEIC.",
        declared: file.type || null,
      },
      { status: 415 },
    );
  }

  const supabase = await createServerClient();

  // Through RLS. A caller who cannot see the card gets nothing back, and the
  // 404 below is the same answer they would get for a card that does not
  // exist — which is the intended answer to both.
  const { data: card } = await supabase
    .from("report_cards")
    .select("id, facility_id")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) {
    return NextResponse.json(
      { error: "That report card does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${card.facility_id}/${card.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: "Not allowed to add photos to this report card." },
      { status: 403 },
    );
  }

  const { data: row, error } = await supabase
    .from("report_card_photos")
    .insert({
      report_card_id: card.id,
      facility_id: card.facility_id,
      kind: photoKind,
      caption: typeof caption === "string" && caption.trim() ? caption : null,
      sort_order: Number(sortOrder) || 0,
      storage_path: path,
      content_type: contentType,
      size_bytes: file.size,
    } as never)
    .select(
      "id, kind, caption, sort_order, storage_path, content_type, size_bytes",
    )
    .single();

  if (error) {
    // Compensation, not a transaction — see the header.
    await supabase.storage.from(BUCKET).remove([path]);
    return writeFailure(error, {
      denied: "Not allowed to add photos to this report card.",
      duplicate: "That photo has already been uploaded.",
    });
  }

  // Signed immediately so the caller can render what it just uploaded without
  // waiting for a refetch.
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  const stored = row as unknown as {
    id: string;
    kind: string;
    caption: string | null;
    sort_order: number;
    storage_path: string;
    content_type: string;
    size_bytes: number;
  };

  return NextResponse.json(
    {
      id: stored.id,
      kind: stored.kind,
      caption: stored.caption,
      sortOrder: stored.sort_order,
      storagePath: stored.storage_path,
      url: signed?.signedUrl ?? null,
      contentType: stored.content_type,
      sizeBytes: stored.size_bytes,
    },
    { status: 201 },
  );
}
