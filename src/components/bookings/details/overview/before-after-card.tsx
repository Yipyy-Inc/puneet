"use client";

import { useRef } from "react";
import { toast } from "sonner";

import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { useUploadAppointmentPhoto } from "@/lib/api/grooming-appointments";
import type { GroomingPhoto } from "@/types/grooming";

import {
  DetailsCard,
  DetailsCardHeader,
  DetailsCardNote,
} from "../details-card";
import type { BookingDetails } from "../use-booking-details";
import type { ServiceFacts } from "../use-service-facts";

// ============================================================================
// Before & after, as the mock draws it: two square slots under a dashed line,
// striped until a photo is taken. A slot is a button — tap it to take or
// choose the photo, which goes to the groom's own private photos
// (`grooming_photos`) and shows here from a short-lived signed URL.
// ============================================================================

export function BeforeAfterCard({
  d,
  facts,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
}) {
  const { t } = d.text;
  const groom = facts.grooming;
  const latest = (photos?: GroomingPhoto[]) =>
    [...(photos ?? [])].sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  return (
    <DetailsCard>
      <DetailsCardHeader title={t("cardBeforeAfter")}>
        <DetailsCardNote>{t("sharedAtPickup")}</DetailsCardNote>
      </DetailsCardHeader>
      <div className="grid grid-cols-2 gap-2.5 px-5 py-4">
        <Slot
          d={d}
          appointmentId={groom?.id}
          kind="before"
          photo={latest(groom?.beforePhotoList)}
        />
        <Slot
          d={d}
          appointmentId={groom?.id}
          kind="after"
          photo={latest(groom?.afterPhotos)}
        />
      </div>
    </DetailsCard>
  );
}

function Slot({
  d,
  appointmentId,
  kind,
  photo,
}: {
  d: BookingDetails;
  appointmentId: string | undefined;
  kind: "before" | "after";
  photo: GroomingPhoto | undefined;
}) {
  const { t } = d.text;
  const upload = useUploadAppointmentPhoto();
  const input = useRef<HTMLInputElement>(null);
  const label = t(kind === "before" ? "beforePhotoSlot" : "afterPhotoSlot");

  const choose = (file: File | undefined) => {
    if (!file || !appointmentId) return;
    upload.mutate(
      { appointmentId, kind, file },
      {
        onSuccess: () => toast.success(t("photoAdded")),
        onError: (error) =>
          toast.error(t("photoNotAdded"), { description: error.message }),
      },
    );
  };

  return (
    <>
      <button
        type="button"
        disabled={!appointmentId || upload.isPending}
        aria-label={t(kind === "before" ? "addBeforePhoto" : "addAfterPhoto")}
        onClick={() => input.current?.click()}
        className="block aspect-square w-full overflow-hidden rounded-[14px]"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a signed, private URL
          <img
            src={photo.url}
            alt=""
            className="size-full rounded-[14px] object-cover"
          />
        ) : (
          <PhotoPlaceholder shape="slot" label={label} />
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/heic"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </>
  );
}
