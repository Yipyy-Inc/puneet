"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelBadge } from "./ChannelBadge";
import type { Message } from "@/types/communications";
import { clients } from "@/data/clients";

interface Thread {
  threadId: string;
  clientId: number;
  clientName: string;
  lastMessage: Message;
  unreadCount: number;
  channels: ("email" | "sms" | "in-app")[];
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "1d";
  return `${days}d`;
}

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
  const [filter, setFilter] = useState<"all" | "unread">("all");

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

  return (
    <div className="flex h-full w-72 flex-col border-r">
      {/* Header */}
      <div className="space-y-3 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Messages</h2>
          <Button variant="ghost" size="icon" className="size-7">
            <Plus className="size-3.5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                filter === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="text-muted-foreground mx-auto mb-2 size-8 opacity-50" />
            <p className="text-muted-foreground text-xs">No conversations</p>
          </div>
        ) : (
          filtered.map((thread) => (
            <button
              key={thread.threadId}
              onClick={() => onSelectThread(thread.threadId)}
              className={cn(
                "w-full border-b px-4 py-3 text-left transition-colors",
                selectedThreadId === thread.threadId
                  ? "bg-muted/60"
                  : "hover:bg-muted/30",
              )}
            >
              <div className="flex items-start gap-2.5">
                {/* Unread dot */}
                <div className="mt-1.5 w-2 shrink-0">
                  {thread.unreadCount > 0 && (
                    <span className="block size-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        thread.unreadCount > 0
                          ? "font-semibold"
                          : "font-medium",
                      )}
                    >
                      {thread.clientName}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {formatRelative(thread.lastMessage.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {thread.lastMessage.direction === "outbound" && "You: "}
                    {thread.lastMessage.body}
                  </p>
                  <div className="mt-1 flex gap-1">
                    {thread.channels.map((ch) => (
                      <ChannelBadge key={ch} channel={ch} size="xs" />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
