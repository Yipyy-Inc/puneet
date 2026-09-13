import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { MAX_UPLOAD_BYTES, sniffImageContentType } from "@/lib/api/file-type";
import {
  YIPYY_GO_PHOTO_BUCKET,
  bookingNotFound,
  resolveYipyyGoBooking,
  yipyyGoFailure,
} from "@/lib/yipyy-go/route-helpers";

// ============================================================================
// /api/customer/yipyy-go/photos — a photo on a pre-arrival form.
//
// POST    multipart: file, bookingRef, petRef, kind (belongings | medication |
//         question), itemRef. The file goes to the private yipyy-go-photos
//         bucket at {facility}/{form}/{uuid}-{name}, both taken from rows the
//         server resolved; the row is what the form points at, by id. A dog
//         with no form yet gets a draft first. The type is sniffed from the
//         bytes; the browser's claim is ignored.
// DELETE  ?id= — row first, then the file.
//
// Modelled on the grooming photos route: storage and Postgres share no
// transaction, so a row that fails to insert removes its file.
// ============================================================================

export const dynamic = "force-dynamic";

const KINDS = new Set(["belongings", "medication", "question"]);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const bookingRef = form?.get("bookingRef");
  const petRef = form?.get("petRef");
  const kind = form?.get("kind");
  const itemRef = form?.get("itemRef");

  if (
    !(file instanceof File) ||
    typeof bookingRef !== "string" ||
    typeof petRef !== "string"
  ) {
    return NextResponse.json(
      { error: "A photo, a booking and a dog are required." },
      { status: 422 },
    );
  }
  if (typeof kind !== "string" || !KINDS.has(kind)) {
    return NextResponse.json(
      { error: "A photo is of belongings, a medication, or an answer." },
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
  const booking = await resolveYipyyGoBooking(supabase, bookingRef);
  if (!booking) return bookingNotFound();
  const pet = booking.pets.find((p) => p.ref === Number(petRef));
  if (!pet) {
    return NextResponse.json(
      { error: "That dog is not on this booking." },
      { status: 404 },
    );
  }

  let { data: submission } = await supabase
    .from("yipyy_go_submissions")
    .select("id, facility_id")
    .eq("booking_id", booking.id)
    .eq("pet_id", pet.id)
    .maybeSingle();
  if (!submission) {
    const { data: draft, error } = await supabase.rpc("save_yipyy_go_draft", {
      p_booking_id: booking.id,
      p_pet_id: pet.id,
      p_answers: {},
    });
    if (error) return yipyyGoFailure(error);
    submission = draft as unknown as { id: string; facility_id: string };
  }

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${submission.facility_id}/${submission.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(YIPYY_GO_PHOTO_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: "This form can no longer take photos." },
      { status: 403 },
    );
  }

  const { data: row, error } = await supabase
    .from("yipyy_go_photos")
    .insert({
      submission_id: submission.id,
      kind,
      item_ref:
        typeof itemRef === "string" && itemRef.trim()
          ? itemRef.trim().slice(0, 100)
          : null,
      storage_path: path,
      content_type: contentType,
      size_bytes: file.size,
    })
    .select("id, kind, item_ref")
    .single();

  if (error) {
    await supabase.storage.from(YIPYY_GO_PHOTO_BUCKET).remove([path]);
    return writeFailure(error, {
      denied: "This form can no longer take photos.",
      duplicate: "That photo has already been added.",
    });
  }

  const { data: signed } = await supabase.storage
    .from(YIPYY_GO_PHOTO_BUCKET)
    .createSignedUrl(path, 60);

  return NextResponse.json(
    {
      id: row.id,
      kind: row.kind,
      itemRef: row.item_ref,
      url: signed?.signedUrl ?? "",
      name: safeName,
      sizeBytes: file.size,
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
  const { data: photo } = await supabase
    .from("yipyy_go_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!photo) {
    return NextResponse.json(
      { error: "That photo does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data: touched, error } = await supabase
    .from("yipyy_go_photos")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: "This form can no longer change its photos.",
      duplicate: "",
    });
  }
  const denied = deniedIfUntouched(
    touched,
    "This form can no longer change its photos.",
  );
  if (denied) return denied;

  await supabase.storage
    .from(YIPYY_GO_PHOTO_BUCKET)
    .remove([photo.storage_path])
    .catch(() => null);

  return new NextResponse(null, { status: 204 });
}
