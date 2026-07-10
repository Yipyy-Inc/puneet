"use client";

import { useState } from "react";
import {
  CalendarCheck,
  ArrowLeftRight,
  AlertTriangle,
  Gauge,
  UserPlus,
  CreditCard,
  PackageMinus,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getLocationById } from "@/data/locations";
import { locationStyles } from "@/lib/hq/location-styles";
import {
  hqActivityFeed,
  hqActivityNow,
  type HqActivityType,
} from "@/data/hq-activity";

type FeedFilter = "all" | "bookings" | "financial" | "staff" | "alerts";

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bookings", label: "Bookings" },
  { key: "financial", label: "Financial" },
  { key: "staff", label: "Staff" },
  { key: "alerts", label: "Alerts" },
];

// Icon + accent per event type. Red/amber accents are reserved for the
// action-required alert types (per the professional palette rule).
const TYPE_META: Record<HqActivityType, { icon: LucideIcon; accent: string }> =
  {
    booking_confirmed: {
      icon: CalendarCheck,
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    booking_transferred: {
      icon: ArrowLeftRight,
      accent: "bg-[#007b6e]/10 text-[#007b6e] dark:text-[#4fb3a8]",
    },
    evaluation_completed: {
      icon: ClipboardCheck,
      accent: "bg-[#1b2a4a]/10 text-[#1b2a4a] dark:text-[#93a7d0]",
    },
    new_client: {
      icon: UserPlus,
      accent: "bg-[#1b2a4a]/10 text-[#1b2a4a] dark:text-[#93a7d0]",
    },
    payment_received: {
      icon: CreditCard,
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    at_capacity: {
      icon: Gauge,
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    low_inventory: {
      icon: PackageMinus,
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    staff_conflict: {
      icon: AlertTriangle,
      accent: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
  };

// Relative time from the mock "now" — deterministic, args-form Date (lint-safe).
const NOW_MS = new Date(hqActivityNow).getTime();
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((NOW_MS - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const [, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d ?? 1}`;
}

/**
 * Network Activity Feed — a chronological, cross-location event stream at the
 * bottom of the HQ Command Center. Filter chips scope the feed; "Alerts" shows
 * only action-required items.
 */
export function NetworkActivityFeed() {
  const [filter, setFilter] = useState<FeedFilter>("all");

  const events = hqActivityFeed.filter((e) => {
    if (filter === "all") return true;
    if (filter === "alerts") return e.actionRequired;
    return e.category === filter;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Network Activity</h2>
          <p className="text-muted-foreground text-xs">
            Live cross-location event stream
          </p>
        </div>
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              data-active={filter === f.key}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border">
        {events.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No activity in this category.
          </p>
        ) : (
          <ul className="divide-y">
            {events.map((event) => {
              const loc = getLocationById(event.locationId);
              const s = loc ? locationStyles(loc) : null;
              const meta = TYPE_META[event.type];
              const Icon = meta.icon;
              return (
                <li
                  key={event.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {/* Location badge pill */}
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      s?.badge ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {loc?.shortCode ?? "—"}
                  </span>

                  {/* Event-type icon */}
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      meta.accent,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  {/* Description */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{event.description}</p>
                    {event.actionRequired && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                        <AlertTriangle className="size-3" />
                        Action required
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {relativeTime(event.timestamp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
