"use client";

import { useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Video,
  MoreHorizontal,
  MessageSquare,
  PanelRightClose,
  Info,
  Search,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  "bg-amber-500",
  "bg-sky-500",
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
  const channels = [...new Set(threadMessages.map((m) => m.type))];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [threadMessages.length]);

  // Empty state
  if (!threadId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/30">
        <div className="relative">
          <div className="flex size-24 items-center justify-center rounded-3xl bg-blue-50">
            <MessageSquare className="size-10 text-blue-300" />
          </div>
          <div className="absolute -right-2 -bottom-2 flex size-10 items-center justify-center rounded-2xl bg-emerald-50">
            <Star className="size-5 text-emerald-300" />
          </div>
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-700">
          Start a Conversation
        </h3>
        <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-400">
          Select a client from the left panel or create a new message
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

  const channelLabel =
    channels.length === 1
      ? channels[0] === "sms"
        ? "SMS"
        : channels[0] === "email"
          ? "Email"
          : "Chat"
      : `${channels.length} channels`;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {(client as Record<string, unknown>)?.imageUrl ? (
            <img
              src={(client as Record<string, unknown>).imageUrl as string}
              alt=""
              className="size-11 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm",
                avatarColor(clientName),
              )}
            >
              {initials(clientName)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">{clientName}</h3>
              <Badge
                variant="outline"
                className="border-slate-200 text-[9px] text-slate-400"
              >
                {channelLabel}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              {client?.phone ?? client?.email ?? "Active now"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Phone className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Video className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Search className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-9 rounded-full",
              detailOpen
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 hover:bg-blue-50 hover:text-blue-600",
            )}
            onClick={onToggleDetail}
          >
            {detailOpen ? (
              <PanelRightClose className="size-[18px]" />
            ) : (
              <Info className="size-[18px]" />
            )}
          </Button>

          <div className="mx-1 h-5 border-l border-slate-200" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <MoreHorizontal className="size-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>View client profile</DropdownMenuItem>
              <DropdownMenuItem>Booking history</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Pin conversation</DropdownMenuItem>
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500">
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{
          background:
            "linear-gradient(180deg, rgb(248 250 252 / 0.5) 0%, rgb(241 245 249 / 0.3) 100%)",
        }}
      >
        <div className="mx-auto max-w-2xl px-6 py-5">
          {/* Conversation start indicator */}
          <div className="mb-4 flex flex-col items-center py-4 text-center">
            {(client as Record<string, unknown>)?.imageUrl ? (
              <img
                src={(client as Record<string, unknown>).imageUrl as string}
                alt=""
                className="size-16 rounded-full object-cover shadow-md ring-4 ring-white"
              />
            ) : (
              <div
                className={cn(
                  "flex size-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-md ring-4 ring-white",
                  avatarColor(clientName),
                )}
              >
                {initials(clientName)}
              </div>
            )}
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {clientName}
            </p>
            <p className="text-[11px] text-slate-400">
              {client?.email ?? ""} {client?.phone ? `· ${client.phone}` : ""}
            </p>
            <p className="mt-1 text-[10px] text-slate-300">
              Conversation started{" "}
              {threadMessages[0]
                ? new Date(threadMessages[0].timestamp).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    },
                  )
                : ""}
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-0.5">
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
      </div>

      {/* Compose */}
      <ComposeBar />
    </div>
  );
}
