"use client";

import { useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Info,
  Link2,
  Maximize2,
  Search,
  Upload,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useKbState } from "@/lib/kb-articles-store";
import type { KbImageAlign } from "@/lib/tiptap/kb-image";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const ALIGN_OPTIONS: {
  value: KbImageAlign;
  label: string;
  icon: typeof AlignLeft;
}[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
  { value: "full", label: "Full width", icon: Maximize2 },
];

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

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
    >
      {children}
    </button>
  );
}

export function KbMediaTools({ editor }: { editor: Editor }) {
  const { articles } = useKbState();
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [dialog, setDialog] = useState<
    null | "image" | "video" | "link" | "tooltip"
  >(null);

  // Image
  const [imageSrc, setImageSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [imgAlign, setImgAlign] = useState<KbImageAlign>("center");
  // Video embed
  const [videoUrl, setVideoUrl] = useState("");
  // Link
  const [linkTab, setLinkTab] = useState<"external" | "internal">("external");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  // Tooltip
  const [tooltipText, setTooltipText] = useState("");

  const filteredArticles = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    const list = q
      ? articles.filter((a) => a.title.toLowerCase().includes(q))
      : articles;
    return list.slice(0, 20);
  }, [articles, linkSearch]);

  const requireSelection = () => {
    if (editor.state.selection.empty) {
      toast.error("Select some text first.");
      return false;
    }
    return true;
  };

  // ---- Image ----
  const onImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      toast.error("Use PNG, JPG, GIF or WebP.");
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
        setImageSrc(src);
        setAlt("");
        setImgAlign("center");
        setDialog("image");
      }
    };
    reader.readAsDataURL(file);
  };

  const insertImage = () => {
    editor
      .chain()
      .focus()
      .setImage({ src: imageSrc, alt: alt.trim(), align: imgAlign } as {
        src: string;
        alt?: string;
        align?: KbImageAlign;
      })
      .run();
    setDialog(null);
  };

  // ---- Video ----
  const insertVideoUrl = () => {
    const embed = toEmbedUrl(videoUrl);
    if (!embed) {
      toast.error("Enter a valid YouTube or Vimeo URL.");
      return;
    }
    editor.chain().focus().setVideoEmbed(embed).run();
    setVideoUrl("");
    setDialog(null);
  };

  const onVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!VIDEO_TYPES.has(file.type)) {
      toast.error("Use MP4 or WebM.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Video is too large. Maximum size is 100MB.");
      return;
    }
    const src = URL.createObjectURL(file);
    editor.chain().focus().setVideoFile(src).run();
    toast.success("Video uploaded and embedded.");
  };

  // ---- Link ----
  const openLink = () => {
    if (!requireSelection()) return;
    setLinkTab("external");
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkSearch("");
    setDialog("link");
  };

  const applyExternalLink = () => {
    const href = linkUrl.trim();
    if (!href) {
      toast.error("Enter a URL.");
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href, target: "_blank" })
      .run();
    setDialog(null);
  };

  const applyInternalLink = (id: string) => {
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: `/dashboard/support/knowledge-base/editor?id=${id}`,
        target: "_self",
      })
      .run();
    setDialog(null);
  };

  // ---- Tooltip ----
  const openTooltip = () => {
    if (!requireSelection()) return;
    setTooltipText(editor.getAttributes("tooltip").definition ?? "");
    setDialog("tooltip");
  };

  const applyTooltip = () => {
    const def = tooltipText.trim();
    if (!def) {
      editor.chain().focus().unsetTooltip().run();
    } else {
      editor.chain().focus().setTooltip(def).run();
    }
    setDialog(null);
  };

  return (
    <>
      <ToolbarButton
        label="Insert image"
        onClick={() => imageFileRef.current?.click()}
      >
        <ImageIcon className="size-4" />
      </ToolbarButton>
      <input
        ref={imageFileRef}
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onImageFile}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Insert video"
            title="Insert video"
            onMouseDown={(e) => e.preventDefault()}
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
          >
            <Video className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setDialog("video")}>
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
        accept=".mp4,.webm"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onVideoFile}
      />

      <ToolbarButton label="Insert link" onClick={openLink}>
        <Link2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Definition tooltip" onClick={openTooltip}>
        <Info className="size-4" />
      </ToolbarButton>

      {/* Image dialog */}
      <Dialog
        open={dialog === "image"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>
          {imageSrc ? (
            <div className="bg-muted/40 flex justify-center rounded-md border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={alt || "Preview"}
                className="max-h-40 w-auto rounded-md"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="kb-alt">Alt text</Label>
            <Input
              id="kb-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Alignment</Label>
            <div className="flex gap-1.5">
              {ALIGN_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = imgAlign === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setImgAlign(opt.value)}
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
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={insertImage}>Insert image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video embed dialog */}
      <Dialog
        open={dialog === "video"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed a video</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="kb-video-url">YouTube or Vimeo URL</Label>
            <Input
              id="kb-video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              onKeyDown={(e) => {
                if (e.key === "Enter") insertVideoUrl();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button disabled={!videoUrl.trim()} onClick={insertVideoUrl}>
              Embed video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link dialog */}
      <Dialog
        open={dialog === "link"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <Tabs
            value={linkTab}
            onValueChange={(v) => setLinkTab(v as "external" | "internal")}
          >
            <TabsList>
              <TabsTrigger value="external">
                <ExternalLink className="size-3.5" />
                External
              </TabsTrigger>
              <TabsTrigger value="internal">
                <FileText className="size-3.5" />
                Internal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="external" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="kb-link-url">URL</Label>
                <Input
                  id="kb-link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyExternalLink();
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  Opens in a new tab.
                </p>
              </div>
              <div className="flex justify-end">
                <Button disabled={!linkUrl.trim()} onClick={applyExternalLink}>
                  Add link
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="internal" className="space-y-3 pt-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                <Input
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Search KB articles by title…"
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-56 rounded-md border">
                <div className="divide-y">
                  {filteredArticles.length === 0 ? (
                    <p className="text-muted-foreground p-4 text-sm">
                      No articles match.
                    </p>
                  ) : (
                    filteredArticles.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => applyInternalLink(a.id)}
                        className="hover:bg-muted/50 flex w-full items-center gap-2 p-2.5 text-left"
                      >
                        <FileText className="text-muted-foreground size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {a.title}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {a.category}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Tooltip dialog */}
      <Dialog
        open={dialog === "tooltip"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definition tooltip</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="kb-tooltip">Explanation shown on hover</Label>
            <Input
              id="kb-tooltip"
              value={tooltipText}
              onChange={(e) => setTooltipText(e.target.value)}
              placeholder="e.g. SLA — Service Level Agreement"
              onKeyDown={(e) => {
                if (e.key === "Enter") applyTooltip();
              }}
            />
            <p className="text-muted-foreground text-xs">
              Leave blank to remove the tooltip from the selected text.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={applyTooltip}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
