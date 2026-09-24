"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Camera, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageUpload } from "@/hooks/use-image-upload";

// ============================================================================
// A PHOTOGRAPH OF A ROOM, A YARD, A STATION — OR A SERVICE.
//
// ── IT DID NOT UPLOAD ANYTHING ────────────────────────────────────────────
//
// It looked exactly as it does now: a drop zone, a file picker, a preview with
// Replace and Remove. What it did was `reader.readAsDataURL(file)`, handing
// the caller a BASE64 STRING which was then written into `image_url` — a
// 5 MB photo becoming ~6.7 MB of text in a column every board that lists
// categories reads on every page load.
//
// Measured before changing it: no `image_url` column in this database holds a
// data URL today, the longest value anywhere being 148 characters. So it was a
// loaded gun rather than a wound, and nothing needs migrating.
//
// It also refused files IN SILENCE — `if (file.size > MAX) return;` — so a
// person choosing a 10 MB photo saw precisely nothing happen. The refusals now
// say which rule was broken, because "nothing happened" is the least useful
// thing an interface can do.
//
// The bytes go to `service-images` now (20260924240000), keyed by facility
// id, and the caller gets back a real public URL.
//
// ── THE NAME IS HISTORICAL ────────────────────────────────────────────────
//
// It is used by rooms, play areas, grooming stations and the service menus.
// It stays in `components/rooms` because `components/ui` is one of the
// `check:ui-french` surfaces held at ZERO with an empty baseline, and this
// file still carries English words of its own — moving it there would fail
// that gate for a tidier import path. Translating it properly is its own
// change; the file says so rather than leaving the next person to wonder.
// ============================================================================

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  /** Label shown above the upload area */
  label?: string;
  /** Hint text below the upload area */
  hint?: string;
  /** Aspect ratio class for the preview — defaults to "aspect-video" */
  aspectClass?: string;
  /** Compact mode for smaller forms */
  compact?: boolean;
  /**
   * A word for the stored file name, so a facility's bucket reads as
   * `deluxe-suite-1727…` rather than a wall of timestamps.
   */
  slug?: string;
}

export function RoomImageUpload({
  value,
  onChange,
  label = "Photo",
  hint,
  aspectClass = "aspect-video",
  compact = false,
  slug = "photo",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { upload, busy, refusal, detail, maxBytes } = useImageUpload();

  const handleFile = useCallback(
    async (file: File) => {
      const url = await upload(file, slug);
      // Null means refused, and the refusal is rendered below rather than
      // swallowed — which is what this did for every oversized file.
      if (url) onChange(url);
    },
    [upload, slug, onChange],
  );

  const refusalText =
    refusal === "too_large"
      ? `That image is over ${Math.round(maxBytes / (1024 * 1024))} MB`
      : refusal === "wrong_type"
        ? "That file is not a PNG, JPEG or WebP"
        : refusal === "not_ready"
          ? "Still loading — try again in a moment"
          : refusal === "failed"
            ? (detail ?? "The upload did not complete")
            : null;

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared FIRST so picking the same file twice fires again — otherwise a
    // failed upload cannot be retried without choosing a different image.
    e.target.value = "";
    if (file) void handleFile(file);
  };

  // ── With image ────────────────────────────────────────────────────────────
  if (value) {
    return (
      <div className="space-y-1.5">
        {!compact && <p className="text-sm/none font-medium">{label}</p>}
        <div
          className={cn(
            "group bg-muted/20 relative overflow-hidden rounded-xl border",
            aspectClass,
          )}
        >
          <img
            src={value}
            alt="Room preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* The buttons are persistent (§6 rule 11) — they carry their own
                solid fill and shadow, so they read over any photo. Only the
                scrim reacts to the pointer, and a scrim is feedback, not an
                affordance. */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 transition-colors group-hover:bg-black/40">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 shadow-lg"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-3.5" />
              )}
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="text-destructive hover:text-destructive h-8 px-2.5 shadow-lg"
              onClick={() => onChange(undefined)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        {refusalText ? (
          <p className="text-[13.5px] text-(--error)">{refusalText}</p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
    );
  }

  // ── Empty state (drop zone) ───────────────────────────────────────────────
  if (compact) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border-2 border-dashed px-3 py-2.5 text-left transition-all",
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/30",
          )}
        >
          <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
            <ImagePlus className="text-muted-foreground size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {busy ? "Uploading…" : "Add photo"}
            </p>
            <p className="text-muted-foreground text-[10px]">
              Drop or click to upload
            </p>
          </div>
        </button>
        {refusalText ? (
          <p className="text-[13.5px] text-(--error)">{refusalText}</p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm/none font-medium">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          aspectClass,
          dragOver
            ? "border-primary bg-primary/5 scale-[1.005]"
            : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/20",
        )}
      >
        <div className="bg-muted/60 mb-2.5 flex size-12 items-center justify-center rounded-2xl">
          <Upload className="text-muted-foreground/60 size-5" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">
          {busy ? (
            "Uploading…"
          ) : (
            <>
              Drop an image here or{" "}
              <span className="text-primary underline underline-offset-2">
                browse
              </span>
            </>
          )}
        </p>
        {/* The ceiling comes from the hook that enforces it, so the sentence
            cannot drift from the rule — the previous copy was a separate
            constant in this file beside a check that used it, and either could
            have moved without the other. */}
        <p className="text-muted-foreground/60 mt-1 text-xs">
          JPG, PNG, or WebP up to {Math.round(maxBytes / (1024 * 1024))}MB
        </p>
      </button>
      {refusalText ? (
        <p className="text-[13.5px] text-(--error)">{refusalText}</p>
      ) : null}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
