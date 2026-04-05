"use client";

import { useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  Video,
  Star,
  MoreHorizontal,
  MessageSquare,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChannelBadge } from "./ChannelBadge";
import { MessageBubble, DateSeparator } from "./MessageBubble";
import { ComposeBar } from "./ComposeBar";
import type { Message } from "@/types/communications";
import { clients } from "@/data/clients";

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ConversationThread({
  threadId,
  messages,
  detailOpen,
  onToggleDetail,
}: {
  threadId: string | null;
  messages: Message[];
  detailOpen: boolean;
  onToggleDetail: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadMessages = useMemo(() => {
    if (!threadId) return [];
    return messages
      .filter((m) => (m.threadId ?? m.id) === threadId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [threadId, messages]);

  const clientId = threadMessages[0]?.clientId;
  const client = clientId ? clients.find((c) => c.id === clientId) : null;
  const clientName = client?.name ?? threadMessages[0]?.from ?? "Unknown";
  const channels = [...new Set(threadMessages.map((m) => m.type))];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [threadMessages.length]);

  if (!threadId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/30">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
          <MessageSquare className="size-7 text-slate-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-700">
          Select a conversation
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose a thread from the left or start a new message
        </p>
      </div>
    );
  }

  // Group messages by date
  const grouped: Array<
    { type: "date"; date: string } | { type: "msg"; msg: Message }
  > = [];
  let lastDate = "";
  for (const msg of threadMessages) {
    const date = new Date(msg.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (date !== lastDate) {
      grouped.push({ type: "date", date });
      lastDate = date;
    }
    grouped.push({ type: "msg", msg });
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-50/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          {(client as Record<string, unknown>)?.imageUrl ? (
            <img
              src={(client as Record<string, unknown>).imageUrl as string}
              alt={clientName}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                getAvatarColor(clientName),
              )}
            >
              {getInitials(clientName)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{clientName}</h3>
              {channels.map((ch) => (
                <ChannelBadge key={ch} channel={ch} size="xs" />
              ))}
            </div>
            {client?.phone && (
              <a
                href={`tel:${client.phone}`}
                className="text-muted-foreground text-xs hover:underline"
              >
                {client.phone}
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {client?.phone && (
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <a href={`tel:${client.phone}`}>
                <Phone className="size-4" />
              </a>
            </Button>
          )}
          {client?.email && (
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <a href={`mailto:${client.email}`}>
                <Mail className="size-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-8">
            <Video className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8">
            <Star className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View client profile</DropdownMenuItem>
              <DropdownMenuItem>View booking history</DropdownMenuItem>
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="border-border ml-1 h-6 border-l" />
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onToggleDetail}
          >
            {detailOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto max-w-2xl space-y-1">
          {grouped.map((item, i) =>
            item.type === "date" ? (
              <DateSeparator key={`date-${i}`} date={item.date} />
            ) : (
              <MessageBubble
                key={item.msg.id}
                message={item.msg}
                clientName={clientName}
              />
            ),
          )}
        </div>
      </div>

      {/* Compose */}
      <ComposeBar />
    </div>
  );
}
