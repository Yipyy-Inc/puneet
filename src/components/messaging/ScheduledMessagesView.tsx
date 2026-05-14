"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Calendar,
  Smartphone,
  Mail,
  MessageCircle,
  Pencil,
  X,
  Send,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useScheduledMessages } from "./scheduled-messages-context";

const CHANNEL_ICONS = {
  sms: Smartphone,
  email: Mail,
  "in-app": MessageCircle,
};

const CHANNEL_LABELS = {
  sms: "SMS",
  email: "Email",
  "in-app": "Portal",
};

const CHANNEL_TONE = {
  sms: "bg-blue-50 text-blue-700 border-blue-200",
  email: "bg-violet-50 text-violet-700 border-violet-200",
  "in-app": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "Sending now…";
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d}d`;
}

type ChannelFilter = "all" | "sms" | "email";

const FILTERS: { key: ChannelFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
];

export function ScheduledMessagesView() {
  const { scheduled, cancel } = useScheduledMessages();
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");

  const counts = useMemo(
    () => ({
      all: scheduled.length,
      sms: scheduled.filter((m) => m.channel === "sms").length,
      email: scheduled.filter((m) => m.channel === "email").length,
    }),
    [scheduled],
  );

  const filtered = useMemo(
    () =>
      channelFilter === "all"
        ? scheduled
        : scheduled.filter((m) => m.channel === channelFilter),
    [scheduled, channelFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof scheduled>();
    for (const msg of filtered) {
      const key = formatDate(msg.scheduledFor);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(msg);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Scheduled Messages</h2>
        <p className="mt-1 text-sm text-slate-500">
          Messages waiting to send. Edit or cancel any time before they go out.
        </p>
      </div>

      {scheduled.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          {FILTERS.map(({ key, label }) => {
            const active = channelFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChannelFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {scheduled.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50">
            <Clock className="size-6 text-blue-300" />
          </div>
          <p className="text-base font-semibold text-slate-700">
            No scheduled messages
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Use the clock icon next to Send in any conversation to schedule a
            message for later.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No {channelFilter.toUpperCase()} messages scheduled
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Switch the filter above to see other channels.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Calendar className="size-3.5" />
                {day}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {items.length}
                </span>
              </div>

              <div className="space-y-2">
                {items.map((msg) => {
                  const Icon = CHANNEL_ICONS[msg.channel];
                  return (
                    <div
                      key={msg.id}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Clock className="size-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">
                              {msg.clientName}
                            </span>
                            <span
                              className={cn(
                                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                CHANNEL_TONE[msg.channel],
                              )}
                            >
                              <Icon className="size-2.5" />
                              {CHANNEL_LABELS[msg.channel]}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                              <Send className="size-3" />
                              {formatTime(msg.scheduledFor)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {timeUntil(msg.scheduledFor)}
                            </span>
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                            {msg.body}
                          </p>

                          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="size-3" />
                              Created by {msg.createdBy}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                            onClick={() =>
                              toast("Editing scheduled messages coming soon")
                            }
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => {
                              cancel(msg.id);
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
    </div>
  );
}
