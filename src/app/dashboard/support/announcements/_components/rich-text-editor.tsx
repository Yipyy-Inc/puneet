"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Maximize2,
  Underline,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TOOLS: { cmd: string; icon: typeof Bold; label: string }[] = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
];

type ImageAlign = "left" | "center" | "right" | "full";

const ALIGN_OPTIONS: { value: ImageAlign; label: string; icon: typeof Bold }[] =
  [
    { value: "left", label: "Left", icon: AlignLeft },
    { value: "center", label: "Center", icon: AlignCenter },
    { value: "right", label: "Right", icon: AlignRight },
    { value: "full", label: "Full width", icon: Maximize2 },
  ];

// PNG / JPG / GIF / WebP, max 10MB. In production the file uploads to Yipyy's
// storage and the returned URL is embedded; this mock embeds a data URL so the
// image renders inline everywhere the body HTML is shown.
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const ACCEPT_ATTR = ".png,.jpg,.jpeg,.gif,.webp";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Inline HTML for an embedded image. Inline styles (not editor classes) so it
 *  renders identically in the facility portal's notification feed. */
function buildImageHtml(src: string, alt: string, align: ImageAlign): string {
  const safeAlt = alt.replace(/"/g, "&quot;");
  const wrapStyle =
    align === "full" ? "margin:10px 0" : `margin:10px 0;text-align:${align}`;
  const imgStyle =
    align === "full"
      ? "width:100%;height:auto;border-radius:8px"
      : "max-width:100%;height:auto;border-radius:8px;display:inline-block";
  return `<div style="${wrapStyle}"><img src="${src}" alt="${safeAlt}" style="${imgStyle}" /></div>`;
}

// MP4 / WebM, max 100MB. Production uploads to Yipyy storage + transcodes and
// embeds the returned URL; this mock embeds an object URL for a session preview.
const ACCEPTED_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const ACCEPT_VIDEO_ATTR = ".mp4,.webm";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/** Convert a YouTube / Vimeo watch URL to its embeddable player URL. */
function toEmbedUrl(raw: string): string | null {
  const url = raw.trim();
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/** Responsive 16:9 iframe embed — plays inline with the provider's controls. */
function buildVideoEmbedHtml(embedUrl: string): string {
  return `<div style="position:relative;width:100%;max-width:640px;margin:10px 0;aspect-ratio:16/9"><iframe src="${embedUrl}" title="Embedded video" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:8px" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe></div>`;
}

/** Inline <video> with native controls for an uploaded file. */
function buildUploadedVideoHtml(src: string): string {
  return `<div style="margin:10px 0"><video controls playsinline style="width:100%;max-width:640px;border-radius:8px" src="${src}"></video></div>`;
}

/** Lightweight rich-text editor (no rich-text library in the repo). Uncontrolled
 *  contentEditable seeded once from `initialValue`; emits HTML via onChange. The
 *  parent keys it per announcement so editing a different one remounts. */
export function RichTextEditor({
  initialValue,
  onChange,
  placeholder = "Write your announcement…",
}: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [pending, setPending] = useState<{ src: string; name: string } | null>(
    null,
  );
  const [alt, setAlt] = useState("");
  const [align, setAlign] = useState<ImageAlign>("center");
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    if (!initialized.current && ref.current) {
      initialized.current = true;
      ref.current.innerHTML = initialValue;
    }
  }, [initialValue]);

  function sync() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    ref.current?.focus();
    sync();
  }

  function addLink() {
    const url = window.prompt("Link URL (https://…)");
    if (url) {
      document.execCommand("createLink", false, url);
      sync();
    }
  }

  // Remember where the caret is before the file/alt dialog steals focus, so the
  // image lands where the author was typing.
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRange.current = null;
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error("Unsupported format. Use PNG, JPG, GIF or WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large. Maximum size is 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (src) {
        setPending({ src, name: file.name });
        setAlt("");
        setAlign("center");
      }
    };
    reader.onerror = () => toast.error("Could not read that image file.");
    reader.readAsDataURL(file);
  }

  // Insert HTML at the saved caret (falls back to appending at the end).
  function insertHtmlAtCursor(html: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (sel && sel.rangeCount > 0) {
      document.execCommand("insertHTML", false, html);
    } else {
      el.innerHTML += html;
    }
    sync();
  }

  function insertImage() {
    if (!pending || !alt.trim()) return;
    insertHtmlAtCursor(buildImageHtml(pending.src, alt.trim(), align));
    setPending(null);
  }

  function insertVideoUrl() {
    const embed = toEmbedUrl(videoUrl);
    if (!embed) {
      toast.error("Enter a valid YouTube or Vimeo URL.");
      return;
    }
    insertHtmlAtCursor(buildVideoEmbedHtml(embed));
    setVideoUrl("");
    setVideoDialogOpen(false);
  }

  function onVideoChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_VIDEO_TYPES.has(file.type)) {
      toast.error("Unsupported format. Use MP4 or WebM.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Video is too large. Maximum size is 100MB.");
      return;
    }
    // Mock upload + transcode: object URL stands in for the storage URL.
    const src = URL.createObjectURL(file);
    insertHtmlAtCursor(buildUploadedVideoHtml(src));
    toast.success("Video uploaded and embedded.");
  }

  return (
    <div className="focus-within:border-ring focus-within:ring-ring/30 rounded-lg border transition-shadow focus-within:ring-[3px]">
      <div className="flex items-center gap-0.5 border-b p-1.5">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.cmd}
              type="button"
              aria-label={t.label}
              title={t.label}
              onMouseDown={(e) => {
                e.preventDefault();
                exec(t.cmd);
              }}
              className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
            >
              <Icon className="size-4" />
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Insert link"
          title="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            addLink();
          }}
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <Link2 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Insert image"
          title="Insert image"
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
            fileRef.current?.click();
          }}
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <ImageIcon className="size-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={onFileChosen}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Insert video"
              title="Insert video"
              onPointerDown={saveSelection}
              className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
            >
              <Video className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => setVideoDialogOpen(true)}>
              <Link2 className="size-4" />
              Embed video URL
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => videoFileRef.current?.click()}>
              <Upload className="size-4" />
              Upload video file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={videoFileRef}
          type="file"
          accept={ACCEPT_VIDEO_ATTR}
          className="hidden"
          onChange={onVideoChosen}
        />
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Announcement body"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[260px] px-3 py-2.5 text-sm/relaxed outline-none",
          "empty:before:text-muted-foreground empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)]",
          "[&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5",
          "[&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_video]:h-auto [&_video]:max-w-full",
        )}
      />

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>

          {pending ? (
            <div className="bg-muted/40 flex justify-center rounded-md border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pending.src}
                alt={alt || "Preview"}
                className="max-h-48 w-auto rounded-md"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="image-alt">
              Alt text <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="image-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
              onKeyDown={(e) => {
                if (e.key === "Enter" && alt.trim()) insertImage();
              }}
            />
            <p className="text-muted-foreground text-xs">
              Required for accessibility — the image can’t be inserted without
              it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Alignment</Label>
            <div className="flex gap-1.5">
              {ALIGN_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = align === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAlign(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-md border p-2 text-[11px] transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button disabled={!alt.trim()} onClick={insertImage}>
              Insert image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={videoDialogOpen}
        onOpenChange={(o) => {
          setVideoDialogOpen(o);
          if (!o) setVideoUrl("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed a video</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="video-url">YouTube or Vimeo URL</Label>
            <Input
              id="video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              onKeyDown={(e) => {
                if (e.key === "Enter") insertVideoUrl();
              }}
            />
            <p className="text-muted-foreground text-xs">
              The video plays inline in the announcement. Video announcements
              are delivered in-platform only.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!videoUrl.trim()} onClick={insertVideoUrl}>
              Embed video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
