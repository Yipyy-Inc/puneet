"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { FileDropzone, FileRow } from "@/components/ui/file-dropzone";
import { MAX_UPLOAD_BYTES, PHOTO_ACCEPT } from "@/lib/files/upload-limits";
import { formatFileSize } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// A photo of the medication's label (§5t's dropzone and file row), where the
// facility asks for one. Optional; kept on the form until the booking is
// saved, then sent (use-label-photos.ts). A photo already on the booking
// stays editable even if the facility has since stopped asking.
// ============================================================================

const PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/heic"]);

export function EditorLabelPhoto({ step }: { step: MedicationStepState }) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const [problem, setProblem] = useState<string | null>(null);
  const photos = step.labelPhotos;
  const draft = step.editor?.draft;
  if (!photos || !draft) return null;
  const photo = photos.photoFor(draft.id);
  if (!step.settings.rules.photo && !photo) return null;
  const limit = formatFileSize(MAX_UPLOAD_BYTES, locale);

  const take = (file: File | undefined) => {
    if (!file) return;
    // Some systems report no type for a HEIC; its name says what it is.
    const isPhoto = PHOTO_TYPES.has(file.type) || /\.hei[cf]$/i.test(file.name);
    if (!isPhoto) {
      setProblem(t("medsPhotoNotImage"));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setProblem(fill(t("medsPhotoTooLarge"), { size: limit }));
      return;
    }
    setProblem(null);
    photos.attach(draft.id, file);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {photo ? (
        <>
          <span className="text-body-strong text-body-ink">
            {t("medsPhotoTitle")}
          </span>
          <FileRow
            name={photo.name}
            meta={
              photo.pending
                ? fill(t("medsPhotoPending"), {
                    size: formatFileSize(photo.sizeBytes, locale),
                  })
                : formatFileSize(photo.sizeBytes, locale)
            }
            icon={ImageIcon}
            thumbnailUrl={photo.url}
            state={{ kind: "done" }}
            onDelete={() => photos.detach(draft.id)}
          />
        </>
      ) : (
        <FileDropzone
          id={`meds-label-photo-${draft.id}`}
          label={t("medsPhotoLabel")}
          hint={fill(t("medsPhotoHint"), { size: limit })}
          accept={PHOTO_ACCEPT}
          invalid={problem !== null}
          onFiles={([file]) => take(file)}
        />
      )}
      {problem ? (
        <p role="alert" className="text-meta text-destructive">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
