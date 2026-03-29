"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { facilities } from "@/data/facilities";
import type { CommunicationRecord } from "@/types/communications";

interface FacilityThread {
  facilityId: number;
  facilityName: string;
  facilityLogo?: string;
  lastMessage: CommunicationRecord;
  unreadCount: number;
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function FacilityThreadList({
  communications,
  selectedFacilityId,
  onSelectFacility,
}: {
  communications: CommunicationRecord[];
  selectedFacilityId: number | null;
  onSelectFacility: (id: number) => void;
}) {
  const [search, setSearch] = useState("");

  const threads = useMemo(() => {
    const map = new Map<number, FacilityThread>();
    for (const msg of communications) {
      const fid = msg.facilityId;
      const existing = map.get(fid);
      if (
        !existing ||
        new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)
      ) {
        const facility = facilities.find((f) => f.id === fid);
        map.set(fid, {
          facilityId: fid,
          facilityName: facility?.name ?? `Facility #${fid}`,
          facilityLogo: (facility as Record<string, unknown>)?.logo as
            | string
            | undefined,
          lastMessage: msg,
          unreadCount:
            (existing?.unreadCount ?? 0) +
            (msg.status !== "read" && msg.direction === "outbound"
              ? 0
              : msg.status !== "read"
                ? 1
                : 0),
        });
      }
    }
    return [...map.values()].sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime(),
    );
  }, [communications]);

  const filtered = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter((t) => t.facilityName.toLowerCase().includes(q));
  }, [threads, search]);

  return (
    <div className="flex h-full w-80 flex-col border-r">
      <div className="space-y-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Messages</h2>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="text-muted-foreground mx-auto mb-2 size-8 opacity-30" />
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Your facility will reach out when you have upcoming bookings.
            </p>
          </div>
        ) : (
          filtered.map((thread) => (
            <button
              key={thread.facilityId}
              onClick={() => onSelectFacility(thread.facilityId)}
              className={cn(
                "w-full border-b px-4 py-3 text-left transition-colors",
                selectedFacilityId === thread.facilityId
                  ? "bg-muted/60"
                  : "hover:bg-muted/30",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                  {getInitials(thread.facilityName)}
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
                      {thread.facilityName}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {formatRelative(thread.lastMessage.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {thread.lastMessage.content}
                  </p>
                </div>
                {thread.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground mt-1 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
