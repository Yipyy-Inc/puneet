"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  MessageSquare,
  X,
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
import type { ThreadMeta } from "@/types/messaging";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { threadMeta as defaultThreadMeta } from "@/data/messaging";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { getCustomerLanguageLabel } from "@/lib/language-settings";
import { ConversationRow } from "./ConversationRow";
import { useConversationState } from "./conversation-state-context";
import { threadLocationMap } from "@/data/saved-replies";
import { useLocationContext } from "@/hooks/use-location-context";

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
const smsTotal = credits ? credits.monthlyAllowance + (credits.purchased ?? 0) : 0;
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
  meta?: ThreadMeta;
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

type Filter =
  | "all"
  | "unread"
  | "sms"
  | "email"
  | "chat"
  | "starred"
  | "high_priority"
  | "follow_up"
  | "assigned_me"
  | "closed";

const FILTER_ITEMS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "assigned_me", label: "Mine" },
  { key: "starred", label: "Starred" },
  { key: "high_priority", label: "Priority" },
  { key: "follow_up", label: "Follow-up" },
  { key: "closed", label: "Closed" },
  { key: "chat", label: "Chat" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
];

const CURRENT_USER_STAFF_ID = "staff-1"; // mock: "Sarah M." is logged in

export function ContactList({
  messages,
  selectedThreadId,
  onSelectThread,
  mode = "facility",
  customerFacilityIds,
  locationFilter,
}: {
  messages: Message[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  mode?: "facility" | "customer";
  customerFacilityIds?: number[];
  locationFilter?: string[];
}) {
  const isCustomerMode = mode === "customer";
  const { role } = useFacilityRole();
  const { locations } = useLocationContext();
  const canPurchase = !isCustomerMode && (role === "owner" || role === "manager");
  const conversationState = useConversationState();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [compose, setCompose] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [starredIds, setStarredIds] = useState<Set<string>>(
    () => new Set(defaultThreadMeta.filter((m) => m.starred).map((m) => m.threadId)),
  );
  const [priorityIds, setPriorityIds] = useState<Set<string>>(
    () =>
      new Set(
        defaultThreadMeta
          .filter((m) => m.tags.includes("high_priority"))
          .map((m) => m.threadId),
      ),
  );
  const [followUpIds, setFollowUpIds] = useState<Set<string>>(
    () =>
      new Set(
        defaultThreadMeta
          .filter(
            (m) => m.status === "follow_up" || m.tags.includes("needs_follow_up"),
          )
          .map((m) => m.threadId),
      ),
  );

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

      const customer = msg.clientId ? clients.find((c) => c.id === msg.clientId) : null;
      const facilityItem = msg.clientId ? facilities.find((f) => f.id === msg.clientId) : null;
      const counterpartyName = isCustomerMode
        ? (facilityItem?.name ?? msg.from)
        : (customer?.name ?? msg.from);
      const shouldCountUnread = isCustomerMode
        ? !msg.hasRead && msg.direction === "inbound"
        : !msg.hasRead;

      const meta = defaultThreadMeta.find((m) => m.threadId === tid);

      if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)) {
        const ch = new Set(existing?.channels ?? []);
        ch.add(msg.type);
        map.set(tid, {
          threadId: tid,
          clientId: msg.clientId ?? 0,
          clientName: counterpartyName,
          clientImage: isCustomerMode
            ? undefined
            : ((customer as Record<string, unknown>)?.imageUrl as string | undefined),
          lastMessage: msg,
          unreadCount: (existing?.unreadCount ?? 0) + (shouldCountUnread ? 1 : 0),
          channels: [...ch],
          isPlaceholder: false,
          meta,
        });
      } else {
        existing.channels = [...new Set([...existing.channels, msg.type])];
        if (shouldCountUnread) existing.unreadCount++;
      }
    }

    if (isCustomerMode && customerFacilityIds && customerFacilityIds.length > 0) {
      const existingFacilityIds = new Set([...map.values()].map((thread) => thread.clientId));

      for (const facilityId of customerFacilityIds) {
        if (existingFacilityIds.has(facilityId)) continue;

        const facilityItem = facilities.find((entry) => entry.id === facilityId);
        if (!facilityItem) continue;

        map.set(`facility-${facilityId}`, {
          threadId: `facility-${facilityId}`,
          clientId: facilityId,
          clientName: facilityItem.name,
          clientImage: undefined,
          unreadCount: 0,
          channels: [],
          isPlaceholder: true,
          lastMessage: {
            id: `placeholder-${facilityId}`,
            type: "in-app",
            direction: "inbound",
            from: facilityItem.name,
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
      if (!isCustomerMode) {
        const aPriority = priorityIds.has(a.threadId) ? 1 : 0;
        const bPriority = priorityIds.has(b.threadId) ? 1 : 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
      }
      const aTime = a.isPlaceholder ? 0 : new Date(a.lastMessage.timestamp).getTime();
      const bTime = b.isPlaceholder ? 0 : new Date(b.lastMessage.timestamp).getTime();
      if (bTime !== aTime) return bTime - aTime;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [customerFacilityIds, isCustomerMode, messages, priorityIds]);

  const filtered = useMemo(() => {
    let list = threads;

    // Location filter (multi-location only)
    if (
      !isCustomerMode &&
      locationFilter &&
      locationFilter.length > 0
    ) {
      const locSet = new Set(locationFilter);
      list = list.filter((t) => {
        const loc = threadLocationMap[t.threadId];
        return loc ? locSet.has(loc) : true;
      });
    }

    // Default: closed threads hidden unless explicitly viewing them
    if (!isCustomerMode && filter !== "closed") {
      list = list.filter((t) => !conversationState.closed.has(t.threadId));
    }

    if (filter === "closed")
      list = list.filter((t) => conversationState.closed.has(t.threadId));
    if (filter === "unread") list = list.filter((t) => t.unreadCount > 0);
    if (filter === "sms") list = list.filter((t) => t.channels.includes("sms"));
    if (filter === "email") list = list.filter((t) => t.channels.includes("email"));
    if (filter === "chat") list = list.filter((t) => t.channels.includes("in-app"));
    if (filter === "starred") list = list.filter((t) => starredIds.has(t.threadId));
    if (filter === "high_priority")
      list = list.filter((t) => priorityIds.has(t.threadId));
    if (filter === "follow_up")
      list = list.filter((t) => followUpIds.has(t.threadId));
    if (filter === "assigned_me")
      list = list.filter(
        (t) => conversationState.assignments[t.threadId] === CURRENT_USER_STAFF_ID,
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.clientName.toLowerCase().includes(q) ||
          t.lastMessage.body.toLowerCase().includes(q),
      );
    }
    return list;
  }, [
    threads,
    filter,
    search,
    starredIds,
    priorityIds,
    followUpIds,
    isCustomerMode,
    locationFilter,
    conversationState.closed,
    conversationState.assignments,
  ]);

  const customerCanSwitchFacilities = isCustomerMode && threads.length > 1;
  const showSearch = !isCustomerMode || compose || customerCanSwitchFacilities;
  const showFilters = !compose && !isCustomerMode;

  const toggleStar = (threadId: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const togglePriority = (threadId: string) => {
    setPriorityIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
        toast("Priority removed");
      } else {
        next.add(threadId);
        toast.success("Marked as Priority");
      }
      return next;
    });
  };

  const toggleFollowUp = (threadId: string) => {
    setFollowUpIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
        toast("Follow-up cleared");
      } else {
        next.add(threadId);
        toast.success("Marked for Follow-up");
      }
      return next;
    });
  };

  const toggleClosed = (threadId: string) => {
    const isCurrentlyClosed = conversationState.isClosed(threadId);
    conversationState.setClosed(threadId, !isCurrentlyClosed);
    toast.success(
      isCurrentlyClosed
        ? "Conversation reopened"
        : "Conversation closed — moved to Closed tab",
    );
  };

  const handleAssign = (threadId: string, staffId: string | null) => {
    conversationState.assignTo(threadId, staffId);
    if (staffId) {
      const staff = conversationState.staff.find((s) => s.id === staffId);
      toast.success(
        `Assigned to ${staff?.name ?? "staff"} — they'll be notified`,
      );
    } else {
      toast("Conversation unassigned");
    }
  };

  const locationLabelFor = (threadId: string): string | undefined => {
    if (isCustomerMode || locations.length <= 1) return undefined;
    const locId = threadLocationMap[threadId];
    if (!locId) return undefined;
    const loc = locations.find((l) => l.id === locId);
    return loc?.shortCode ?? loc?.name;
  };

  return (
    <div className="flex h-full w-80 shrink-0 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-slate-900">Inbox</h1>
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
                  <span className="text-[10px] font-medium text-slate-500">SMS Credits</span>
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
                      smsRemaining > 500 ? "bg-blue-500" : smsRemaining > 100 ? "bg-amber-500" : "bg-red-500",
                    )}
                    style={{ width: `${Math.min(100, (smsRemaining / smsTotal) * 100)}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="size-3 text-slate-300" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 rounded-xl border-slate-200 p-0 shadow-lg">
            <div className="px-4 pt-3.5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">SMS Balance</span>
                <span
                  className={cn(
                    "text-lg leading-none font-bold tabular-nums",
                    smsRemaining > 500 ? "text-blue-600" : smsRemaining > 100 ? "text-amber-600" : "text-red-500",
                  )}
                >
                  {smsRemaining.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    smsRemaining > 500 ? "bg-blue-500" : smsRemaining > 100 ? "bg-amber-500" : "bg-red-500",
                  )}
                  style={{ width: `${Math.min(100, (smsRemaining / smsTotal) * 100)}%` }}
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
                  <span className="text-[10px] text-blue-500">Auto-reload on</span>
                </div>
              )}
            </div>

            {canPurchase && (
              <div className="border-t border-slate-100 px-4 pt-2.5 pb-3">
                <p className="mb-2 text-[11px] font-semibold text-slate-500">Buy More Credits</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SMS_PACKAGES.map((pkg) => {
                    const perSms = ((pkg.price / pkg.amount) * 100).toFixed(1);
                    return (
                      <button
                        key={pkg.amount}
                        type="button"
                        onClick={() =>
                          toast.success(`${pkg.amount.toLocaleString()} credits purchased — $${pkg.price}`)
                        }
                        className="group flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-2 transition-all hover:border-blue-200 hover:bg-blue-50"
                      >
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                          {pkg.amount >= 1000 ? `${pkg.amount / 1000}K` : pkg.amount}
                        </span>
                        <span className="text-[9px] text-slate-400">credits</span>
                        <span className="mt-1 rounded-full bg-blue-50 px-2 py-px text-[10px] font-semibold text-blue-600 group-hover:bg-blue-100">
                          ${pkg.price}
                        </span>
                        <span className="mt-0.5 text-[9px] text-slate-400">{perSms}¢/sms</span>
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
                    : "Search by name, phone, email..."
              }
              value={compose ? clientSearch : search}
              onChange={(e) => (compose ? setClientSearch(e.target.value) : setSearch(e.target.value))}
              className="h-9 rounded-full border-slate-200 bg-slate-50 pl-9 text-sm"
              autoFocus={compose}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none">
          {FILTER_ITEMS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all",
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
          {clientResults.length === 0 && clientSearch.trim() ? (
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                No matching client
              </p>
              <button
                type="button"
                onClick={() => {
                  const newThreadId = `new-unknown-${Date.now()}`;
                  toast.success(
                    `New contact draft created for "${clientSearch.trim()}". Send a message to confirm.`,
                  );
                  onSelectThread(newThreadId);
                  setCompose(false);
                  setClientSearch("");
                }}
                className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-3 py-3 text-left transition-colors hover:bg-blue-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                  <Plus className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-blue-700">
                    Start new contact
                  </p>
                  <p className="truncate text-xs text-blue-500/80">
                    Send to “{clientSearch.trim()}” — we'll create a profile.
                  </p>
                </div>
              </button>
              <p className="mt-2 text-[10px] text-slate-400">
                Works for unknown numbers, walk-ins, and inbound inquiries from
                channels we haven't matched yet.
              </p>
            </div>
          ) : (
            clientResults.map((client) => (
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
                  <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                  <p className="truncate text-xs text-slate-400">{client.email}</p>
                </div>
              </button>
            ))
          )}
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
              const threadClient = !isCustomerMode
                ? clients.find((c) => c.id === thread.clientId)
                : null;
              const preferredLanguageLabel = threadClient?.preferredLanguage
                ? getCustomerLanguageLabel(threadClient.preferredLanguage)
                : null;

              return (
                <ConversationRow
                  key={thread.threadId}
                  thread={thread}
                  selected={selectedThreadId === thread.threadId}
                  isStarred={starredIds.has(thread.threadId)}
                  isPriority={priorityIds.has(thread.threadId)}
                  isFollowUp={followUpIds.has(thread.threadId)}
                  isClosed={conversationState.closed.has(thread.threadId)}
                  assignee={conversationState.getAssignee(thread.threadId)}
                  staffOptions={conversationState.staff}
                  locationLabel={locationLabelFor(thread.threadId)}
                  preferredLanguageLabel={preferredLanguageLabel}
                  onSelect={onSelectThread}
                  onToggleStar={toggleStar}
                  onTogglePriority={togglePriority}
                  onToggleFollowUp={toggleFollowUp}
                  onToggleClosed={toggleClosed}
                  onAssign={handleAssign}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
