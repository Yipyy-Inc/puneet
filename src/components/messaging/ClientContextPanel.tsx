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
  ExternalLink,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/communications";

// ── Mock shared media data (derived from conversations) ──────────────

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

  // Extract URLs from message bodies
  const media: SharedMedia[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  for (const msg of threadMsgs) {
    // Check for URLs in body
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
            : new URL(url).hostname,
          date: msg.timestamp,
          sender: msg.direction === "outbound" ? "You" : msg.from,
          thumbnail: isImage ? url : undefined,
        });
      }
    }

    // Check attachments
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

// ── Placeholder media for demo ───────────────────────────────────────

const DEMO_MEDIA: SharedMedia[] = [
  {
    id: "demo-1",
    type: "image",
    url: "/dogs/dog-1.jpg",
    name: "buddy-playtime.jpg",
    date: "2026-02-21T14:30:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-1.jpg",
  },
  {
    id: "demo-2",
    type: "image",
    url: "/dogs/dog-2.jpg",
    name: "max-napping.jpg",
    date: "2026-02-20T11:00:00Z",
    sender: "Sarah Johnson",
    thumbnail: "/dogs/dog-2.jpg",
  },
  {
    id: "demo-3",
    type: "image",
    url: "/dogs/dog-3.jpg",
    name: "evaluation-photo.jpg",
    date: "2026-02-19T09:30:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-3.jpg",
  },
  {
    id: "demo-4",
    type: "link",
    url: "https://pawcare.com/booking/confirm/12345",
    name: "Booking Confirmation",
    date: "2026-02-20T16:00:00Z",
    sender: "You",
  },
  {
    id: "demo-5",
    type: "link",
    url: "https://pawcare.com/policies/boarding",
    name: "Boarding Policy",
    date: "2026-02-18T10:00:00Z",
    sender: "You",
  },
  {
    id: "demo-6",
    type: "document",
    url: "#",
    name: "vaccination-records.pdf",
    size: "245KB",
    date: "2026-02-19T15:00:00Z",
    sender: "Sarah Johnson",
  },
  {
    id: "demo-7",
    type: "document",
    url: "#",
    name: "boarding-agreement.pdf",
    size: "120KB",
    date: "2026-02-17T12:00:00Z",
    sender: "You",
  },
];

function formatMediaDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800">Shared Media</h3>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b px-4 py-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5">
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
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold transition-all",
                tab === t.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
              {t.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[9px]",
                    tab === t.key
                      ? "bg-slate-200 text-slate-700"
                      : "bg-slate-200/50 text-slate-400",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="h-8 w-full rounded-lg bg-slate-50 pr-3 pl-8 text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            {tab === "media" && (
              <ImageIcon className="size-10 text-slate-200" />
            )}
            {tab === "links" && <Link2 className="size-10 text-slate-200" />}
            {tab === "docs" && <FileText className="size-10 text-slate-200" />}
            <p className="mt-3 text-xs text-slate-400">
              No{" "}
              {tab === "media" ? "photos" : tab === "links" ? "links" : "files"}{" "}
              shared yet
            </p>
          </div>
        ) : tab === "media" ? (
          /* Photo grid */
          <div className="grid grid-cols-3 gap-0.5 p-1">
            {filteredMedia.map((item) => (
              <button
                key={item.id}
                className="group relative aspect-square overflow-hidden bg-slate-100"
              >
                <img
                  src={item.thumbnail ?? item.url}
                  alt={item.name}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                <div className="absolute right-0 bottom-0 left-0 bg-black/40 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-[9px] text-white">{item.name}</p>
                </div>
              </button>
            ))}
          </div>
        ) : tab === "links" ? (
          /* Links list */
          <div className="space-y-0.5 px-3 py-2">
            {filteredMedia.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <Link2 className="size-4 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">
                    {item.name}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {item.url}
                  </p>
                  <p className="text-[9px] text-slate-300">
                    {item.sender} · {formatMediaDate(item.date)}
                  </p>
                </div>
                <ExternalLink className="size-3.5 shrink-0 text-slate-300" />
              </a>
            ))}
          </div>
        ) : (
          /* Documents list */
          <div className="space-y-0.5 px-3 py-2">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                  <File className="size-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {item.size ?? "—"} · {item.sender} ·{" "}
                    {formatMediaDate(item.date)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary strip */}
      <div className="border-t px-4 py-2">
        <p className="text-center text-[10px] text-slate-400">
          {counts.media} photos · {counts.links} links · {counts.docs} files
        </p>
      </div>
    </div>
  );
}
