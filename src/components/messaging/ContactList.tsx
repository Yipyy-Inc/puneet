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
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Message } from "@/types/communications";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { getCustomerLanguageLabel } from "@/lib/language-settings";

// SMS credits
const facility = facilities.find((f) => f.id === 11);
const credits = (facility as Record<string, unknown>)?.smsCredits as
  | {
      monthlyAllowance: number;
      used: number;
      purchased: number;
      autoReload: boolean;
      autoReloadThreshold: number;
      autoReloadAmount: number;
    }
  | undefined;
const smsTotal = credits
  ? credits.monthlyAllowance + (credits.purchased ?? 0)
  : 0;
const smsRemaining = credits ? smsTotal - credits.used : 0;

const SMS_PACKAGES = [
  { amount: 100, price: 5 },
  { amount: 500, price: 20 },
  { amount: 1000, price: 35 },
  { amount: 5000, price: 150 },
];

export interface Thread {
  threadId: string;
  clientId: number;
  clientName: string;
  clientImage?: string;
  lastMessage: Message;
  unreadCount: number;
  channels: string[];
  isPlaceholder?: boolean;
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
  mode = "facility",
  customerFacilityIds,
}: {
  messages: Message[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  mode?: "facility" | "customer";
  customerFacilityIds?: number[];
}) {
  const isCustomerMode = mode === "customer";
  const { role } = useFacilityRole();
  const canPurchase =
    !isCustomerMode && (role === "owner" || role === "manager");
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

      const customer = msg.clientId
        ? clients.find((c) => c.id === msg.clientId)
        : null;
      const facility = msg.clientId
        ? facilities.find((f) => f.id === msg.clientId)
        : null;
      const counterpartyName = isCustomerMode
        ? (facility?.name ?? msg.from)
        : (customer?.name ?? msg.from);
      const shouldCountUnread = isCustomerMode
        ? !msg.hasRead && msg.direction === "inbound"
        : !msg.hasRead;

      if (
        !existing ||
        new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)
      ) {
        const ch = new Set(existing?.channels ?? []);
        ch.add(msg.type);
        map.set(tid, {
          threadId: tid,
          clientId: msg.clientId ?? 0,
          clientName: counterpartyName,
          clientImage: isCustomerMode
            ? undefined
            : ((customer as Record<string, unknown>)?.imageUrl as
                | string
                | undefined),
          lastMessage: msg,
          unreadCount:
            (existing?.unreadCount ?? 0) + (shouldCountUnread ? 1 : 0),
          channels: [...ch],
          isPlaceholder: false,
        });
      } else {
        existing.channels = [...new Set([...existing.channels, msg.type])];
        if (shouldCountUnread) existing.unreadCount++;
      }
    }

    if (
      isCustomerMode &&
      customerFacilityIds &&
      customerFacilityIds.length > 0
    ) {
      const existingFacilityIds = new Set(
        [...map.values()].map((thread) => thread.clientId),
      );

      for (const facilityId of customerFacilityIds) {
        if (existingFacilityIds.has(facilityId)) continue;

        const facility = facilities.find((entry) => entry.id === facilityId);
        if (!facility) continue;

        map.set(`facility-${facilityId}`, {
          threadId: `facility-${facilityId}`,
          clientId: facilityId,
          clientName: facility.name,
          clientImage: undefined,
          unreadCount: 0,
          channels: [],
          isPlaceholder: true,
          lastMessage: {
            id: `placeholder-${facilityId}`,
            type: "in-app",
            direction: "inbound",
            from: facility.name,
            to: "You",
            body: "No messages yet",
            status: "delivered",
            timestamp: new Date(0).toISOString(),
            clientId: facilityId,
            threadId: `facility-${facilityId}`,
            hasRead: true,
          },
        });
      }
    }

    return [...map.values()].sort((a, b) => {
      const aTime = a.isPlaceholder
        ? 0
        : new Date(a.lastMessage.timestamp).getTime();
      const bTime = b.isPlaceholder
        ? 0
        : new Date(b.lastMessage.timestamp).getTime();

      if (bTime !== aTime) return bTime - aTime;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [customerFacilityIds, isCustomerMode, messages]);

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

  const customerCanSwitchFacilities = isCustomerMode && threads.length > 1;
  const showSearch = !isCustomerMode || compose || customerCanSwitchFacilities;
  const showFilters = !compose && !isCustomerMode;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        {!isCustomerMode && (
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
        )}
      </div>

      {/* SMS credits strip */}
      {credits && !compose && !isCustomerMode && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mx-4 mb-1 flex w-[calc(100%-2rem)] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100"
            >
              <Smartphone className="size-3.5 text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-500">
                    SMS Credits
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums",
                      smsRemaining > 500
                        ? "text-blue-600"
                        : smsRemaining > 100
                          ? "text-amber-600"
                          : "text-red-500",
                    )}
                  >
                    {smsRemaining.toLocaleString()} left
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      smsRemaining > 500
                        ? "bg-blue-500"
                        : smsRemaining > 100
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                    style={{
                      width: `${Math.min(100, (smsRemaining / smsTotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <ChevronRight className="size-3 text-slate-300" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 rounded-xl border-slate-200 p-0 shadow-lg"
          >
            {/* Balance */}
            <div className="px-4 pt-3.5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  SMS Balance
                </span>
                <span
                  className={cn(
                    "text-lg leading-none font-bold tabular-nums",
                    smsRemaining > 500
                      ? "text-blue-600"
                      : smsRemaining > 100
                        ? "text-amber-600"
                        : "text-red-500",
                  )}
                >
                  {smsRemaining.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    smsRemaining > 500
                      ? "bg-blue-500"
                      : smsRemaining > 100
                        ? "bg-amber-500"
                        : "bg-red-500",
                  )}
                  style={{
                    width: `${Math.min(100, (smsRemaining / smsTotal) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex gap-3 text-[10px] text-slate-400">
                <span>{credits.monthlyAllowance.toLocaleString()} plan</span>
                <span className="text-slate-300">·</span>
                <span>{credits.purchased.toLocaleString()} extra</span>
                <span className="text-slate-300">·</span>
                <span>{credits.used.toLocaleString()} used</span>
              </div>
              {credits.autoReload && (
                <div className="mt-2 flex items-center gap-1.5">
                  <RefreshCw className="size-2.5 text-blue-400" />
                  <span className="text-[10px] text-blue-500">
                    Auto-reload on
                  </span>
                </div>
              )}
            </div>

            {/* Packages — owner/manager only */}
            {canPurchase && (
              <div className="border-t border-slate-100 px-4 pt-2.5 pb-3">
                <p className="mb-2 text-[11px] font-semibold text-slate-500">
                  Buy More Credits
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SMS_PACKAGES.map((pkg) => {
                    const perSms = ((pkg.price / pkg.amount) * 100).toFixed(1);
                    return (
                      <button
                        key={pkg.amount}
                        type="button"
                        onClick={() =>
                          toast.success(
                            `${pkg.amount.toLocaleString()} credits purchased — $${pkg.price}`,
                          )
                        }
                        className="group flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-2 transition-all hover:border-blue-200 hover:bg-blue-50"
                      >
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                          {pkg.amount >= 1000
                            ? `${pkg.amount / 1000}K`
                            : pkg.amount}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          credits
                        </span>
                        <span className="mt-1 rounded-full bg-blue-50 px-2 py-px text-[10px] font-semibold text-blue-600 group-hover:bg-blue-100">
                          ${pkg.price}
                        </span>
                        <span className="mt-0.5 text-[9px] text-slate-400">
                          {perSms}¢/sms
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* Search */}
      {showSearch && (
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder={
                compose
                  ? "Search clients..."
                  : isCustomerMode
                    ? "Search facilities..."
                    : "Search messages..."
              }
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
      )}

      {/* Filters */}
      {showFilters && (
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
      {!isCustomerMode && compose && (
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
      {(!compose || isCustomerMode) && (
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <MessageSquare className="size-10 text-slate-200" />
              <p className="mt-3 text-sm text-slate-400">No conversations</p>
            </div>
          ) : (
            filtered.map((thread) => {
              const sel = selectedThreadId === thread.threadId;
              const failed =
                !thread.isPlaceholder && thread.lastMessage.status === "failed";
              const threadClient = !isCustomerMode
                ? clients.find((client) => client.id === thread.clientId)
                : null;
              const preferredLanguageLabel = threadClient?.preferredLanguage
                ? getCustomerLanguageLabel(threadClient.preferredLanguage)
                : null;

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
                      <div className="flex min-w-0 items-center gap-1.5">
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
                        {preferredLanguageLabel && (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] leading-none font-semibold text-indigo-700">
                            {preferredLanguageLabel}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[10px]",
                          thread.unreadCount > 0
                            ? "font-semibold text-slate-900"
                            : "text-slate-400",
                        )}
                      >
                        {thread.isPlaceholder
                          ? "new"
                          : relTime(thread.lastMessage.timestamp)}
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
                          {thread.isPlaceholder
                            ? "No messages yet"
                            : thread.lastMessage.body}
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
