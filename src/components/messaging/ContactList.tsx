"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MessageSquare, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelBadge } from "./ChannelBadge";
import type { Message } from "@/types/communications";
import { clients } from "@/data/clients";

// ── Types ────────────────────────────────────────────────────────────

export interface Thread {
  threadId: string;
  clientId: number;
  clientName: string;
  clientImage?: string;
  lastMessage: Message;
  unreadCount: number;
  channels: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Filter types ─────────────────────────────────────────────────────

type FilterType = "all" | "unread" | "sms" | "email" | "chat";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
  { key: "chat", label: "Chat" },
];

// ── Component ────────────────────────────────────────────────────────

export function ContactList({
  messages,
  selectedThreadId,
  onSelectThread,
}: {
  messages: Message[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [newMessageMode, setNewMessageMode] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const clientResults = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 8);
    const q = clientSearch.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)),
      )
      .slice(0, 8);
  }, [clientSearch]);

  const threads = useMemo(() => {
    const threadMap = new Map<string, Thread>();

    for (const msg of messages) {
      const tid = msg.threadId ?? msg.id;
      const existing = threadMap.get(tid);

      if (
        !existing ||
        new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)
      ) {
        const client = msg.clientId
          ? clients.find((c) => c.id === msg.clientId)
          : null;
        const channels = new Set(existing?.channels ?? []);
        channels.add(msg.type);

        threadMap.set(tid, {
          threadId: tid,
          clientId: msg.clientId ?? 0,
          clientName: client?.name ?? msg.from,
          clientImage: (client as Record<string, unknown>)?.imageUrl as
            | string
            | undefined,
          lastMessage: msg,
          unreadCount: (existing?.unreadCount ?? 0) + (!msg.hasRead ? 1 : 0),
          channels: [...channels],
        });
      } else {
        existing.channels = [...new Set([...existing.channels, msg.type])];
        if (!msg.hasRead) existing.unreadCount++;
      }
    }

    return [...threadMap.values()].sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime(),
    );
  }, [messages]);

  const filtered = useMemo(() => {
    let list = threads;
    if (filter === "unread") list = list.filter((t) => t.unreadCount > 0);
    if (filter === "sms") list = list.filter((t) => t.channels.includes("sms"));
    if (filter === "email")
      list = list.filter((t) => t.channels.includes("email"));
    if (filter === "chat")
      list = list.filter((t) => t.channels.includes("in-app"));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.clientName.toLowerCase().includes(q) ||
          t.lastMessage.body.toLowerCase().includes(q),
      );
    }
    return list;
  }, [threads, filter, search]);

  const counts = {
    all: threads.length,
    unread: threads.filter((t) => t.unreadCount > 0).length,
    sms: threads.filter((t) => t.channels.includes("sms")).length,
    email: threads.filter((t) => t.channels.includes("email")).length,
    chat: threads.filter((t) => t.channels.includes("in-app")).length,
  };

  const isFailed = (msg: Message) => msg.status === "failed";

  return (
    <div className="flex h-full w-80 flex-col border-r bg-white">
      {/* Header */}
      <div className="space-y-3 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            {newMessageMode ? "New Message" : "Messages"}
          </h2>
          <Button
            size="icon"
            className={cn(
              "size-8 rounded-full",
              newMessageMode
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                : "bg-primary text-primary-foreground",
            )}
            onClick={() => {
              setNewMessageMode(!newMessageMode);
              setClientSearch("");
            }}
          >
            {newMessageMode ? (
              <X className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder={
              newMessageMode
                ? "Search clients..."
                : "Search clients, messages..."
            }
            value={newMessageMode ? clientSearch : search}
            onChange={(e) =>
              newMessageMode
                ? setClientSearch(e.target.value)
                : setSearch(e.target.value)
            }
            className="h-9 rounded-xl bg-slate-50 pl-9 text-sm"
            autoFocus={newMessageMode}
          />
        </div>

        {!newMessageMode && (
          <div className="flex gap-1 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-slate-100",
                )}
              >
                {f.label}
                {counts[f.key] > 0 && filter !== f.key && (
                  <span className="text-[9px] opacity-60">{counts[f.key]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Client search (new message mode) */}
      {newMessageMode && (
        <div className="flex-1 overflow-y-auto">
          {clientResults.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-xs">No clients found</p>
            </div>
          ) : (
            clientResults.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  const existing = threads.find(
                    (t) => t.clientId === client.id,
                  );
                  onSelectThread(
                    existing ? existing.threadId : `new-${client.id}`,
                  );
                  setNewMessageMode(false);
                  setClientSearch("");
                }}
                className="w-full border-b px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      getAvatarColor(client.name),
                    )}
                  >
                    {getInitials(client.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {client.email}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Thread list */}
      {!newMessageMode && (
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="text-muted-foreground/30 size-8" />
              <p className="text-muted-foreground mt-2 text-xs">
                No conversations
              </p>
            </div>
          ) : (
            filtered.map((thread) => {
              const isSelected = selectedThreadId === thread.threadId;
              const failed = isFailed(thread.lastMessage);

              return (
                <button
                  key={thread.threadId}
                  onClick={() => onSelectThread(thread.threadId)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-all",
                    isSelected
                      ? "border-primary border-l-2 bg-slate-50"
                      : "border-l-2 border-transparent hover:bg-slate-50/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {thread.clientImage ? (
                        <img
                          src={thread.clientImage}
                          alt={thread.clientName}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-full text-xs font-semibold",
                            getAvatarColor(thread.clientName),
                          )}
                        >
                          {getInitials(thread.clientName)}
                        </div>
                      )}
                      {/* Online dot */}
                      <div
                        className={cn(
                          "absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white",
                          thread.unreadCount > 0
                            ? "bg-emerald-500"
                            : "bg-slate-300",
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-sm",
                              thread.unreadCount > 0
                                ? "font-bold text-slate-900"
                                : "font-medium text-slate-700",
                            )}
                          >
                            {thread.clientName}
                          </span>
                          <ChannelBadge
                            channel={thread.lastMessage.type}
                            size="micro"
                          />
                        </div>
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {formatRelative(thread.lastMessage.timestamp)}
                        </span>
                      </div>

                      {/* Preview */}
                      {failed ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="size-3" />
                          Send failed
                        </p>
                      ) : (
                        <p
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            thread.unreadCount > 0
                              ? "font-medium text-slate-600"
                              : "text-muted-foreground",
                          )}
                        >
                          {thread.lastMessage.direction === "outbound" &&
                            "You: "}
                          {thread.lastMessage.body}
                        </p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {thread.unreadCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground mt-1 size-5 shrink-0 justify-center rounded-full p-0 text-[10px]">
                        {thread.unreadCount}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
