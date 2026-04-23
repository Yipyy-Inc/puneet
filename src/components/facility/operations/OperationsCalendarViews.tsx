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
  Check,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  MapPin,
  PawPrint,
  User,
  Users,
} from "lucide-react";
import {
  type CalendarColorOverrides,
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
  const timeLabel = eventDurationLabel(event);
  const isCompletedTask = event.type === "task" && event.status === "Completed";
  const isCompletedAddOn =
    event.type === "add-on" && event.status === "Completed";
  const isCompletedEvent = isCompletedTask || isCompletedAddOn;
  const isOverdueTask = event.type === "task" && event.status === "Overdue";
  const isCancelledBooking =
    event.type === "booking" && event.status === "Cancelled";

  const accentColor = resolveEventColor(
    event,
    renderSettings.visualConfig.colorMode,
    renderSettings.serviceColorMap,
    renderSettings.colorOverrides,
  );

  // No left-border stripe — use tinted background + colored dot
  const chipStyle: CSSProperties = isCompletedEvent
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-calendar-event-chip
          style={chipStyle}
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
            "cursor-pointer",
            event.isSubEvent && "ml-3 border-dashed opacity-80",
            isCancelledBooking && "opacity-50",
          )}
        >
          {/* Hover glow overlay */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              boxShadow: `inset 0 0 0 1px ${hexToRgba(accentColor, 0.35)}`,
            }}
          />

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
              {petLabel}
            </p>
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
          </div>
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

        {/* Quick actions */}
        {(event.type === "task" || event.type === "add-on") &&
          !isCompletedEvent &&
          onMarkEventComplete && (
            <div className="border-t border-slate-100 bg-white px-4 py-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkEventComplete(event);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-[12px] font-semibold text-white shadow-sm transition-all hover:scale-[1.01] hover:bg-emerald-600 hover:shadow-md active:scale-[0.98]"
              >
                <Check className="size-3.5" />
                Mark Complete
              </button>
            </div>
          )}
        {isCompletedEvent && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2">
            <div className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-emerald-600">
              <Check className="size-3.5" />
              Completed
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-2 border-t border-slate-100 bg-white p-3">
          {event.href && (
            <Link
              href={event.href}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-95"
              style={{ backgroundColor: accentColor }}
              onClick={() => setOpen(false)}
            >
              Full Details
              <ExternalLink className="size-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEventClick?.(event);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-100"
          >
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
}: {
  day: Date;
  events: OperationsCalendarEvent[];
  timelineRef: RefObject<HTMLDivElement | null>;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date) => void;
}) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 7);
  const slotHeight = getTimelineSlotHeight(
    renderSettings.visualConfig.zoomLevel,
  );
  const now = new Date();
  const todayView = isSameDay(day, now);
  const nowHour = now.getHours();
  const nowMinutePercent = (now.getMinutes() / 60) * 100;

  return (
    <div
      ref={timelineRef}
      className="max-h-[700px] overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm"
    >
      {hours.map((hour, idx) => {
        const slotStart = new Date(day);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = addMinutes(slotStart, 60);
        const slotEvents = events.filter(
          (ev) => ev.start < slotEnd && ev.end > slotStart,
        );
        const isCurrentHour = todayView && nowHour === hour;

        return (
          <div
            key={hour}
            className={cn(
              "relative grid grid-cols-[72px_1fr] border-b border-slate-100 last:border-b-0",
              idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
              isCurrentHour && "bg-sky-50/40",
            )}
          >
            <div
              className={cn(
                "border-r border-slate-100 px-3 py-4 text-xs font-semibold",
                isCurrentHour ? "text-sky-600" : "text-slate-400",
              )}
            >
              {slotStart.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            <div
              className="relative space-y-1.5 p-2 pr-3"
              style={{ minHeight: slotHeight }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("[data-calendar-event-chip]")) return;
                onSlotCreate?.(slotStart);
              }}
            >
              {/* Live current-time indicator */}
              {isCurrentHour && (
                <div
                  className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                  style={{ top: `${nowMinutePercent}%` }}
                >
                  <div className="-ml-1.5 size-2.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_6px_2px_rgba(244,63,94,0.4)]" />
                  <div className="h-px flex-1 bg-rose-400/70" />
                </div>
              )}
              {slotEvents.map((ev) => (
                <EventChip
                  key={`${ev.id}-${hour}`}
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

export function DayColumns({
  days,
  events,
  showMonthMask,
  anchorDate,
  renderSettings,
  onEventClick,
  onMarkEventComplete,
  onSlotCreate,
}: {
  days: Date[];
  events: OperationsCalendarEvent[];
  showMonthMask?: boolean;
  anchorDate?: Date;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date) => void;
}) {
  const visibleLimit = getZoomEventLimit(renderSettings.visualConfig.zoomLevel);
  const today = new Date();

  return (
    <div className="overflow-x-auto">
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
              onClick={() => {
                const slot = new Date(day);
                slot.setHours(9, 0, 0, 0);
                onSlotCreate?.(slot);
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
              className="flex-1 space-y-1.5 p-2"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("[data-calendar-event-chip]")) return;
                const slot = new Date(day);
                slot.setHours(9, 0, 0, 0);
                onSlotCreate?.(slot);
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
}: {
  resources: Array<{ id: string; name: string; type: string }>;
  events: OperationsCalendarEvent[];
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date) => void;
}) {
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
          .filter(
            (ev) =>
              (ev.resourceId && ev.resourceId === resource.id) ||
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
              className="flex-1 space-y-1.5 p-2"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("[data-calendar-event-chip]")) return;
                const seed = new Date();
                seed.setMinutes(0, 0, 0);
                onSlotCreate?.(seed);
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
            <div className="space-y-1.5 p-3">
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
