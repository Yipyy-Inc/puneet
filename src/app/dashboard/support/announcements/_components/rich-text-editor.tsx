"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link2, List, Underline, Video } from "lucide-react";
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

// ── WHAT THIS EDITOR CAN PUT IN A BODY, AND WHY ONLY THAT ──────────────────
//
// The body is saved to public.platform_announcements and shown in every
// targeted facility's portal, through an allowlist sanitiser
// (src/lib/announcements/sanitize-html.ts). So the editor offers exactly what
// survives it: bold, italic, underline, lists, links, and a YouTube or Vimeo
// embed.
//
// Image and video UPLOAD were removed on 2026-09-18. An image went in as a
// base64 data URL (up to 10MB) — every facility page would have downloaded it
// inside the announcement row — and an uploaded video was a blob: URL that
// existed only in the admin's own tab, behind a toast that said "Video uploaded
// and embedded". Both need file storage to be real; until then they are not
// offered.

const TOOLS: { cmd: string; icon: typeof Bold; label: string }[] = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
];

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

/** A bare embed: the sanitiser keeps an iframe only with an exact player URL,
 *  and the reader's CSS sizes it, so no inline style is written. */
function buildVideoEmbedHtml(embedUrl: string): string {
  return `<div><iframe src="${embedUrl}" title="Embedded video" allowfullscreen></iframe></div>`;
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
  const savedRange = useRef<Range | null>(null);

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

  // Remember where the caret is before the dialog steals focus, so the embed
  // lands where the author was typing.
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRange.current = null;
    }
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
              className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-10 items-center justify-center rounded-full transition-colors max-lg:size-12"
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
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-10 items-center justify-center rounded-full transition-colors max-lg:size-12"
        >
          <Link2 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Embed a video"
          title="Embed a video"
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
            setVideoDialogOpen(true);
          }}
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-10 items-center justify-center rounded-full transition-colors max-lg:size-12"
        >
          <Video className="size-4" />
        </button>
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
          "[&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:max-w-full",
        )}
      />

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
              The video plays inline in the announcement.
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
