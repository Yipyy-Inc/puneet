import { NextResponse, type NextRequest } from "next/server";

import { MAX_UPLOAD_BYTES, sniffImageContentType } from "@/lib/api/file-type";
import { deniedIfExpectedRowsSurvived } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// /api/bookings/[ref]/medication-photos — a photo of a medication's label.
//
// GET     the newest photo of each medication across the booking's request —
//         a multi-day request's days share one form — each with a signed URL
//         that lasts a minute.
// POST    multipart: file, medicationId. The file goes to the private
//         booking-medication-photos bucket at {facility}/{booking}/{uuid}-…,
//         both read from the booking row; the type is sniffed from the bytes.
//         A newer photo replaces the older ones where the caller may remove.
// DELETE  ?medicationId= — the rows, then the files.
//
// The facility is always the BOOKING's, read through RLS; nothing here takes
// one from the request or the session's active facility. Who may read, add
// and remove is decided in the database (a_medication_label_photo_is_a_private
// _file): the booking's client and its facility's staff read, the client adds
// while the booking is still ahead, staff add and remove.
// ============================================================================

export const dynamic = "force-dynamic";

const BUCKET = "booking-medication-photos";

interface BookingRow {
  id: string;
  facility_id: string;
  details: Record<string, unknown> | null;
}

interface PhotoRow {
  id: string;
  booking_id: string;
  medication_id: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

async function readBooking(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  ref: string,
): Promise<BookingRow | null> {
  const numeric = Number(ref);
  if (!Number.isFinite(numeric)) return null;
  const { data } = await supabase
    .from("bookings")
    .select("id, facility_id, details")
    .eq("ref", numeric)
    .maybeSingle();
  return (data as BookingRow | null) ?? null;
}

/** The medications the booking holds, by id. */
function medicationIds(booking: BookingRow): Set<string> {
  const list = (booking.details ?? {})["medications"];
  return new Set(
    (Array.isArray(list) ? list : [])
      .map((item) => (item as { id?: unknown } | null)?.id)
      .filter((id): id is string => typeof id === "string"),
  );
}

/** The display name a stored path keeps after its uuid. */
function nameOf(path: string): string {
  const file = path.split("/").pop() ?? "";
  return file.replace(/^[0-9a-f-]{36}-/, "");
}

const notFound = () =>
  NextResponse.json({ error: "Booking not found." }, { status: 404 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { ref } = await params;
  const supabase = await createServerClient();
  const booking = await readBooking(supabase, ref);
  if (!booking) return notFound();

  // The request's other bookings, in the booking's own facility: a photo
  // taken on the form is attached to the first of them.
  const group = (booking.details ?? {})["bookingGroup"] as
    | { id?: unknown }
    | undefined;
  let bookingIds = [booking.id];
  if (typeof group?.id === "string" && group.id) {
    const { data: parts } = await supabase
      .from("bookings")
      .select("id")
      .eq("facility_id", booking.facility_id)
      .eq("details->bookingGroup->>id", group.id);
    const ids = (parts ?? []).map((part) => part.id as string);
    if (ids.length > 0) bookingIds = [...new Set([booking.id, ...ids])];
  }

  const { data, error } = await supabase
    .from("booking_medication_photos")
    .select(
      "id, booking_id, medication_id, storage_path, content_type, size_bytes, created_at",
    )
    .eq("facility_id", booking.facility_id)
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The newest of each medication.
  const newest = new Map<string, PhotoRow>();
  for (const row of (data ?? []) as PhotoRow[]) {
    if (!newest.has(row.medication_id)) newest.set(row.medication_id, row);
  }
  const rows = [...newest.values()];
  if (rows.length === 0) return NextResponse.json([]);

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(
    rows.map((row) => row.storage_path),
    60,
  );
  const urls = new Map(
    (signed ?? []).map((entry) => [entry.path, entry.signedUrl ?? ""]),
  );

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      medicationId: row.medication_id,
      url: urls.get(row.storage_path) ?? "",
      name: nameOf(row.storage_path),
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
    })),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { ref } = await params;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const medicationId = form?.get("medicationId");
  if (!(file instanceof File) || typeof medicationId !== "string") {
    return NextResponse.json(
      { error: "A photo and a medication are required." },
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
  const contentType = sniffImageContentType(bytes);
  if (!contentType) {
    return NextResponse.json(
      { error: "That is not a photo. Upload a PNG, JPEG or HEIC." },
      { status: 415 },
    );
  }

  const supabase = await createServerClient();
  const booking = await readBooking(supabase, ref);
  if (!booking) return notFound();
  if (!medicationIds(booking).has(medicationId)) {
    return NextResponse.json(
      { error: "That medication is not on this booking." },
      { status: 422 },
    );
  }

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${booking.facility_id}/${booking.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: "This booking can no longer take photos." },
      { status: 403 },
    );
  }

  const { data: row, error } = await supabase
    .from("booking_medication_photos")
    .insert({
      booking_id: booking.id,
      // Set again by the trigger from the booking; named here because the
      // column is required.
      facility_id: booking.facility_id,
      medication_id: medicationId,
      storage_path: path,
      content_type: contentType,
      size_bytes: file.size,
    })
    .select("id, created_at")
    .single();
  // Storage and Postgres share no transaction: a row that fails removes its file.
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return writeFailure(error, {
      denied: "This booking can no longer take photos.",
      duplicate: "That photo has already been added.",
    });
  }

  // The new photo replaces the older ones, where the caller may remove them.
  const { data: older } = await supabase
    .from("booking_medication_photos")
    .delete()
    .eq("booking_id", booking.id)
    .eq("medication_id", medicationId)
    .neq("id", row.id)
    .select("storage_path");
  const stale = (older ?? []).map((photo) => photo.storage_path as string);
  if (stale.length > 0) {
    await supabase.storage
      .from(BUCKET)
      .remove(stale)
      .catch(() => null);
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60);

  return NextResponse.json(
    {
      id: row.id,
      medicationId,
      url: signed?.signedUrl ?? "",
      name: safeName,
      contentType,
      sizeBytes: file.size,
      createdAt: row.created_at,
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { ref } = await params;
  const medicationId = new URL(request.url).searchParams.get("medicationId");
  if (!medicationId) {
    return NextResponse.json({ error: "Which medication?" }, { status: 422 });
  }

  const supabase = await createServerClient();
  const booking = await readBooking(supabase, ref);
  if (!booking) return notFound();

  const { data: existing } = await supabase
    .from("booking_medication_photos")
    .select("storage_path")
    .eq("booking_id", booking.id)
    .eq("medication_id", medicationId);
  const paths = (existing ?? []).map((photo) => photo.storage_path as string);
  if (paths.length === 0) return new NextResponse(null, { status: 204 });

  const { data: removed, error } = await supabase
    .from("booking_medication_photos")
    .delete()
    .eq("booking_id", booking.id)
    .eq("medication_id", medicationId)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove this photo.",
      duplicate: "",
    });
  }
  const denied = deniedIfExpectedRowsSurvived(
    paths.length,
    removed,
    "Not allowed to remove this photo.",
  );
  if (denied) return denied;

  await supabase.storage
    .from(BUCKET)
    .remove(paths)
    .catch(() => null);

  return new NextResponse(null, { status: 204 });
}
