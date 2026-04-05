"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  MessageSquare,
  X,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/communications";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";

// SMS credits
const facility = facilities.find((f) => f.id === 11);
const credits = (facility as Record<string, unknown>)?.smsCredits as
  | { monthlyAllowance: number; used: number; purchased: number }
  | undefined;
const smsRemaining = credits
  ? credits.monthlyAllowance + (credits.purchased ?? 0) - credits.used
  : 0;

export interface Thread {
  threadId: string;
  clientId: number;
  clientName: string;
  clientImage?: string;
  lastMessage: Message;
  unreadCount: number;
  channels: string[];
}

const COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-pink-500",
  "bg-teal-500",
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

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type Filter = "all" | "unread" | "sms" | "email" | "chat";

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
  const [filter, setFilter] = useState<Filter>("all");
  const [compose, setCompose] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const clientResults = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 10);
    const q = clientSearch.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [clientSearch]);

  const threads = useMemo(() => {
    const map = new Map<string, Thread>();
    for (const msg of messages) {
      const tid = msg.threadId ?? msg.id;
      const existing = map.get(tid);
      if (
        !existing ||
        new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)
      ) {
        const client = msg.clientId
          ? clients.find((c) => c.id === msg.clientId)
          : null;
        const ch = new Set(existing?.channels ?? []);
        ch.add(msg.type);
        map.set(tid, {
          threadId: tid,
          clientId: msg.clientId ?? 0,
          clientName: client?.name ?? msg.from,
          clientImage: (client as Record<string, unknown>)?.imageUrl as
            | string
            | undefined,
          lastMessage: msg,
          unreadCount: (existing?.unreadCount ?? 0) + (!msg.hasRead ? 1 : 0),
          channels: [...ch],
        });
      } else {
        existing.channels = [...new Set([...existing.channels, msg.type])];
        if (!msg.hasRead) existing.unreadCount++;
      }
    }
    return [...map.values()].sort(
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

  return (
    <div className="flex h-full w-80 shrink-0 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        <Button
          size="icon"
          variant={compose ? "secondary" : "default"}
          className="size-9 rounded-full"
          onClick={() => {
            setCompose(!compose);
            setClientSearch("");
          }}
        >
          {compose ? <X className="size-4" /> : <Plus className="size-4" />}
        </Button>
      </div>

      {/* SMS credits strip */}
      {credits && !compose && (
        <div className="mx-4 mb-1 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
          <Smartphone className="size-3 text-slate-400" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-500">
                SMS Credits
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold tabular-nums",
                  smsRemaining > 500
                    ? "text-emerald-600"
                    : smsRemaining > 100
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              >
                {smsRemaining.toLocaleString()} left
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  smsRemaining > 500
                    ? "bg-emerald-500"
                    : smsRemaining > 100
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
                style={{
                  width: `${Math.min(100, (smsRemaining / (credits.monthlyAllowance + (credits.purchased ?? 0))) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder={compose ? "Search clients..." : "Search messages..."}
            value={compose ? clientSearch : search}
            onChange={(e) =>
              compose
                ? setClientSearch(e.target.value)
                : setSearch(e.target.value)
            }
            className="h-9 rounded-full border-slate-200 bg-slate-50 pl-9 text-sm"
            autoFocus={compose}
          />
        </div>
      </div>

      {/* Filters */}
      {!compose && (
        <div className="flex gap-1 px-4 pb-2">
          {(
            [
              { key: "all" as Filter, label: "All" },
              { key: "chat" as Filter, label: "Chat" },
              { key: "email" as Filter, label: "Email" },
              { key: "sms" as Filter, label: "SMS" },
              { key: "unread" as Filter, label: "Unread" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold transition-all",
                filter === f.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Compose — client search */}
      {compose && (
        <div className="flex-1 overflow-y-auto">
          {clientResults.map((client) => (
            <button
              key={client.id}
              onClick={() => {
                const existing = threads.find((t) => t.clientId === client.id);
                onSelectThread(
                  existing ? existing.threadId : `new-${client.id}`,
                );
                setCompose(false);
              }}
              className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                  avatarColor(client.name),
                )}
              >
                {initials(client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {client.name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {client.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Thread list */}
      {!compose && (
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <MessageSquare className="size-10 text-slate-200" />
              <p className="mt-3 text-sm text-slate-400">No conversations</p>
            </div>
          ) : (
            filtered.map((thread) => {
              const sel = selectedThreadId === thread.threadId;
              const failed = thread.lastMessage.status === "failed";
              return (
                <button
                  key={thread.threadId}
                  onClick={() => onSelectThread(thread.threadId)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-3 text-left transition-all",
                    sel ? "bg-slate-100" : "hover:bg-slate-50",
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {thread.clientImage ? (
                      <img
                        src={thread.clientImage}
                        alt=""
                        className="size-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex size-12 items-center justify-center rounded-full text-sm font-bold text-white",
                          avatarColor(thread.clientName),
                        )}
                      >
                        {initials(thread.clientName)}
                      </div>
                    )}
                    {thread.unreadCount > 0 && (
                      <div className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
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
                      <span
                        className={cn(
                          "shrink-0 text-[10px]",
                          thread.unreadCount > 0
                            ? "font-semibold text-slate-900"
                            : "text-slate-400",
                        )}
                      >
                        {relTime(thread.lastMessage.timestamp)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      {failed ? (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="size-3" />
                          Failed
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "truncate text-xs",
                            thread.unreadCount > 0
                              ? "text-slate-600"
                              : "text-slate-400",
                          )}
                        >
                          {thread.lastMessage.direction === "outbound" &&
                            "You: "}
                          {thread.lastMessage.body}
                        </span>
                      )}
                      {thread.unreadCount > 0 && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
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
