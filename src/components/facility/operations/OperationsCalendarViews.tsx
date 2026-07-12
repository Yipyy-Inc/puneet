"use client";

import { useState } from "react";
import type { CSSProperties, RefObject } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Cake,
  Check,
  Clock,
  FileText,
  Hash,
  Heart,
  Hourglass,
  MapPin,
  PanelRight,
  PawPrint,
  Pencil,
  Repeat,
  Sparkles,
  TriangleAlert,
  Truck,
  User,
  Users,
} from "lucide-react";
import {
  useWaitlistEntries,
  waitlistForDay,
  type WaitlistDisplayEntry,
} from "@/lib/calendar-waitlist";
import {
  endCalendarDrag,
  getDraggingEvent,
  setDropHoverKey,
  startCalendarDrag,
  useCalendarDrag,
} from "@/lib/calendar-drag";
import { defaultServiceAddOns } from "@/data/service-addons";
import { bookingRules } from "@/data/settings";
import {
  type CalendarColorOverrides,
  type CalendarExternalProvider,
  type CalendarVisualConfig,
  type FilterOption,
  type OperationsCalendarEvent,
  addMinutes,
  formatDateKey,
  formatPetLabel,
  formatTimeLabel,
  getEventsForDay,
  getTimelineSlotHeight,
  getZoomEventLimit,
  hexToRgba,
  isCurrentMonthDay,
  isGroupFull,
  isSameDay,
  resolveEventColor,
} from "@/lib/operations-calendar";

export interface EventRenderSettings {
  visualConfig: CalendarVisualConfig;
  serviceColorMap: Record<string, string>;
  colorOverrides?: CalendarColorOverrides;
}

function eventDurationLabel(event: OperationsCalendarEvent): string {
  if (event.allDay) return "All day";
  return `${formatTimeLabel(event.start)} – ${formatTimeLabel(event.end)}`;
}

function eventHoverSummary(
  event: OperationsCalendarEvent,
  petLabel: string,
  customerLabel: string,
): string {
  return [
    `Dog: ${petLabel}`,
    `Service: ${event.service}`,
    `Customer: ${customerLabel}`,
    `Time: ${eventDurationLabel(event)}`,
    event.staff ? `Staff: ${event.staff}` : "",
    event.location ? `Location: ${event.location}` : "",
    event.details ? `Details: ${event.details}` : "",
    event.notes ? `Notes: ${event.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getStatusBadgeStyle(status: string, type: string) {
  if (type === "task" || type === "add-on") {
    if (status === "Completed")
      return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    if (status === "Overdue")
      return "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
    return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100";
  }
  if (status === "Cancelled")
    return "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
  if (status === "Confirmed")
    return "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100";
  if (status === "Checked In" || status === "checked-in")
    return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100";
  if (status === "Checked Out" || status === "checked-out")
    return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100";
  return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100";
}

// ── Add-on pill (spec Tables 37–38) ──────────────────────────────────────────
// Colour-code the "+N" badge by the add-ons' category: green = grooming,
// blue = daycare perks, orange = custom-module add-ons (not in service-addons).
type AddOnBucket = "grooming" | "daycare" | "custom";

const ADD_ON_CATEGORY_BY_NAME = new Map(
  defaultServiceAddOns.map((addOn) => [
    addOn.name.toLowerCase(),
    addOn.category,
  ]),
);

const ADD_ON_PILL_CLASS: Record<AddOnBucket, string> = {
  grooming: "bg-emerald-500",
  daycare: "bg-sky-500",
  custom: "bg-orange-500",
};

function addOnBucket(name: string): AddOnBucket {
  const category = ADD_ON_CATEGORY_BY_NAME.get(name.toLowerCase());
  // Not a standard service add-on → treat as a custom-module add-on.
  if (!category) return "custom";
  if (category === "Grooming & Hygiene" || category === "Spa & Wellness") {
    return "grooming";
  }
  return "daycare";
}

// Dominant bucket across a booking's add-ons (ties favour grooming → daycare).
function dominantAddOnBucket(names: string[]): AddOnBucket {
  const counts: Record<AddOnBucket, number> = {
    grooming: 0,
    daycare: 0,
    custom: 0,
  };
  for (const name of names) counts[addOnBucket(name)] += 1;
  const priority: AddOnBucket[] = ["grooming", "daycare", "custom"];
  return priority.reduce(
    (best, bucket) => (counts[bucket] > counts[best] ? bucket : best),
    priority[0],
  );
}

// External-calendar source glyphs (spec Table 66) — a small brand-tinted
// letter badge stands in for each provider's logo.
const EXTERNAL_SOURCE_GLYPH: Record<
  CalendarExternalProvider,
  { glyph: string; color: string }
> = {
  google: { glyph: "G", color: "#4285F4" },
  outlook: { glyph: "O", color: "#0078D4" },
  ical: { glyph: "iC", color: "#64748b" },
  calendly: { glyph: "C", color: "#006BFF" },
  acuity: { glyph: "A", color: "#1a1a1a" },
  facebook: { glyph: "f", color: "#1877F2" },
};

// ── Capacity heatmap (spec 8.3 / Task 43, Table 88) ─────────────────────────
// When "Capacity View" is on, cells get a heat tint from how full they are.
// used = animals booked in the cell (group events count their attendees);
// total = the module's per-hour ceiling (capacityCeilingPerHour) when present,
// else the facility default. Tasks / non-capacity events are excluded.
const HEATMAP_HOURLY_CAPACITY = 10;
const HEATMAP_DAILY_CAPACITY = bookingRules.dailyCapacityLimit ?? 50;

function capacityEvents(
  events: OperationsCalendarEvent[],
): OperationsCalendarEvent[] {
  return events.filter((event) => event.affectsCapacityHeatmap !== false);
}

function capacityUsed(events: OperationsCalendarEvent[]): number {
  return capacityEvents(events).reduce(
    (sum, event) => sum + (event.capacity?.used ?? 1),
    0,
  );
}

// Per-cell ceiling: the tightest module ceiling present — a per-hour cap
// (capacityCeilingPerHour) or a group session's own max (capacity.total) —
// else the given facility default.
function capacityTotal(
  events: OperationsCalendarEvent[],
  fallback: number,
): number {
  const ceilings = capacityEvents(events)
    .map((event) => event.capacityCeilingPerHour ?? event.capacity?.total)
    .filter(
      (ceiling): ceiling is number =>
        typeof ceiling === "number" && ceiling > 0,
    );
  return ceilings.length > 0 ? Math.max(...ceilings) : fallback;
}

// Green = available, amber = >70% full, red = at (or over) capacity.
function capacityHeatClass(used: number, total: number): string {
  const ratio = total > 0 ? used / total : 0;
  if (ratio >= 1) return "bg-red-500/15";
  if (ratio > 0.7) return "bg-amber-400/20";
  return "bg-emerald-400/12";
}

function capacityHeatTitle(used: number, total: number): string {
  return `${used} of ${total} slots filled`;
}

// ── Waitlist section (spec 8.4 / Task 44, Table 89) ─────────────────────────
// Rendered below a day column when at-capacity slots have waiters. Each row is
// client, pet, service, and "#N in waitlist".
function WaitlistSection({ entries }: { entries: WaitlistDisplayEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 rounded-xl border border-amber-200/70 bg-amber-50/60 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-amber-700 uppercase">
        <Hourglass className="size-3" />
        Waitlist
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-200/70 px-1 text-[10px] text-amber-800">
          {entries.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-lg border border-amber-100/80 bg-white/70 px-2 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-semibold text-slate-700">
                {entry.petName} · {entry.clientName}
              </span>
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 tabular-nums">
                #{entry.position} in waitlist
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="truncate">{entry.service}</span>
              {entry.notified && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-600">
                  Notified
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EventChip({
  event,
  renderSettings,
  onEventClick,
  onMarkEventComplete,
}: {
  event: OperationsCalendarEvent;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const petLabel = formatPetLabel(event.petNames) || event.title;
  // Group / multi-pet module events show the module name + capacity.
  const isGroupEvent = Boolean(event.capacity);
  const groupFull = isGroupFull(event.capacity);
  const chipLabel = isGroupEvent ? event.title : petLabel;
  const isRecurring = Boolean(event.recurrence && event.recurrence !== "none");
  const isTransport = Boolean(event.stops?.length);
  // Bookings (incl. group modules / evaluations) can be dragged to reschedule.
  const isDraggable = event.type === "booking" && !event.isSubEvent;
  const { draggingId } = useCalendarDrag();
  const isDragging = draggingId === event.id;
  const timeLabel = eventDurationLabel(event);
  const isCompletedTask = event.type === "task" && event.status === "Completed";
  const isCompletedAddOn =
    event.type === "add-on" && event.status === "Completed";
  const isCompletedEvent = isCompletedTask || isCompletedAddOn;
  const isOverdueTask = event.type === "task" && event.status === "Overdue";
  const isCancelledBooking =
    event.type === "booking" && event.status === "Cancelled";
  const isExternal = event.type === "external";
  const externalMeta = event.external;
  const externalGlyph =
    isExternal && externalMeta
      ? EXTERNAL_SOURCE_GLYPH[externalMeta.provider]
      : null;

  const accentColor = resolveEventColor(
    event,
    renderSettings.visualConfig.colorMode,
    renderSettings.serviceColorMap,
    renderSettings.colorOverrides,
  );

  // No left-border stripe — use tinted background + colored dot. External
  // (synced) events render lighter/outlined with a dashed border (Table 66).
  const chipStyle: CSSProperties = isExternal
    ? {
        backgroundColor: hexToRgba(accentColor, 0.08),
        borderColor: hexToRgba(accentColor, 0.5),
        borderStyle: "dashed",
      }
    : isCompletedEvent
      ? {
          backgroundColor: "rgba(100,116,139,0.07)",
          borderColor: "rgba(100,116,139,0.18)",
        }
      : isOverdueTask
        ? {
            backgroundColor: "rgba(239,68,68,0.08)",
            borderColor: "rgba(239,68,68,0.28)",
          }
        : {
            backgroundColor: hexToRgba(accentColor, 0.09),
            borderColor: hexToRgba(accentColor, 0.25),
          };

  const serviceLabel =
    event.service ?? (event.type === "task" ? "Task" : "Booking");

  // Add-on indicator: only bookings, and only when add-ons render nested (in
  // "separate" mode they surface as their own chips, so the pill is redundant).
  const bookingAddOns = event.type === "booking" ? event.addOns : [];
  const addOnNames = bookingAddOns.map((addOn) => addOn.name);
  const showAddOnPill =
    bookingAddOns.length > 0 &&
    renderSettings.visualConfig.addOnDisplayMode === "nested";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-calendar-event-chip
          style={chipStyle}
          draggable={isDraggable}
          onDragStart={(e) => {
            startCalendarDrag(event);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", event.id);
          }}
          onDragEnd={endCalendarDrag}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          title={eventHoverSummary(
            event,
            petLabel,
            event.customerName ?? "No customer linked",
          )}
          className={cn(
            "group relative block w-full rounded-xl border px-2.5 py-2 text-left",
            "transition-all duration-150 hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-none",
            isDraggable
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-pointer",
            event.isSubEvent && "border-dashed opacity-75",
            isCancelledBooking && "opacity-50",
            // Ghost of the original while dragging (Table 85).
            isDragging && "opacity-40",
          )}
        >
          {/* Hover glow overlay */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              boxShadow: `inset 0 0 0 1px ${hexToRgba(accentColor, 0.35)}`,
            }}
          />

          {isExternal ? (
            <>
              {/* External: source glyph + title (spec Table 66) */}
              <div className="flex min-w-0 items-center gap-1.5">
                {externalGlyph && (
                  <span
                    className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-white text-[8px] leading-none font-black ring-1 ring-slate-200"
                    style={{ color: externalGlyph.color }}
                  >
                    {externalGlyph.glyph}
                  </span>
                )}
                <p className="truncate text-[11px] leading-tight font-semibold text-slate-600">
                  {event.title}
                </p>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 pl-6 text-[10px] text-slate-400">
                {!event.allDay && (
                  <span className="shrink-0 tabular-nums">{timeLabel}</span>
                )}
                {externalMeta?.sourceLabel && (
                  <span className="truncate">· {externalMeta.sourceLabel}</span>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Top row: colored dot + pet name */}
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full ring-1 ring-white/80"
                  style={{
                    backgroundColor: isCompletedEvent ? "#94a3b8" : accentColor,
                    boxShadow: isCompletedEvent
                      ? "none"
                      : `0 0 5px ${hexToRgba(accentColor, 0.55)}`,
                  }}
                />
                <p
                  className={cn(
                    "truncate text-[11px] leading-tight font-bold text-slate-900",
                    isCancelledBooking && "line-through",
                    isCompletedEvent && "text-slate-400 line-through",
                  )}
                >
                  {chipLabel}
                </p>
                {isRecurring && (
                  <Repeat
                    className="size-2.5 shrink-0 text-slate-400"
                    aria-label="Recurring"
                  />
                )}
                {/* Icon-only chip decorations (spec 8.5 / 8.6) — no colour
                    change to the event itself. */}
                {event.decorations?.vaccinationWarning && (
                  <span
                    className="shrink-0"
                    title={event.decorations.vaccinationWarning.label}
                  >
                    <TriangleAlert
                      className={cn(
                        "size-2.5",
                        event.decorations.vaccinationWarning.daysLeft < 0
                          ? "text-red-500"
                          : "text-amber-500",
                      )}
                      aria-label="Vaccination warning"
                    />
                  </span>
                )}
                {event.decorations?.birthday && (
                  <span
                    className="shrink-0"
                    title={`${petLabel}'s birthday today`}
                  >
                    <Cake
                      className="size-2.5 text-pink-500"
                      aria-label="Birthday"
                    />
                  </span>
                )}
                {event.decorations?.clientAnniversary && (
                  <span
                    className="shrink-0"
                    title={`Booking anniversary — ${event.customerName ?? "loyal client"}`}
                  >
                    <Heart
                      className="size-2.5 fill-rose-500 text-rose-500"
                      aria-label="Booking anniversary"
                    />
                  </span>
                )}
              </div>

              {/* Bottom row: service badge + time + completed indicator */}
              <div className="mt-1 flex min-w-0 items-center gap-1.5 pl-3.5">
                {isCompletedEvent ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wide text-slate-400 uppercase">
                    <Check className="size-2.5" />
                    Done
                  </span>
                ) : (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wide uppercase"
                    style={{
                      backgroundColor: hexToRgba(accentColor, 0.15),
                      color: accentColor,
                    }}
                  >
                    {serviceLabel.length > 12
                      ? serviceLabel.slice(0, 12) + "…"
                      : serviceLabel}
                  </span>
                )}
                {!event.allDay && (
                  <span
                    className={cn(
                      "truncate text-[10px] leading-tight font-medium",
                      isCompletedEvent ? "text-slate-300" : "text-slate-400",
                    )}
                  >
                    {timeLabel}
                  </span>
                )}
                {event.capacity && (
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] leading-none font-bold",
                      groupFull
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {event.capacity.used}/{event.capacity.total} dogs
                  </span>
                )}
                {groupFull && (
                  <span className="shrink-0 rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wide text-white uppercase">
                    Full
                  </span>
                )}
                {isTransport && event.location && (
                  <span className="inline-flex min-w-0 shrink items-center gap-0.5 text-[10px] font-medium text-slate-400">
                    <Truck className="size-3 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </span>
                )}
                {showAddOnPill && (
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-bold text-white",
                      ADD_ON_PILL_CLASS[dominantAddOnBucket(addOnNames)],
                    )}
                    title={`Add-ons: ${addOnNames.join(", ")}`}
                  >
                    +{bookingAddOns.length}
                  </span>
                )}
              </div>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="z-50 w-72 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl"
        side="right"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-4 pb-3"
          style={{
            backgroundColor: hexToRgba(accentColor, 0.08),
            borderBottom: `1px solid ${hexToRgba(accentColor, 0.15)}`,
          }}
        >
          <div className="flex items-start gap-3">
            {/* Pet avatar */}
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexToRgba(accentColor, 0.18) }}
            >
              <PawPrint className="size-5" style={{ color: accentColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm/tight font-bold text-slate-900">
                {petLabel}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {event.service}
              </p>
              <Badge
                className={cn(
                  "mt-1.5 border px-2 py-0 text-[10px] font-semibold",
                  getStatusBadgeStyle(event.status, event.type),
                )}
              >
                {event.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="space-y-2 bg-white px-4 pt-3 pb-3">
          {!event.allDay && (
            <div className="flex items-center gap-2.5 text-[12px] text-slate-600">
              <Clock className="size-3.5 shrink-0 text-slate-400" />
              <span>{timeLabel}</span>
            </div>
          )}
          {event.customerName && (
            <div className="flex items-center gap-2.5 text-[12px] text-slate-600">
              <User className="size-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{event.customerName}</span>
            </div>
          )}
          {event.staff && (
            <div className="flex items-center gap-2.5 text-[12px] text-slate-600">
              <Users className="size-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{event.staff}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2.5 text-[12px] text-slate-600">
              <MapPin className="size-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.bookingId && (
            <div className="flex items-center gap-2.5 text-[12px] text-slate-600">
              <Hash className="size-3.5 shrink-0 text-slate-400" />
              <span>Booking #{event.bookingId}</span>
            </div>
          )}
          {event.type === "booking" && bookingAddOns.length > 0 && (
            <div className="flex items-start gap-2.5 text-[12px] text-slate-600">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <span className="line-clamp-2">
                Add-ons: {addOnNames.join(", ")}
              </span>
            </div>
          )}
          {event.notes && (
            <div className="mt-1 flex items-start gap-2.5 text-[12px] text-slate-600">
              <FileText className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <span className="line-clamp-2">{event.notes}</span>
            </div>
          )}
          {event.completedAt && (
            <div className="mt-1 flex items-center gap-2.5 text-[12px] text-emerald-600">
              <Check className="size-3.5 shrink-0 text-emerald-500" />
              <span>
                Completed by {event.completedByName ?? "Staff"} at{" "}
                {new Date(event.completedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Completed indicator */}
        {isCompletedEvent && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2">
            <div className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-emerald-600">
              <Check className="size-3.5" />
              Completed
            </div>
          </div>
        )}

        {/* Footer actions — read-only Full Details modal (A6 / Task 12) */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white p-3">
          {(event.type === "booking" || event.type === "add-on") &&
            event.href && (
              <Link
                href={event.href}
                onClick={() => setOpen(false)}
                className="flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Pencil className="size-3" />
                Edit Booking
              </Link>
            )}
          {onMarkEventComplete &&
            (((event.type === "task" || event.type === "add-on") &&
              !isCompletedEvent) ||
              (event.type === "booking" &&
                ![
                  "Completed",
                  "Checked-out",
                  "Checked Out",
                  "Cancelled",
                ].includes(event.status))) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkEventComplete(event);
                  setOpen(false);
                }}
                className="flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
              >
                <Check className="size-3" />
                Mark Complete
              </button>
            )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEventClick?.(event);
            }}
            className="flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <PanelRight className="size-3" />
            Open Panel
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilterSection({
  title,
  options,
  selectedValues,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-sm">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {title}
      </h3>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {options.map((option) => {
          const checked = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(option.value)}
              />
              <span className="text-xs text-slate-700">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function DayTimeline({
  day,
  events,
  timelineRef,
  renderSettings,
  onEventClick,
  onMarkEventComplete,
  onSlotCreate,
  onEventReschedule,
  showCapacityHeat = false,
}: {
  day: Date;
  events: OperationsCalendarEvent[];
  timelineRef: RefObject<HTMLDivElement | null>;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date, anchor?: { x: number; y: number }) => void;
  onEventReschedule?: (
    event: OperationsCalendarEvent,
    newStart: Date,
    newStaff?: string,
  ) => void;
  showCapacityHeat?: boolean;
}) {
  const slotHeight = getTimelineSlotHeight(
    renderSettings.visualConfig.zoomLevel,
  );
  const now = new Date();
  const todayView = isSameDay(day, now);
  const { hoverKey } = useCalendarDrag();
  const dayWaitlist = waitlistForDay(useWaitlistEntries(), day);

  // 8 AM–8 PM in 30-minute slots (spec Task 6): 24 slots, 8:00 … 19:30.
  const slots = Array.from({ length: 24 }, (_, i) => {
    const start = new Date(day);
    start.setHours(8, 0, 0, 0);
    return addMinutes(start, i * 30);
  });

  return (
    <>
      <div
        ref={timelineRef}
        className="max-h-[700px] overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm"
      >
        {slots.map((slotStart, idx) => {
          const slotEnd = addMinutes(slotStart, 30);
          const isHourStart = slotStart.getMinutes() === 0;
          // Each event renders once, in the slot it starts in (events starting
          // before the 8 AM window are clamped to the first slot).
          const slotEvents = events.filter(
            (ev) =>
              ev.start < slotEnd &&
              ev.end > slotStart &&
              (idx === 0 || ev.start >= slotStart),
          );
          const isCurrentSlot = todayView && now >= slotStart && now < slotEnd;
          const nowPercent =
            ((now.getTime() - slotStart.getTime()) / (30 * 60 * 1000)) * 100;
          const heatUsed = capacityUsed(slotEvents);
          const heatTotal = capacityTotal(slotEvents, HEATMAP_HOURLY_CAPACITY);

          return (
            <div
              key={slotStart.toISOString()}
              className={cn(
                "relative grid grid-cols-[72px_1fr] border-b last:border-b-0",
                isHourStart ? "border-slate-100" : "border-slate-100/60",
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                isCurrentSlot && "bg-sky-50/40",
              )}
            >
              <div
                className={cn(
                  "border-r border-slate-100 px-3 py-3 text-xs font-semibold",
                  isCurrentSlot
                    ? "text-sky-600"
                    : isHourStart
                      ? "text-slate-400"
                      : "text-slate-300",
                )}
              >
                {slotStart.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div
                className={cn(
                  "relative flex flex-col gap-1.5 p-2 pr-3 transition-colors",
                  showCapacityHeat && capacityHeatClass(heatUsed, heatTotal),
                  hoverKey === `day-${slotStart.toISOString()}` &&
                    "bg-sky-100/60 ring-2 ring-sky-400 ring-inset",
                )}
                title={
                  showCapacityHeat
                    ? capacityHeatTitle(heatUsed, heatTotal)
                    : undefined
                }
                style={{ minHeight: slotHeight / 2 }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-calendar-event-chip]")) return;
                  onSlotCreate?.(slotStart, { x: e.clientX, y: e.clientY });
                }}
                onDragOver={(e) => {
                  if (!getDraggingEvent()) return;
                  e.preventDefault();
                  setDropHoverKey(`day-${slotStart.toISOString()}`);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragged = getDraggingEvent();
                  if (dragged && onEventReschedule) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const half = (e.clientY - rect.top) / rect.height >= 0.5;
                    onEventReschedule(
                      dragged,
                      addMinutes(slotStart, half ? 15 : 0),
                    );
                  }
                  endCalendarDrag();
                }}
              >
                {/* Live current-time indicator */}
                {isCurrentSlot && (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                    style={{ top: `${nowPercent}%` }}
                  >
                    <div className="-ml-1.5 size-2.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_6px_2px_rgba(244,63,94,0.4)]" />
                    <div className="h-px flex-1 bg-rose-400/70" />
                  </div>
                )}
                {slotEvents.map((ev) => (
                  <EventChip
                    key={`${ev.id}-${idx}`}
                    event={ev}
                    renderSettings={renderSettings}
                    onEventClick={onEventClick}
                    onMarkEventComplete={onMarkEventComplete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {dayWaitlist.length > 0 && <WaitlistSection entries={dayWaitlist} />}
    </>
  );
}

export function DayColumns({
  days,
  events,
  showMonthMask,
  anchorDate,
  renderSettings,
  onEventClick,
  onMarkEventComplete,
  onSlotCreate,
  onEventReschedule,
  showCapacityHeat = false,
}: {
  days: Date[];
  events: OperationsCalendarEvent[];
  showMonthMask?: boolean;
  anchorDate?: Date;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date, anchor?: { x: number; y: number }) => void;
  onEventReschedule?: (
    event: OperationsCalendarEvent,
    newStart: Date,
    newStaff?: string,
  ) => void;
  showCapacityHeat?: boolean;
}) {
  const visibleLimit = getZoomEventLimit(renderSettings.visualConfig.zoomLevel);
  const today = new Date();
  const { hoverKey } = useCalendarDrag();
  const waitlistEntries = useWaitlistEntries();

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7"
        style={{ minWidth: days.length >= 7 ? "630px" : undefined }}
      >
        {days.map((day) => {
          const dayEvents = getEventsForDay(events, day);
          const visibleEvents = dayEvents.slice(0, visibleLimit);
          const overflowCount = Math.max(
            0,
            dayEvents.length - visibleEvents.length,
          );
          const isToday = isSameDay(day, today);
          const inCurrentMonth =
            !showMonthMask || !anchorDate || isCurrentMonthDay(day, anchorDate);
          const heatUsed = capacityUsed(dayEvents);
          const heatTotal = HEATMAP_DAILY_CAPACITY;
          const dayWaitlist = waitlistForDay(waitlistEntries, day);

          return (
            <div
              key={formatDateKey(day)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-lg",
                inCurrentMonth
                  ? "border-slate-200/60 bg-white shadow-sm"
                  : "border-slate-100/80 bg-slate-50/60",
                isToday &&
                  "border-sky-200/60 shadow-md ring-2 shadow-sky-100/60 ring-sky-400/40",
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  "flex cursor-pointer items-center justify-between border-b px-3 py-2",
                  isToday
                    ? "border-sky-700/30 bg-sky-600"
                    : inCurrentMonth
                      ? "border-slate-100 bg-slate-50"
                      : "border-slate-100/60 bg-slate-50/60",
                )}
                onClick={(e) => {
                  const slot = new Date(day);
                  slot.setHours(9, 0, 0, 0);
                  onSlotCreate?.(slot, { x: e.clientX, y: e.clientY });
                }}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold tracking-tight",
                    isToday
                      ? "text-white"
                      : inCurrentMonth
                        ? "text-slate-700"
                        : "text-slate-400",
                  )}
                >
                  {day.toLocaleDateString("en-US", {
                    weekday: days.length >= 14 ? "short" : "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {dayEvents.length > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      isToday
                        ? "bg-white/20 text-white"
                        : "bg-indigo-100 text-indigo-600",
                    )}
                  >
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Events area */}
              <div
                className={cn(
                  "flex flex-1 flex-col gap-1.5 p-2 transition-colors",
                  showCapacityHeat && capacityHeatClass(heatUsed, heatTotal),
                  hoverKey === `week-${formatDateKey(day)}` &&
                    "bg-sky-100/50 ring-2 ring-sky-400 ring-inset",
                )}
                title={
                  showCapacityHeat
                    ? capacityHeatTitle(heatUsed, heatTotal)
                    : undefined
                }
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-calendar-event-chip]")) return;
                  const slot = new Date(day);
                  slot.setHours(9, 0, 0, 0);
                  onSlotCreate?.(slot, { x: e.clientX, y: e.clientY });
                }}
                onDragOver={(e) => {
                  if (!getDraggingEvent()) return;
                  e.preventDefault();
                  setDropHoverKey(`week-${formatDateKey(day)}`);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragged = getDraggingEvent();
                  if (dragged && onEventReschedule) {
                    // Keep the original time-of-day (snapped to 15 min).
                    const newStart = new Date(day);
                    newStart.setHours(
                      dragged.start.getHours(),
                      Math.round(dragged.start.getMinutes() / 15) * 15,
                      0,
                      0,
                    );
                    onEventReschedule(dragged, newStart);
                  }
                  endCalendarDrag();
                }}
              >
                {visibleEvents.map((ev) => (
                  <EventChip
                    key={ev.id}
                    event={ev}
                    renderSettings={renderSettings}
                    onEventClick={onEventClick}
                    onMarkEventComplete={onMarkEventComplete}
                  />
                ))}
                {overflowCount > 0 && (
                  <p className="pt-0.5 pl-2 text-[10px] font-semibold text-indigo-400">
                    +{overflowCount} more
                  </p>
                )}
                {dayEvents.length === 0 && (
                  <p className="py-3 text-center text-[10px] text-slate-300 select-none">
                    No events
                  </p>
                )}
              </div>
              {dayWaitlist.length > 0 && (
                <div className="px-2 pb-2">
                  <WaitlistSection entries={dayWaitlist} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResourceColumnsView({
  resources,
  events,
  renderSettings,
  onEventClick,
  onMarkEventComplete,
  onSlotCreate,
  onEventReschedule,
}: {
  resources: Array<{ id: string; name: string; type: string }>;
  events: OperationsCalendarEvent[];
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date, anchor?: { x: number; y: number }) => void;
  onEventReschedule?: (
    event: OperationsCalendarEvent,
    newStart: Date,
    newStaff?: string,
  ) => void;
}) {
  const { hoverKey } = useCalendarDrag();

  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-400">
        No resources are configured for this resource calendar type.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {resources.map((resource) => {
        const laneEvents = events
          .filter((ev) =>
            // Staff-axis columns match on assigned staff; other resource
            // types match on the resource id / name.
            resource.type === "staff"
              ? ev.staff === resource.name
              : (ev.resourceId && ev.resourceId === resource.id) ||
                ev.resource === resource.name,
          )
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        let conflictCount = 0;
        for (let i = 0; i < laneEvents.length; i++) {
          const cur = laneEvents[i];
          if (
            laneEvents.some(
              (c, ci) => ci > i && cur.start < c.end && cur.end > c.start,
            )
          ) {
            conflictCount++;
          }
        }

        return (
          <div
            key={resource.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2.5">
              <span className="line-clamp-1 text-sm font-bold text-slate-800">
                {resource.name}
              </span>
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-normal"
              >
                {resource.type}
              </Badge>
            </div>
            {conflictCount > 0 && (
              <div className="border-b border-rose-100 bg-rose-50 px-3 py-1">
                <p className="text-[11px] font-medium text-rose-600">
                  ⚠ {conflictCount} conflict(s)
                </p>
              </div>
            )}
            <div
              className={cn(
                "flex flex-1 flex-col gap-1.5 p-2 transition-colors",
                hoverKey === `lane-${resource.id}` &&
                  "bg-sky-100/50 ring-2 ring-sky-400 ring-inset",
              )}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("[data-calendar-event-chip]")) return;
                const seed = new Date();
                seed.setMinutes(0, 0, 0);
                onSlotCreate?.(seed, { x: e.clientX, y: e.clientY });
              }}
              onDragOver={(e) => {
                if (!getDraggingEvent()) return;
                e.preventDefault();
                setDropHoverKey(`lane-${resource.id}`);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const dragged = getDraggingEvent();
                if (dragged && onEventReschedule) {
                  // Staff View: reassign to this column's staff, keep the time.
                  onEventReschedule(
                    dragged,
                    dragged.start,
                    resource.type === "staff" ? resource.name : undefined,
                  );
                }
                endCalendarDrag();
              }}
            >
              {laneEvents.map((ev) => (
                <EventChip
                  key={ev.id}
                  event={ev}
                  renderSettings={renderSettings}
                  onEventClick={onEventClick}
                  onMarkEventComplete={onMarkEventComplete}
                />
              ))}
              {laneEvents.length === 0 && (
                <p className="py-3 text-center text-[10px] text-slate-300">
                  No events assigned
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ListView({
  days,
  events,
  renderSettings,
  onEventClick,
  onMarkEventComplete,
}: {
  days: Date[];
  events: OperationsCalendarEvent[];
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
}) {
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayEvents = getEventsForDay(events, day);
        if (dayEvents.length === 0) return null;

        return (
          <div
            key={formatDateKey(day)}
            className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-800">
                {day.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
            </div>
            <div className="flex flex-col gap-1.5 p-3">
              {dayEvents.map((ev) => (
                <EventChip
                  key={ev.id}
                  event={ev}
                  renderSettings={renderSettings}
                  onEventClick={onEventClick}
                  onMarkEventComplete={onMarkEventComplete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
