"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Mail } from "lucide-react";

import { platformDashboardQueries } from "@/lib/api/platform-dashboard";
import {
  selfServiceEventToFeedEvent,
  useSelfServiceEvents,
  type AdminEmailAlert,
} from "@/lib/billing-self-service-store";
import type {
  PlatformEvent,
  PlatformEventCategory,
  PlatformEventTone,
} from "@/types/platform-dashboard";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FilterKey = "all" | PlatformEventCategory;

/** Feed row — query events plus live self-service events that carry an alert. */
type FeedItem = PlatformEvent & { emailAlert?: AdminEmailAlert };

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "facility", label: "Facility" },
  { key: "billing", label: "Billing" },
  { key: "support", label: "Support" },
  { key: "system", label: "System" },
];

const DOT_CLASS: Record<PlatformEventTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
  slate: "bg-slate-400",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const { data, isLoading } = useQuery(platformDashboardQueries.activity());

  // Live facility self-service billing actions (upgrade / cancel / card update)
  // are merged on top of the derived feed and carry their admin email alert.
  const liveEvents = useSelfServiceEvents();
  const events: FeedItem[] = [
    ...liveEvents.map(selfServiceEventToFeedEvent),
    ...(data ?? []),
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const visible =
    filter === "all" ? events : events.filter((e) => e.category === filter);

  return (
    <Card className="bg-card flex h-full flex-col overflow-hidden border">
      <div className="from-card relative flex items-center gap-3 border-b bg-linear-to-br to-sky-50/40 px-5 py-4 dark:to-sky-950/20">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-sky-500 to-cyan-500 text-white shadow-sm">
          <Activity className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Activity Feed
          </h2>
          <p className="text-muted-foreground text-xs">
            Significant platform events · last 24 hours
          </p>
        </div>
        <Link
          href="/dashboard/user-management/activity"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
        >
          View Full Log
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b px-4 py-2.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            data-active={filter === f.key ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              "data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:border-transparent",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-1.5 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted h-10 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No events in this category.
          </p>
        ) : (
          <ul className="divide-y">
            {visible.map((e) => (
              <li
                key={e.id}
                className="hover:bg-muted/40 flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    DOT_CLASS[e.tone],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm/snug">{e.description}</p>
                  {e.facilityName && (
                    <Link
                      href={
                        e.facilityId
                          ? `/dashboard/facilities/${e.facilityId}`
                          : "/dashboard/facilities"
                      }
                      className="text-muted-foreground hover:text-foreground text-xs hover:underline"
                    >
                      {e.facilityName}
                    </Link>
                  )}
                  {e.emailAlert && (
                    <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                      <Mail className="size-3" />
                      Email alert sent to {e.emailAlert.to}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {relativeTime(e.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
