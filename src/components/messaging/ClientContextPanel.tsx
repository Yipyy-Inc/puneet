"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Image as ImageIcon,
  Link2,
  FileText,
  File,
  Download,
  Search,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/communications";

// ── Shared media types ───────────────────────────────────────────────

interface SharedMedia {
  id: string;
  type: "image" | "link" | "document";
  url: string;
  name: string;
  size?: string;
  date: string;
  sender: string;
  thumbnail?: string;
}

function extractSharedMedia(
  messages: Message[],
  threadId: string,
): SharedMedia[] {
  const threadMsgs = messages.filter((m) => (m.threadId ?? m.id) === threadId);
  const media: SharedMedia[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  for (const msg of threadMsgs) {
    const urls = msg.body.match(urlRegex);
    if (urls) {
      for (const url of urls) {
        const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url);
        media.push({
          id: `${msg.id}-${url}`,
          type: isImage ? "image" : "link",
          url,
          name: isImage
            ? (url.split("/").pop() ?? "image")
            : (() => {
                try {
                  return new URL(url).hostname;
                } catch {
                  return url;
                }
              })(),
          date: msg.timestamp,
          sender: msg.direction === "outbound" ? "You" : msg.from,
          thumbnail: isImage ? url : undefined,
        });
      }
    }

    if (msg.attachments) {
      for (const att of msg.attachments) {
        const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(
          att.name ?? att.url ?? "",
        );
        media.push({
          id: `${msg.id}-att-${att.name}`,
          type: isImage ? "image" : "document",
          url: att.url ?? "#",
          name: att.name ?? "Attachment",
          size: att.size ? `${Math.round(att.size / 1024)}KB` : undefined,
          date: msg.timestamp,
          sender: msg.direction === "outbound" ? "You" : msg.from,
        });
      }
    }
  }

  return media.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// Demo data
const DEMO_MEDIA: SharedMedia[] = [
  {
    id: "demo-1",
    type: "image",
    url: "/dogs/dog-1.jpg",
    name: "buddy-playtime.jpg",
    date: "2026-04-03T14:30:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-1.jpg",
  },
  {
    id: "demo-2",
    type: "image",
    url: "/dogs/dog-2.jpg",
    name: "max-afternoon.jpg",
    date: "2026-04-02T11:00:00Z",
    sender: "Client",
    thumbnail: "/dogs/dog-2.jpg",
  },
  {
    id: "demo-3",
    type: "image",
    url: "/dogs/dog-3.jpg",
    name: "evaluation-report.jpg",
    date: "2026-04-01T09:30:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-3.jpg",
  },
  {
    id: "demo-4",
    type: "image",
    url: "/dogs/dog-4.jpg",
    name: "daycare-fun.jpg",
    date: "2026-03-30T15:00:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-4.jpg",
  },
  {
    id: "demo-5",
    type: "image",
    url: "/cats/cat-1.jpg",
    name: "whiskers-nap.jpg",
    date: "2026-03-28T10:00:00Z",
    sender: "Client",
    thumbnail: "/cats/cat-1.jpg",
  },
  {
    id: "demo-6",
    type: "image",
    url: "/cats/cat-2.jpg",
    name: "luna-playing.jpg",
    date: "2026-03-25T16:00:00Z",
    sender: "You",
    thumbnail: "/cats/cat-2.jpg",
  },
  {
    id: "demo-10",
    type: "link",
    url: "https://pawcare.com/booking/confirm/12345",
    name: "Booking Confirmation #12345",
    date: "2026-04-03T16:00:00Z",
    sender: "You",
  },
  {
    id: "demo-11",
    type: "link",
    url: "https://pawcare.com/policies/boarding",
    name: "Boarding Policy & Guidelines",
    date: "2026-04-01T10:00:00Z",
    sender: "You",
  },
  {
    id: "demo-12",
    type: "link",
    url: "https://pawcare.com/vaccination-schedule",
    name: "Vaccination Schedule 2026",
    date: "2026-03-28T14:00:00Z",
    sender: "Client",
  },
  {
    id: "demo-20",
    type: "document",
    url: "#",
    name: "vaccination-records.pdf",
    size: "245 KB",
    date: "2026-04-02T15:00:00Z",
    sender: "Client",
  },
  {
    id: "demo-21",
    type: "document",
    url: "#",
    name: "boarding-agreement-2026.pdf",
    size: "120 KB",
    date: "2026-04-01T12:00:00Z",
    sender: "You",
  },
  {
    id: "demo-22",
    type: "document",
    url: "#",
    name: "pet-insurance-claim.pdf",
    size: "380 KB",
    date: "2026-03-29T09:00:00Z",
    sender: "Client",
  },
];

function formatMediaDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────

export function ClientContextPanel({
  threadId,
  messages,
  onClose,
}: {
  threadId: string | null;
  messages: Message[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"media" | "links" | "docs">("media");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const sharedMedia = useMemo(() => {
    if (!threadId) return [];
    const extracted = extractSharedMedia(messages, threadId);
    return extracted.length > 0 ? extracted : DEMO_MEDIA;
  }, [threadId, messages]);

  const filteredMedia = useMemo(() => {
    let items = sharedMedia;
    if (tab === "media") items = items.filter((m) => m.type === "image");
    if (tab === "links") items = items.filter((m) => m.type === "link");
    if (tab === "docs") items = items.filter((m) => m.type === "document");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((m) => m.name.toLowerCase().includes(q));
    }
    return items;
  }, [sharedMedia, tab, searchQuery]);

  const counts = {
    media: sharedMedia.filter((m) => m.type === "image").length,
    links: sharedMedia.filter((m) => m.type === "link").length,
    docs: sharedMedia.filter((m) => m.type === "document").length,
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-[13px] font-bold text-slate-800">Media & Files</h3>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full text-slate-400 hover:text-slate-600"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(
            [
              {
                key: "media" as const,
                label: "Photos",
                icon: ImageIcon,
                count: counts.media,
              },
              {
                key: "links" as const,
                label: "Links",
                icon: Link2,
                count: counts.links,
              },
              {
                key: "docs" as const,
                label: "Files",
                icon: FileText,
                count: counts.docs,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 transition-all",
                tab === t.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <t.icon className="size-4" />
              <span className="text-[9px] font-semibold">
                {t.label}
                <span className="ml-0.5 opacity-50">{t.count}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      {(tab === "links" || tab === "docs") && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                tab === "links" ? "Search links..." : "Search files..."
              }
              className="h-8 w-full rounded-lg bg-slate-50 pr-3 pl-8 text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            {tab === "media" && (
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50">
                <ImageIcon className="size-6 text-blue-300" />
              </div>
            )}
            {tab === "links" && (
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-50">
                <Link2 className="size-6 text-violet-300" />
              </div>
            )}
            {tab === "docs" && (
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50">
                <FileText className="size-6 text-amber-300" />
              </div>
            )}
            <p className="mt-3 text-xs font-medium text-slate-400">
              No{" "}
              {tab === "media" ? "photos" : tab === "links" ? "links" : "files"}{" "}
              shared
            </p>
            <p className="mt-0.5 text-[10px] text-slate-300">
              Shared media will appear here
            </p>
          </div>
        ) : tab === "media" ? (
          /* ── Photo grid ── */
          <div className="grid grid-cols-3 gap-[2px] p-[2px]">
            {filteredMedia.map((item) => (
              <button
                key={item.id}
                className="group relative aspect-square overflow-hidden bg-slate-100"
                onClick={() => setSelectedImage(item.url)}
              >
                <img
                  src={item.thumbnail ?? item.url}
                  alt={item.name}
                  className="size-full object-cover transition-all duration-200 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all group-hover:opacity-100">
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm">
                    <Eye className="size-4 text-slate-700" />
                  </div>
                </div>
                <div className="absolute right-1 bottom-1 left-1 opacity-0 transition-all group-hover:opacity-100">
                  <p className="truncate rounded bg-black/50 px-1 py-0.5 text-[8px] text-white">
                    {formatMediaDate(item.date)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : tab === "links" ? (
          /* ── Links ── */
          <div className="px-3 py-1">
            {filteredMedia.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 transition-colors group-hover:bg-violet-100">
                  <Link2 className="size-4 text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-slate-700">
                    {item.name}
                  </p>
                  <p className="truncate text-[9px] text-slate-400">
                    {item.sender} · {formatMediaDate(item.date)}
                  </p>
                </div>
                <ChevronRight className="size-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        ) : (
          /* ── Documents ── */
          <div className="px-3 py-1">
            {filteredMedia.map((item) => {
              const isPdf = item.name.endsWith(".pdf");
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-slate-50"
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isPdf
                        ? "bg-red-50 group-hover:bg-red-100"
                        : "bg-amber-50 group-hover:bg-amber-100",
                    )}
                  >
                    <File
                      className={cn(
                        "size-4",
                        isPdf ? "text-red-500" : "text-amber-500",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-slate-700">
                      {item.name}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {item.size ?? "—"} · {item.sender} ·{" "}
                      {formatMediaDate(item.date)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 rounded-full text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:text-blue-500"
                  >
                    <Download className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="border-t px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            {counts.media + counts.links + counts.docs} items shared
          </p>
          <button
            type="button"
            className="text-[10px] font-medium text-blue-500 hover:text-blue-600"
          >
            See all
          </button>
        </div>
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 size-10 rounded-full text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="size-5" />
          </Button>
          <img
            src={selectedImage}
            alt=""
            className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
