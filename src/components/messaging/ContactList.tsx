"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Message } from "@/types/communications";
import type { ThreadMeta } from "@/types/messaging";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { threadMeta as defaultThreadMeta } from "@/data/messaging";
import { threadLocationMap } from "@/data/saved-replies";
import { getCustomerLanguageLabel } from "@/lib/language-settings";
import { useLocationContext } from "@/hooks/use-location-context";
import { ConversationRow } from "./ConversationRow";
import { useConversationState } from "./conversation-state-context";

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

const CURRENT_USER_STAFF_ID = "staff-1";

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
  const { locations } = useLocationContext();
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
    if (!isCustomerMode && locationFilter && locationFilter.length > 0) {
      const locSet = new Set(locationFilter);
      list = list.filter((t) => {
        const loc = threadLocationMap[t.threadId];
        return loc ? locSet.has(loc) : true;
      });
    }

    // Closed threads hidden unless explicitly viewing them
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
            title={compose ? "Cancel" : "New message"}
          >
            {compose ? <X className="size-4" /> : <Plus className="size-4" />}
          </Button>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder={
                compose
                  ? "Search clients or enter phone / email…"
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

      {/* Compose — client search with unknown-number support */}
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
                    Send to "{clientSearch.trim()}" — we'll create a profile.
                  </p>
                </div>
              </button>
              <p className="mt-2 text-[10px] text-slate-400">
                Works for unknown numbers, walk-ins, and inbound inquiries.
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
