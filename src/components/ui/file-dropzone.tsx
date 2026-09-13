"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import {
  Download,
  RefreshCw,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { middleTruncate } from "@/lib/files/file-name";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// Files in (§5t "File dropzone").
//
// Seven document types — vaccination records, waivers, pet photos, vet notes,
// invoices, grooming before and after, ID — had no pattern at all. This is the
// one: a dashed box that takes a drop or opens the picker, and a row for each
// file that says what is happening to it.
//
// Idle: 1.5px dashed line-strong, 24px radius, 148px tall, the upload glyph,
// "Drop files or browse", then what it accepts. Drag-over: a solid 2px primary
// border on white — never a tint. A file row is 56px: its type glyph (or a
// picture of it) on the inset, the name cut in the MIDDLE, its size or its
// progress, and its actions. A failed upload keeps its row, with the reason
// and, where trying again could work, a retry: a file that vanished is a file
// nobody uploads again.
//
// The controls are the app's 40px, 48px below 1024px (§1, §6 rule 7), not the
// reference page's 34px circles.
// ============================================================================

interface FileDropzoneProps {
  /** The file input's id; one is made when none is given. */
  id?: string;
  /** What the files are, shown as the field's label. */
  label: ReactNode;
  /** What it accepts, and how large. */
  hint: string;
  /** For the picker: MIME types or extensions. */
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  onFiles: (files: File[]) => void;
}

export function FileDropzone({
  id,
  label,
  hint,
  accept,
  multiple = false,
  disabled = false,
  invalid = false,
  onFiles,
}: FileDropzoneProps) {
  const t = useShellText("primitives");
  const generated = useId();
  const inputId = id ?? `dropzone-${generated}`;
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0 || disabled) return;
    onFiles(multiple ? files : files.slice(0, 1));
  };
  const browse = () => {
    if (!disabled) input.current?.click();
  };

  return (
    <div className="space-y-1.5">
      <label
        id={`${inputId}-label`}
        htmlFor={inputId}
        className="text-body-ink block text-[13.5px] font-semibold"
      >
        {label}
      </label>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-labelledby={`${inputId}-label ${inputId}-title`}
        aria-describedby={`${inputId}-hint`}
        data-over={over}
        data-invalid={invalid}
        onClick={browse}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            browse();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
        className="border-line-strong bg-card focus-visible:outline-primary data-[invalid=true]:border-destructive data-[over=true]:border-primary aria-disabled:bg-surface-inset flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed p-[22px] text-center focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed data-[over=true]:border-2 data-[over=true]:border-solid"
      >
        <Upload className="text-ink-tertiary size-6" aria-hidden />
        <span
          id={`${inputId}-title`}
          className="text-heading text-[15.5px] font-bold"
        >
          {t(multiple ? "dropFiles" : "dropFile")}
        </span>
        <span
          id={`${inputId}-hint`}
          className="text-ink-tertiary text-[13.5px] text-pretty"
        >
          {hint}
        </span>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            take(event.target.files);
            // The same file picked again is a new choice, not no change.
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export type FileRowState =
  | { kind: "uploading"; progress: number }
  | { kind: "failed"; reason: string; onRetry?: () => void }
  | { kind: "done" };

interface FileRowProps {
  name: string;
  /** Its size, and when it was added — or empty. */
  meta?: string;
  icon: LucideIcon;
  /** A picture of the file, where there is one; the glyph stands in otherwise. */
  thumbnailUrl?: string | null;
  state: FileRowState;
  onDownload?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function FileRow({
  name,
  meta,
  icon: Icon,
  thumbnailUrl,
  state,
  onDownload,
  onDelete,
  deleting = false,
}: FileRowProps) {
  const t = useShellText("primitives");
  const [broken, setBroken] = useState(false);
  const percent =
    state.kind === "uploading"
      ? Math.round(Math.min(1, Math.max(0, state.progress)) * 100)
      : 0;
  const named = (key: string) => t(key).replace("{name}", () => name);

  return (
    <div
      data-state={state.kind}
      className="border-line bg-card data-[state=failed]:border-destructive flex min-h-14 flex-wrap items-center gap-3 rounded-lg border px-[13px] py-[9px]"
    >
      <span className="bg-surface-inset text-ink-secondary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {thumbnailUrl && !broken ? (
          // A short-lived signed URL or a local preview: next/image would
          // cache it past the moment it stops working.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <Icon className="size-5" aria-hidden />
        )}
      </span>
      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-[3px]">
        <span
          title={name}
          className="text-body-ink truncate text-[15px] font-semibold"
        >
          {middleTruncate(name, 40)}
        </span>
        {state.kind === "failed" ? (
          <span
            role="alert"
            className="text-destructive text-[12.5px] font-semibold"
          >
            {state.reason}
          </span>
        ) : meta ? (
          <span className="text-ink-tertiary text-[12.5px] tabular-nums">
            {meta}
          </span>
        ) : null}
        {state.kind === "uploading" && (
          <span
            role="progressbar"
            aria-label={named("uploadingFile")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="bg-surface-inset-2 block h-[3px] overflow-hidden rounded-full"
          >
            <span
              className="bg-primary block h-full rounded-full"
              style={{ width: `${percent}%` }}
            />
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {state.kind === "failed" && state.onRetry && (
          <Button
            variant="outline"
            onClick={state.onRetry}
            className="border-destructive text-destructive"
          >
            <RefreshCw aria-hidden />
            {t("retryUpload")}
          </Button>
        )}
        {state.kind === "done" && onDownload && (
          <Button
            variant="outline"
            size="icon"
            onClick={onDownload}
            aria-label={named("downloadFile")}
          >
            <Download aria-hidden />
          </Button>
        )}
        {onDelete && state.kind !== "uploading" && (
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            loading={deleting}
            aria-label={named("deleteFile")}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
