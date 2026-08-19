"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkosSupabaseClient } from "@/lib/supabase/workos-client";

// ============================================================================
// The facility's logo, on the Business Profile card.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
//     onClick={() => {
//       const input = document.createElement("input");
//       input.type = "file";
//       input.accept = "image/png,image/jpeg,image/svg+xml";
//       input.click();
//     }}
//
// A file picker with no `onchange`. It opened, the person chose their logo, and
// the File was dropped on the floor — no upload, no state change, no request,
// and no error either. The button looked like it worked, which is why it
// survived: `facilities.logo_url` was `''` and the storage bucket held zero
// objects while somebody was certain they had added a logo.
//
// ── SAME BUCKET AS BRANDING, DIFFERENT COLUMN ─────────────────────────────
//
// `facility-logos` is public and already carries the sign-in branding marks.
// The path is prefixed with the facility id because that first segment IS the
// tenancy boundary the storage policies key on — it is not merely tidy.
//
// The two logos stay separate on purpose: branding's is the mark on a sign-in
// page, this one goes on documents a customer keeps. A facility may reasonably
// want a different one on each, and merging them would be a decision made for
// them.
// ============================================================================

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export function FacilityLogoField({
  businessName,
  logo,
  disabled,
  onChange,
}: {
  businessName: string;
  logo: string;
  disabled: boolean;
  /** Sets `logo` on the draft profile; the card's own Save writes it. */
  onChange: (logoUrl: string) => void;
}) {
  const supabase = useWorkosSupabaseClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The facility id, for the storage path. Branding already fetches it and
  // this is the same cache entry, so it costs nothing here.
  const { data: branding } = useQuery({
    queryKey: ["facility", "branding"],
    queryFn: async (): Promise<{ facilityId: string }> => {
      const response = await fetch("/api/facility/branding");
      if (!response.ok) throw new Error("Could not load your facility.");
      return (await response.json()) as { facilityId: string };
    },
  });

  const initials = (businessName || "F")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function upload(file: File) {
    setError(null);
    if (!branding?.facilityId) {
      setError("Still loading — try again in a moment.");
      return;
    }
    // Checked here for a fast, clear message. Storage enforces both again on
    // its side; this is so nobody is told "row-level security" for a big TIFF.
    if (file.size > MAX_BYTES) {
      setError("That file is over 2 MB. Try a smaller image.");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      setError("Use a PNG, JPEG or WebP image.");
      return;
    }

    setBusy(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${branding.facilityId}/profile-logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("facility-logos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage
        .from("facility-logos")
        .getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {logo ? (
          <Image
            src={logo}
            alt={businessName}
            width={56}
            height={56}
            unoptimized
            className="size-14 rounded-lg border object-contain"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-lg text-lg font-semibold">
            {initials}
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || busy}
              onClick={() => input.current?.click()}
            >
              {busy && <Loader2 className="mr-2 size-3 animate-spin" />}
              {logo ? "Replace logo" : "Upload logo"}
            </Button>
            {logo && !busy && (
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange("")}
              >
                Remove
              </Button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared so picking the SAME file twice fires onChange again —
              // otherwise a failed upload cannot be retried without choosing a
              // different image.
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
          <p className="text-muted-foreground text-xs">
            PNG, JPEG or WebP, up to 2 MB. Square works best — it appears on
            receipts and invoices.
          </p>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
}
