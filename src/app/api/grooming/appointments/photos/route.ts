import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { MAX_UPLOAD_BYTES, sniffImageContentType } from "@/lib/api/file-type";

// ============================================================================
// Grooming photos: upload, and remove.
//
// READS ARE NOT HERE. The appointment GET already returns every photo with a
// signed URL, because a screen that has an appointment has its photos — a
// separate list endpoint would mean two requests for one card and two places
// that decide how long a URL lives.
//
// ── WHAT THE ROUTE CHECKS AND WHAT THE DATABASE CHECKS ─────────────────────
//
// The route sniffs magic bytes and stores what it FOUND; `file.type` is
// whatever the browser put there and is discarded. The bucket's
// `allowed_mime_types` and the CHECK on `grooming_photos.content_type` repeat
// the same three values, because PostgREST and the Storage API are both
// reachable without this route. One is the real defence, the others are the
// floor — neither is redundant.
//
// ── THE PATH IS BUILT FROM RESOLVED ROWS, NEVER FROM THE REQUEST ───────────
//
// {facility_id}/{booking_id}/{uuid}-{name}. The first segment IS the storage
// policy's predicate, so a caller-supplied path would be a caller-supplied
// permission. Both ids come from rows the server looked up.
//
// ── TWO SYSTEMS, SO THE FAILURE PATH IS COMPENSATION ───────────────────────
//
// Storage and Postgres do not share a transaction. If the row insert fails the
// object is orphaned bytes nothing points at, so it is removed; if the object
// upload fails there is no row to clean up. Delete runs the other way round —
// row first, then object — for the same reason: a row pointing at bytes that
// are gone renders a broken image, while bytes with no row are invisible and
// collectable.
// ============================================================================

export const dynamic = "force-dynamic";

const BUCKET = "grooming-photos";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const appointmentId = form?.get("appointmentId");
  const kind = form?.get("kind");
  const caption = form?.get("caption");

  if (!(file instanceof File) || typeof appointmentId !== "string") {
    return NextResponse.json(
      { error: "A photo and an appointment are required." },
      { status: 422 },
    );
  }
  if (kind !== "before" && kind !== "after") {
    return NextResponse.json(
      { error: "A photo is either a before or an after." },
      { status: 422 },
    );
  }
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

  const ref = Number(appointmentId);
  if (!Number.isFinite(ref)) {
    return NextResponse.json(
      { error: "That is not an appointment reference." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", ref)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "That appointment does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data: parent } = await supabase
    .from("grooming_appointments")
    .select("facility_id")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (!parent) {
    return NextResponse.json(
      { error: "That booking is not a grooming appointment." },
      { status: 422 },
    );
  }
  const facilityId = parent.facility_id as string;

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${facilityId}/${booking.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: "Not allowed to add photos to this appointment." },
      { status: 403 },
    );
  }

  const { data: row, error } = await supabase
    .from("grooming_photos")
    .insert({
      booking_id: booking.id,
      facility_id: facilityId,
      kind,
      caption: typeof caption === "string" && caption.trim() ? caption : null,
      storage_path: path,
      content_type: contentType,
      size_bytes: file.size,
    } as never)
    .select("id, kind, caption, author_name, created_at, storage_path")
    .single();

  if (error) {
    // Compensation, not a transaction — see the header.
    await supabase.storage.from(BUCKET).remove([path]);
    return writeFailure(error, {
      denied: "Not allowed to add photos to this appointment.",
      duplicate: "That photo has already been uploaded.",
    });
  }

  // Signed immediately so the caller can render what it just uploaded without
  // waiting for a refetch.
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60);

  const stored = row as Record<string, string | null>;
  return NextResponse.json(
    {
      id: stored.id,
      url: signed?.signedUrl ?? "",
      type: stored.kind,
      ...(stored.caption ? { caption: stored.caption } : {}),
      takenAt: stored.created_at,
      takenBy: stored.author_name,
    },
    { status: 201 },
  );
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which photo?" }, { status: 422 });
  }

  const supabase = await createServerClient();

  // Read the path before deleting the row — afterwards there is nothing left to
  // say where the bytes were.
  const { data: photo } = await supabase
    .from("grooming_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!photo) {
    return NextResponse.json(
      { error: "That photo does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("grooming_photos")
    .delete()
    .eq("id", id);
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove photos from this appointment.",
      duplicate: "",
    });
  }

  // Row first, then bytes. If this fails the object is orphaned rather than
  // dangling — invisible and collectable, instead of a broken image on a card.
  await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path as string])
    .catch(() => null);

  return new NextResponse(null, { status: 204 });
}
