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
    <section className="bg-card border-line flex min-w-0 flex-col gap-3 rounded-2xl border p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Camera className="text-ink-secondary size-5 shrink-0" aria-hidden />
        <h3 className="text-body-strong text-body-ink min-w-0 flex-1">
          {t("photoTitle")}
        </h3>
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
          variant="outline"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
        >
          <Camera aria-hidden />
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
    </section>
  );
}
