"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const MAX_SIZE_MB = 5;

export function RoomImageUpload({
  value,
  onChange,
  label = "Photo",
  hint,
  aspectClass = "aspect-video",
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") onChange(reader.result);
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // ── With image ────────────────────────────────────────────────────────────
  if (value) {
    return (
      <div className="space-y-1.5">
        {!compact && (
          <p className="text-sm leading-none font-medium">{label}</p>
        )}
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
          {/* Overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 shadow-lg"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-3.5" />
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
            <p className="text-xs font-medium">Add photo</p>
            <p className="text-muted-foreground text-[10px]">
              Drop or click to upload
            </p>
          </div>
        </button>
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
      <p className="text-sm leading-none font-medium">{label}</p>
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
          Drop an image here or{" "}
          <span className="text-primary underline underline-offset-2">
            browse
          </span>
        </p>
        <p className="text-muted-foreground/60 mt-1 text-xs">
          JPG, PNG, or WebP up to {MAX_SIZE_MB}MB
        </p>
      </button>
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
