"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Image as ImageGlyph } from "lucide-react";
import { toast } from "sonner";

import { FileDropzone, FileRow } from "@/components/ui/file-dropzone";
import {
  customerYipyyGoBookingQueries,
  useDeleteYipyyGoPhoto,
} from "@/lib/api/customer-yipyy-go";
import type { YipyyGoPhoto } from "@/lib/api/mappers/yipyy-go";
import { uploadWithProgress } from "@/lib/api/upload-with-progress";
import { MAX_UPLOAD_BYTES, PHOTO_ACCEPT } from "@/lib/files/upload-limits";
import { formatFileSize } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// One photo on a pre-arrival form: of the belongings, a medication's label, or
// an answer to the facility's question.
//
// The old fields kept a blob: URL — a picture that lived in the tab that took
// it, reached nobody, and was stripped from every save. This one uploads the
// file to the form's private bucket as soon as it is picked
// (/api/customer/yipyy-go/photos), and hands the form the photo's id to save.
//
// §5t: the dropzone while nothing is attached; a row with a determinate bar
// while it uploads; a row that keeps the file when it fails, says why, and
// offers a retry where trying again could work; the photo's row, with
// delete, once it is on the form.
// ============================================================================

export interface AttachedPhoto {
  id: string;
  /** A picture to show: a preview in this tab, or a URL signed for a minute. */
  url: string | null;
  name: string;
  sizeBytes: number;
}

interface PhotoFieldProps {
  id: string;
  label: ReactNode;
  bookingRef: number;
  petRef: number;
  kind: YipyyGoPhoto["kind"];
  /** Which medication or question the photo belongs to. */
  itemRef?: string;
  photo: AttachedPhoto | null;
  invalid?: boolean;
  onChange: (photo: AttachedPhoto | null) => void;
}

interface Upload {
  file: File;
  progress: number;
  failure: string | null;
  /** Whether trying the same file again could work. */
  retry: boolean;
}

export function PhotoField({
  id,
  label,
  bookingRef,
  petRef,
  kind,
  itemRef,
  photo,
  invalid = false,
  onChange,
}: PhotoFieldProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const queryClient = useQueryClient();
  const remove = useDeleteYipyyGoPhoto(bookingRef);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const maxSize = formatFileSize(MAX_UPLOAD_BYTES, locale);

  // A preview made in this tab is let go when it is replaced or unmounted.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const reasonFor = (status: number) =>
    status === 413
      ? t("photoTooLarge").replace("{size}", () => maxSize)
      : status === 415
        ? t("photoNotAPhoto")
        : status === 403
          ? t("photoFormClosed")
          : t("photoUploadFailed");

  const send = async (file: File) => {
    // Refused here rather than after the whole file has crossed the network.
    if (file.size > MAX_UPLOAD_BYTES) {
      setUpload({ file, progress: 0, failure: reasonFor(413), retry: false });
      return;
    }
    setUpload({ file, progress: 0, failure: null, retry: false });
    const form = new FormData();
    form.set("file", file);
    form.set("bookingRef", String(bookingRef));
    form.set("petRef", String(petRef));
    form.set("kind", kind);
    if (itemRef) form.set("itemRef", itemRef);
    try {
      const answer = await uploadWithProgress<YipyyGoPhoto>(
        "/api/customer/yipyy-go/photos",
        form,
        (progress) =>
          setUpload((current) =>
            current && current.file === file
              ? { ...current, progress }
              : current,
          ),
      );
      if (answer.status !== 201 || !answer.body?.id) {
        setUpload({
          file,
          progress: 0,
          failure: reasonFor(answer.status),
          retry: ![403, 413, 415].includes(answer.status),
        });
        return;
      }
      const local = URL.createObjectURL(file);
      setPreview(local);
      setUpload(null);
      onChange({
        id: answer.body.id,
        url: local,
        name: file.name,
        sizeBytes: file.size,
      });
      void queryClient.invalidateQueries({
        queryKey: customerYipyyGoBookingQueries.booking(bookingRef).queryKey,
      });
    } catch {
      setUpload({
        file,
        progress: 0,
        failure: t("photoUploadFailed"),
        retry: true,
      });
    }
  };

  const detach = async () => {
    if (!photo) return;
    try {
      await remove.mutateAsync(photo.id);
      setPreview(null);
      onChange(null);
    } catch {
      toast.error(t("photoNotRemoved"));
    }
  };

  if (upload) {
    return (
      <div className="space-y-1.5">
        <p className="text-body-ink text-[13.5px] font-semibold">{label}</p>
        <FileRow
          name={upload.file.name}
          icon={ImageGlyph}
          meta={
            upload.failure
              ? undefined
              : t("photoUploading").replace("{size}", () =>
                  formatFileSize(upload.file.size, locale),
                )
          }
          state={
            upload.failure
              ? {
                  kind: "failed",
                  reason: upload.failure,
                  onRetry: upload.retry
                    ? () => void send(upload.file)
                    : undefined,
                }
              : { kind: "uploading", progress: upload.progress }
          }
          // A failed file is kept until the owner chooses to let it go.
          onDelete={upload.failure ? () => setUpload(null) : undefined}
        />
      </div>
    );
  }

  if (photo) {
    return (
      <div className="space-y-1.5">
        <p className="text-body-ink text-[13.5px] font-semibold">{label}</p>
        <FileRow
          name={photo.name}
          icon={ImageGlyph}
          thumbnailUrl={photo.url}
          meta={formatFileSize(photo.sizeBytes, locale)}
          state={{ kind: "done" }}
          onDelete={() => void detach()}
          deleting={remove.isPending}
        />
      </div>
    );
  }

  return (
    <FileDropzone
      id={id}
      label={label}
      hint={t("photoHint").replace("{size}", () => maxSize)}
      accept={PHOTO_ACCEPT}
      invalid={invalid}
      onFiles={(files) => {
        if (files[0]) void send(files[0]);
      }}
    />
  );
}
