"use client";

import { useRef } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useEvaluationPhoto } from "@/lib/api/evaluations";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// "Add a photo from the evaluation" — the client's mock (2026-10-02): the
// evaluator snaps one during play (the phone's camera, where there is one)
// and it goes on the owner's card. One photo; another replaces it.
//
// A row at the foot of the note's card, as the mock draws it (2026-10-03).
// ============================================================================

export function PhotoField({
  evaluationId,
  photoUrl,
  disabled,
}: {
  evaluationId: string;
  photoUrl: string | null;
  disabled: boolean;
}) {
  const { t } = useStaffText("evaluations");
  const input = useRef<HTMLInputElement>(null);
  const { upload, remove } = useEvaluationPhoto(evaluationId);
  const busy = upload.isPending || remove.isPending;

  return (
    <div className="mt-1 flex min-w-0 flex-col gap-2">
      <div className="text-ink-secondary flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
        <Camera className="size-[18px] shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">{t("photoTitle")}</span>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/heic"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            upload.mutate(file, {
              onSuccess: () => toast.success(t("photoAdded")),
              onError: (error) =>
                toast.error(t("photoFailed"), { description: error.message }),
            });
          }}
        />
        <Button
          type="button"
          variant="quiet"
          size="mock-34"
          className="px-3 font-semibold"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
        >
          {upload.isPending
            ? t("photoUploading")
            : photoUrl
              ? t("photoRetake")
              : t("photoTake")}
        </Button>
      </div>
      {photoUrl ? (
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          {/* A signed link to a private file: a plain <img>, as PetAvatar
              explains for any URL next/image cannot vouch for. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={t("photoAlt")}
            className="aspect-4/3 w-full max-w-[280px] rounded-xl object-cover"
          />
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || busy}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => toast.success(t("photoRemoved")),
                onError: (error) =>
                  toast.error(t("photoFailed"), {
                    description: error.message,
                  }),
              })
            }
          >
            <Trash2 aria-hidden />
            {t("photoRemove")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
