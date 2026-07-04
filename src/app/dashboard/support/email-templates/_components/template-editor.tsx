"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
  EMAIL_IMAGE_ACCEPT,
  EMAIL_IMAGE_MAX_BYTES,
  EMAIL_IMAGE_TYPES,
  hydrateEmailBodyForEditor,
  serializeEmailBody,
  uploadEmailImage,
} from "@/lib/api/email-templates";

export interface TemplateEditorHandle {
  /** Insert text (e.g. a merge tag) at the current caret. */
  insert: (text: string) => void;
}

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

// The editor DOM uses the session preview (blob) `src` for display, and carries
// the CDN URL in `data-cdn-src`; on emit that rewrites back to the CDN URL, so
// the stored email HTML only ever references CDN URLs (never base64).
function buildImageHtml(
  previewUrl: string,
  cdnUrl: string,
  alt: string,
  align: ImageAlign,
): string {
  const safeAlt = alt.replace(/"/g, "&quot;");
  const wrapStyle =
    align === "full" ? "margin:10px 0" : `margin:10px 0;text-align:${align}`;
  const imgStyle =
    align === "full"
      ? "width:100%;height:auto;border-radius:8px"
      : "max-width:100%;height:auto;border-radius:8px;display:inline-block";
  return `<div style="${wrapStyle}"><img src="${previewUrl}" data-cdn-src="${cdnUrl}" alt="${safeAlt}" style="${imgStyle}" /></div>`;
}

/** Lightweight rich-text editor (contentEditable + execCommand). Uncontrolled,
 *  seeded once from initialValue; exposes insert() so the merge-tags panel can
 *  drop a {{tag}} at the caret. The parent keys it per template so switching
 *  templates remounts with fresh content. */
export const TemplateEditor = forwardRef<
  TemplateEditorHandle,
  { initialValue: string; onChange: (html: string) => void }
>(function TemplateEditor({ initialValue, onChange }, ref) {
  const elRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [pending, setPending] = useState<{
    previewUrl: string;
    cdnUrl: string;
  } | null>(null);
  const [alt, setAlt] = useState("");
  const [align, setAlign] = useState<ImageAlign>("center");

  useEffect(() => {
    if (!initialized.current && elRef.current) {
      initialized.current = true;
      elRef.current.innerHTML = hydrateEmailBodyForEditor(initialValue);
    }
  }, [initialValue]);

  // Emit the STORAGE form of the body (CDN image URLs, never blob/base64).
  function emit() {
    if (elRef.current) onChange(serializeEmailBody(elRef.current.innerHTML));
  }

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    elRef.current?.focus();
    emit();
  }

  function addLink() {
    const url = window.prompt("Link URL (https://…)");
    if (url) {
      document.execCommand("createLink", false, url);
      emit();
    }
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && elRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRange.current = null;
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!EMAIL_IMAGE_TYPES.has(file.type)) {
      toast.error("Unsupported format. Use PNG, JPG, GIF or WebP.");
      return;
    }
    if (file.size > EMAIL_IMAGE_MAX_BYTES) {
      toast.error("Image is too large. Maximum size is 10MB.");
      return;
    }
    // Upload to Yipyy's CDN (mock) — returns an HTTPS URL for the email HTML.
    const { url, previewUrl } = uploadEmailImage(file, crypto.randomUUID());
    setPending({ previewUrl, cdnUrl: url });
    setAlt("");
    setAlign("center");
  }

  function insertImage() {
    if (!pending || !alt.trim()) return;
    const html = buildImageHtml(
      pending.previewUrl,
      pending.cdnUrl,
      alt.trim(),
      align,
    );
    const el = elRef.current;
    if (el) {
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
      emit();
    }
    setPending(null);
  }

  useImperativeHandle(
    ref,
    () => ({
      insert: (text: string) => {
        const el = elRef.current;
        if (!el) return;
        el.focus();
        document.execCommand("insertText", false, text);
        onChange(serializeEmailBody(el.innerHTML));
      },
    }),
    [onChange],
  );

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
          accept={EMAIL_IMAGE_ACCEPT}
          className="hidden"
          onChange={onFileChosen}
        />
      </div>
      <div
        ref={elRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        className={cn(
          "min-h-[300px] px-3 py-2.5 text-sm/relaxed outline-none",
          "[&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5",
          "[&_img]:h-auto [&_img]:max-w-full",
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
                src={pending.previewUrl}
                alt={alt || "Preview"}
                className="max-h-48 w-auto rounded-md"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email-image-alt">
              Alt text <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="email-image-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
              onKeyDown={(e) => {
                if (e.key === "Enter" && alt.trim()) insertImage();
              }}
            />
            <p className="text-muted-foreground text-xs">
              Required for accessibility — the image can’t be inserted without
              it. Hosted on Yipyy’s CDN (HTTPS) and referenced by URL.
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
    </div>
  );
});
