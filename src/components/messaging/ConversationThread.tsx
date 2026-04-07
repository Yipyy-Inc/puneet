"use client";

import { useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
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
import { facilities } from "@/data/facilities";

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
  mode = "facility",
}: {
  threadId: string | null;
  messages: Message[];
  detailOpen: boolean;
  onToggleDetail: () => void;
  mode?: "facility" | "customer";
}) {
  const isCustomerMode = mode === "customer";
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

  const counterpartyId = threadMessages[0]?.clientId;
  const client = counterpartyId
    ? clients.find((c) => c.id === counterpartyId)
    : null;
  const facility = counterpartyId
    ? facilities.find((f) => f.id === counterpartyId)
    : null;
  const facilityLogo = (facility as Record<string, unknown>)?.logo as
    | string
    | undefined;
  const counterpartyName = isCustomerMode
    ? (facility?.name ?? threadMessages[0]?.from ?? "Facility")
    : (client?.name ?? threadMessages[0]?.from ?? "Unknown");
  const counterpartyImage = isCustomerMode
    ? facilityLogo
    : ((client as Record<string, unknown>)?.imageUrl as string | undefined);
  const counterpartyContact = isCustomerMode
    ? (facility as Record<string, unknown>)?.contact
    : null;
  const contactLine = isCustomerMode
    ? ((counterpartyContact as Record<string, unknown>)?.phone as
        | string
        | undefined) ||
      ((counterpartyContact as Record<string, unknown>)?.email as
        | string
        | undefined) ||
      "Typically responds within 2 hours"
    : (client?.phone ?? client?.email ?? "Active now");
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
        <h3 className="mt-6 text-xl font-bold text-slate-700">Your Messages</h3>
        <p className="mt-2 max-w-xs text-center text-sm/relaxed text-slate-400">
          {isCustomerMode
            ? "Select a facility conversation from the left panel"
            : "Select a client from the left panel or create a new message"}
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
              src={counterpartyImage}
              alt=""
              className="size-11 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm",
                avatarColor(counterpartyName),
              )}
            >
              {initials(counterpartyName)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">{counterpartyName}</h3>
              <Badge
                variant="outline"
                className="border-slate-200 text-[9px] text-slate-400"
              >
                {channelLabel}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">{contactLine}</p>
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
              <DropdownMenuItem>
                {isCustomerMode ? "View facility profile" : "View client profile"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {isCustomerMode ? "My booking history" : "Booking history"}
              </DropdownMenuItem>
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
            {counterpartyImage ? (
              <img
                src={counterpartyImage}
                alt=""
                className="size-16 rounded-full object-cover shadow-md ring-4 ring-white"
              />
            ) : (
              <div
                className={cn(
                  "flex size-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-md ring-4 ring-white",
                  avatarColor(counterpartyName),
                )}
              >
                {initials(counterpartyName)}
              </div>
            )}
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {counterpartyName}
            </p>
            <p className="text-[11px] text-slate-400">
              {isCustomerMode
                ? (((counterpartyContact as Record<string, unknown>)?.email as
                    | string
                    | undefined) ?? "")
                : (client?.email ?? "")}{" "}
              {(isCustomerMode
                ? ((counterpartyContact as Record<string, unknown>)?.phone as
                    | string
                    | undefined)
                : client?.phone)
                ? `· ${
                    isCustomerMode
                      ? ((counterpartyContact as Record<string, unknown>)?.phone as string)
                      : client?.phone
                  }`
                : ""}
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
                  clientName={counterpartyName}
                  clientImage={counterpartyImage}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* Compose */}
      <ComposeBar
        mode={mode}
        clientName={counterpartyName}
        lastMessage={threadMessages[threadMessages.length - 1]?.body}
      />
    </div>
  );
}
