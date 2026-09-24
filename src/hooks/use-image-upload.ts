"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useWorkosSupabaseClient } from "@/lib/supabase/workos-client";

// ============================================================================
// PUT A PICTURE SOMEWHERE REAL, and hand back a URL.
//
// ── THE TWO THINGS THIS REPLACED, AND ONLY ONE WAS REPORTED ───────────────
//
// 1. AN "IMAGE URL" TEXT BOX, on every screen that lets a facility put a photo
//    on something they sell — `https://images.example.com/full-groom.jpg` sat
//    in it as a placeholder. A groomer does not have that. To produce one they
//    would have to host the picture publicly first, so the field either stayed
//    empty or held a link to somebody else's server. Client feedback,
//    2026-09-24, and it is right.
//
// 2. `RoomImageUpload`, WHICH LOOKED LIKE IT ALREADY DID THIS. Drag and drop,
//    a file picker, a preview — and `reader.readAsDataURL(file)`, so the
//    "upload" turned the photograph into a base64 string and wrote it into
//    `room_categories.image_url`. A 5 MB photo becomes ~6.7 MB of text in a
//    column that every board listing categories reads on every page load.
//
//    Measured before changing it: zero rows in any `image_url` column hold a
//    data URL today (the longest value in the database is 148 characters), so
//    nothing has to be migrated — it was a loaded gun, not a wound.
//
//    It also dropped a too-big or non-image file SILENTLY: `if (file.size >
//    MAX) return;`. The person chose a photo and nothing happened at all.
//
// ── ONE UPLOAD PATH, TWO PRESENTATIONS ────────────────────────────────────
//
// The rooms screens want a big drop zone with the photo filling it; a service
// dialog wants a compact row beside the other fields. Those are both
// reasonable and they are presentation. The part that must not be written
// twice is WHERE the bytes go and WHO may put them there, so it lives here.
//
// ── THE PATH IS THE TENANCY BOUNDARY ──────────────────────────────────────
//
// The first folder segment is the facility id and the storage policies key on
// exactly that (20260924240000). Not tidiness: a path that does not begin with
// a facility the caller may manage services for is refused by Postgres, not by
// the browser.
// ============================================================================

const BUCKET = "service-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

/** Why an upload did not happen, for a caller to turn into a sentence. */
export type ImageUploadRefusal =
  | "too_large"
  | "wrong_type"
  | "not_ready"
  | "failed";

export interface ImageUploadState {
  busy: boolean;
  /** Set when the LAST attempt was refused; cleared when the next begins. */
  refusal: ImageUploadRefusal | null;
  /** The storage error, when there is one worth showing. */
  detail: string | null;
}

export function useImageUpload(): ImageUploadState & {
  /** Uploads and resolves the public URL, or null when it was refused. */
  upload: (file: File, slug?: string) => Promise<string | null>;
  reset: () => void;
  maxBytes: number;
  accepted: readonly string[];
} {
  const supabase = useWorkosSupabaseClient();
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<ImageUploadRefusal | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  // The facility id, for the storage path. Branding already fetches this, so
  // on a screen that has drawn the facility's chrome it is the same cache
  // entry and costs nothing.
  const { data: branding } = useQuery({
    queryKey: ["facility", "branding"],
    queryFn: async (): Promise<{ facilityId: string }> => {
      const response = await fetch("/api/facility/branding");
      if (!response.ok) throw new Error("facility unavailable");
      return (await response.json()) as { facilityId: string };
    },
  });

  const reset = useCallback(() => {
    setRefusal(null);
    setDetail(null);
  }, []);

  const upload = useCallback(
    async (file: File, slug = "picture"): Promise<string | null> => {
      setRefusal(null);
      setDetail(null);

      if (!branding?.facilityId) {
        setRefusal("not_ready");
        return null;
      }
      // Checked here so the message is fast and specific. Storage enforces
      // both again; this exists so nobody is told "row-level security" for a
      // large TIFF — and so nothing is dropped in silence, which is what the
      // component this replaced did.
      if (file.size > MAX_BYTES) {
        setRefusal("too_large");
        return null;
      }
      if (!ACCEPTED.includes(file.type)) {
        setRefusal("wrong_type");
        return null;
      }

      setBusy(true);
      try {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
        const safe = slug
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40);
        const path = `${branding.facilityId}/${safe || "picture"}-${Date.now()}.${extension}`;

        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          setRefusal("failed");
          setDetail(error.message);
          return null;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return data.publicUrl;
      } finally {
        setBusy(false);
      }
    },
    [branding?.facilityId, supabase],
  );

  return {
    busy,
    refusal,
    detail,
    upload,
    reset,
    maxBytes: MAX_BYTES,
    accepted: ACCEPTED,
  };
}
