"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Plus, Search } from "lucide-react";

import { CURRENT_AGENT, lastMessage } from "@/hooks/use-support-inbox";
import { ConnectionStatus } from "@/components/realtime/connection-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SupportConversation } from "@/types/support-chat";
import { SupportConversationRow } from "./support-conversation-row";

type Filter = "all" | "unread" | "mine" | "unassigned" | "priority";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
  { key: "priority", label: "Priority" },
];

function sortKey(c: SupportConversation): number {
  const m = lastMessage(c);
  return m ? new Date(m.at).getTime() : Number.MAX_SAFE_INTEGER;
}

export function InboxList({
  conversations,
  selectedId,
  onSelect,
  onNew,
}: {
  conversations: SupportConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (filter === "unread" && c.unreadCount === 0) return false;
        if (filter === "mine" && c.assignedAgentId !== CURRENT_AGENT?.id)
          return false;
        if (filter === "unassigned" && c.assignedAgentId !== null) return false;
        if (filter === "priority" && !c.priority) return false;
        if (
          q &&
          !`${c.facilityName} ${c.contactEmail}`.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => sortKey(b) - sortKey(a));
  }, [conversations, filter, query]);

  return (
    <div className="bg-card flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border">
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Support Inbox</h2>
          <ConnectionStatus
            name={CURRENT_AGENT?.name ?? "Agent"}
            role="agent"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onNew}>
            <Plus className="mr-1.5 size-4" />
            New Conversation
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/support/chat/scheduled">
              <Clock className="mr-1.5 size-4" />
              Scheduled
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 border-b px-3 py-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="border-b p-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by facility name, email…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No conversations match.
          </p>
        ) : (
          items.map((c) => (
            <SupportConversationRow
              key={c.id}
              conversation={c}
              selected={selectedId === c.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
