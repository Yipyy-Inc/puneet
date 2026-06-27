"use client";

import { useMemo, useState } from "react";
import { Calendar, Clock, Pencil, Send, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  cancelScheduled,
  useScheduledSupport,
} from "@/lib/scheduled-support-store";
import type { ScheduledSupportMessage } from "@/types/scheduled-support-message";
import { FacilityAvatar } from "../../_components/facility-avatar";
import { EditScheduledModal } from "./edit-scheduled-modal";
import {
  CHANNEL_FILTERS,
  CHANNEL_META,
  type ChannelFilter,
  formatClock,
  formatDay,
  isDue,
  timeUntil,
} from "./scheduled-utils";

export function ScheduledMessagesClient() {
  const messages = useScheduledSupport();
  // The store seeds itself from the live clock on the client only, so hold the
  // content back until hydration to keep it (and the relative times) stable.
  const mounted = useHydrated();
  // Captured once at mount via a lazy initializer (keeps render pure). Only read
  // inside the `mounted` branch, so it never lands in the SSR/hydration output.
  const [nowMs] = useState(() => Date.now());
  const [filter, setFilter] = useState<ChannelFilter>("all");
  const [editing, setEditing] = useState<ScheduledSupportMessage | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const counts = useMemo(
    () => ({
      all: messages.length,
      chat: messages.filter((m) => m.channel === "chat").length,
      email: messages.filter((m) => m.channel === "email").length,
    }),
    [messages],
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? messages
        : messages.filter((m) => m.channel === filter),
    [messages, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduledSupportMessage[]>();
    for (const msg of filtered) {
      const key = formatDay(msg.scheduledFor);
      const bucket = map.get(key);
      if (bucket) bucket.push(msg);
      else map.set(key, [msg]);
    }
    return [...map.entries()];
  }, [filtered]);

  function openEdit(msg: ScheduledSupportMessage) {
    setEditing(msg);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Scheduled Messages
        </h1>
        <p className="text-muted-foreground text-sm">
          Messages queued to send to facilities. Edit or cancel any time before
          they go out.
        </p>
      </header>

      {!mounted ? (
        <ScheduledSkeleton />
      ) : (
        <>
          {messages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {CHANNEL_FILTERS.map(({ key, label }) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        active
                          ? "bg-white/20 text-current"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {messages.length === 0 ? (
            <EmptyState
              title="No scheduled messages"
              hint="Schedule a message from any conversation to queue it for later."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={`No ${CHANNEL_META[filter as "chat" | "email"].label} messages scheduled`}
              hint="Switch the filter above to see other channels."
              dashedOnly
            />
          ) : (
            <div className="space-y-6">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                    <Calendar className="size-3.5" />
                    {day}
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((msg) => {
                      const meta = CHANNEL_META[msg.channel];
                      const Icon = meta.icon;
                      const due = isDue(msg.scheduledFor, nowMs);
                      return (
                        <div
                          key={msg.id}
                          className="group bg-card rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <FacilityAvatar
                              name={msg.facilityName}
                              id={msg.facilityId}
                              size="sm"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                  {msg.facilityName}
                                </span>
                                <span
                                  className={cn(
                                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    meta.badge,
                                  )}
                                >
                                  <Icon className="size-2.5" />
                                  {meta.label}
                                </span>
                                <span className="text-primary flex items-center gap-1 text-[11px] font-semibold">
                                  <Send className="size-3" />
                                  {formatClock(msg.scheduledFor)}
                                </span>
                                <span
                                  className={cn(
                                    "flex items-center gap-1 text-[10px] font-medium",
                                    due
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  <Clock className="size-2.5" />
                                  {timeUntil(msg.scheduledFor, nowMs)}
                                </span>
                              </div>

                              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                                {msg.body}
                              </p>

                              <div className="text-muted-foreground mt-2 flex items-center gap-1 text-[11px]">
                                <User className="size-3" />
                                Created by {msg.createdBy}
                              </div>
                            </div>

                            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit scheduled message"
                                className="size-8 rounded-full text-slate-400 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950"
                                onClick={() => openEdit(msg)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Cancel scheduled message"
                                className="size-8 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                onClick={() => {
                                  cancelScheduled(msg.id);
                                  toast.success("Scheduled message cancelled");
                                }}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <EditScheduledModal
        message={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

function EmptyState({
  title,
  hint,
  dashedOnly,
}: {
  title: string;
  hint: string;
  dashedOnly?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-dashed px-6 py-16 text-center">
      {!dashedOnly && (
        <div className="bg-muted mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
          <Clock className="text-muted-foreground size-6" />
        </div>
      )}
      <p className="text-foreground text-base font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{hint}</p>
    </div>
  );
}

function ScheduledSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-card flex items-start gap-3 rounded-2xl border p-4"
        >
          <div className="bg-muted size-8 animate-pulse rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-4 w-1/3 animate-pulse rounded-sm" />
            <div className="bg-muted h-3 w-2/3 animate-pulse rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
