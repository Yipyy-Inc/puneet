"use client";

import { useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Video,
  MoreHorizontal,
  MessageSquare,
  PanelRightClose,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MessageBubble, DateSeparator } from "./MessageBubble";
import { ComposeBar } from "./ComposeBar";
import type { Message } from "@/types/communications";
import { clients } from "@/data/clients";

const COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
];

function avatarColor(name: string) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function initials(name: string) {
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

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [threadMessages.length]);

  if (!threadId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50">
        <div className="flex size-24 items-center justify-center rounded-full bg-slate-100">
          <MessageSquare className="size-10 text-slate-300" />
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-700">Your Messages</h3>
        <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-slate-400">
          Select a conversation from the left to view messages, or start a new
          one by clicking the + button
        </p>
      </div>
    );
  }

  // Group by date
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
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3.5">
        <div className="flex items-center gap-3">
          {(client as Record<string, unknown>)?.imageUrl ? (
            <img
              src={(client as Record<string, unknown>).imageUrl as string}
              alt=""
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-sm font-bold text-white",
                avatarColor(clientName),
              )}
            >
              {initials(clientName)}
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-slate-800">{clientName}</h3>
            <p className="text-[11px] text-slate-400">
              {client?.phone ?? client?.email ?? "Online"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-500 hover:text-slate-800"
          >
            <Phone className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-500 hover:text-slate-800"
          >
            <Video className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-500 hover:text-slate-800"
            onClick={onToggleDetail}
          >
            {detailOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <Info className="size-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-slate-500"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View client profile</DropdownMenuItem>
              <DropdownMenuItem>Booking history</DropdownMenuItem>
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-5"
      >
        <div className="mx-auto max-w-3xl space-y-1">
          {grouped.map((item, i) =>
            item.type === "date" ? (
              <DateSeparator key={`d-${i}`} date={item.date} />
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
