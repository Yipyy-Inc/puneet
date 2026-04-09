"use client";

import type { RefObject } from "react";
import {
  Bone,
  CheckCircle2,
  Circle,
  MapPin,
  Pill,
  Plus,
  Scissors,
  Smile,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  type CalendarVisualConfig,
  type FilterOption,
  type OperationsCalendarEvent,
  addMinutes,
  formatDateKey,
  formatPetLabel,
  formatTimeLabel,
  getEventsForDay,
  getRoleGroupLabel,
  getTimelineSlotHeight,
  getZoomEventLimit,
  hexToRgba,
  isCurrentMonthDay,
  resolveEventColor,
} from "@/lib/operations-calendar";

export interface EventRenderSettings {
  visualConfig: CalendarVisualConfig;
  serviceColorMap: Record<string, string>;
}

const EVENT_TYPE_BADGES: Record<string, string> = {
  booking: "border-sky-200 bg-sky-100 text-sky-700",
  "add-on": "border-indigo-200 bg-indigo-100 text-indigo-700",
  task: "border-amber-200 bg-amber-100 text-amber-700",
  "facility-event": "border-emerald-200 bg-emerald-100 text-emerald-700",
  "retail-pos": "border-slate-200 bg-slate-100 text-slate-700",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  booking: "Booking",
  "add-on": "Add-on",
  task: "Task",
  "facility-event": "Facility Event",
  "retail-pos": "Retail / POS",
};

const ADD_ON_ICON_MAP = {
  "tooth-brushing": Smile,
  medication: Pill,
  treats: Bone,
  enrichment: Sparkles,
  "nail-trim": Scissors,
  yogurt: Circle,
  custom: Plus,
} as const;

function eventDurationLabel(event: OperationsCalendarEvent): string {
  if (event.allDay) return "All day";
  return `${formatTimeLabel(event.start)} - ${formatTimeLabel(event.end)}`;
}

function getCardInlineStyle(
  event: OperationsCalendarEvent,
  renderSettings: EventRenderSettings,
): React.CSSProperties {
  if (event.type === "task" && event.status === "Completed") {
    return {
      backgroundColor: "rgba(100, 116, 139, 0.12)",
      borderColor: "rgba(100, 116, 139, 0.35)",
      borderLeftWidth: 4,
      borderLeftColor: "#94a3b8",
    };
  }

  if (event.type === "task" && event.status === "Overdue") {
    return {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.35)",
      borderLeftWidth: 4,
      borderLeftColor: "#ef4444",
    };
  }

  const color = resolveEventColor(
    event,
    renderSettings.visualConfig.colorMode,
    renderSettings.serviceColorMap,
  );

  if (renderSettings.visualConfig.colorStyle === "full-background") {
    return {
      backgroundColor: hexToRgba(color, 0.14),
      borderColor: hexToRgba(color, 0.35),
    };
  }

  return {
    borderLeftWidth: 4,
    borderLeftColor: color,
  };
}

function getVisibleTagChips(event: OperationsCalendarEvent): string[] {
  return [...event.petTags, ...event.customerTags, ...event.bookingTags].slice(0, 4);
}

function getDisplayAddOns(
  event: OperationsCalendarEvent,
  renderSettings: EventRenderSettings,
) {
  if (event.type === "add-on") {
    return event.addOns;
  }

  if (event.type !== "booking") {
    return [];
  }

  if (renderSettings.visualConfig.addOnDisplayMode === "nested") {
    return event.addOns;
  }

  return event.addOns.filter((addOn) => !addOn.scheduledAt);
}

function SubtypeBadge({ subtype }: { subtype: string }) {
  const label = subtype
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
      {label}
    </span>
  );
}

export function EventChip({
  event,
  renderSettings,
  onEventClick,
}: {
  event: OperationsCalendarEvent;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
}) {
  const fields = renderSettings.visualConfig.cardFields;
  const petLabel = formatPetLabel(event.petNames);
  const roleLabel = getRoleGroupLabel(event.roleGroup);
  const tags = getVisibleTagChips(event);
  const displayedAddOns = getDisplayAddOns(event, renderSettings);
  const isCompletedTask = event.type === "task" && event.status === "Completed";
  const isOverdueTask = event.type === "task" && event.status === "Overdue";
  const isCancelledBooking = event.type === "booking" && event.status === "Cancelled";
  const taskDecoration = renderSettings.visualConfig.completedTaskDecoration;
  const showCheckmark = isCompletedTask && taskDecoration === "checkmark";
  const showStrike = isCompletedTask && taskDecoration === "strikethrough";
  const displayMode = event.calendarCardDisplayMode ?? "full-block";
  const isIconOnly = displayMode === "icon-only";
  const isCompact = displayMode === "compact-block";

  if (isIconOnly) {
    return (
      <button
        type="button"
        data-calendar-event-chip
        style={getCardInlineStyle(event, renderSettings)}
        onClick={() => onEventClick?.(event)}
        className={cn(
          "hover:border-primary/40 hover:bg-primary/5 block w-full rounded-md border border-slate-200 bg-white/90 px-2 py-1.5 text-left transition",
          isOverdueTask && "border-red-300 bg-red-50",
          isCompletedTask && "border-slate-300 bg-slate-100/80 text-slate-600",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="line-clamp-1 text-[11px] font-semibold text-slate-900">
            {event.title}
          </span>
          {event.allDay ? (
            <span className="text-[10px] text-slate-500">All day</span>
          ) : (
            <span className="text-[10px] text-slate-500">{formatTimeLabel(event.start)}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-calendar-event-chip
      style={getCardInlineStyle(event, renderSettings)}
      onClick={() => onEventClick?.(event)}
      className={cn(
        "hover:border-primary/40 hover:bg-primary/5 block w-full rounded-lg border border-slate-200 bg-white/90 p-2 text-left transition",
        event.isSubEvent &&
          "ml-4 border-dashed bg-indigo-50/40 before:mr-1 before:inline-block before:text-indigo-500 before:content-['↳']",
        isCompletedTask && "border-slate-300 bg-slate-100/80 text-slate-600",
        isOverdueTask && "border-red-300 bg-red-50",
        isCancelledBooking && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "line-clamp-1 text-xs font-semibold text-slate-900",
              showStrike && "line-through",
              isCancelledBooking && "line-through",
            )}
          >
            {showCheckmark && <CheckCircle2 className="mr-1 inline size-3.5 text-emerald-600" />}
            {fields.petNames && petLabel.length > 0 ? petLabel : event.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                EVENT_TYPE_BADGES[event.type] ?? "",
              )}
            >
              {EVENT_TYPE_LABELS[event.type] ?? event.type}
            </Badge>
            <SubtypeBadge subtype={event.subtype} />
          </div>
        </div>
        {fields.status && (
          <Badge variant="outline" className="rounded-md px-1.5 py-0.5 text-[10px]">
            {event.status}
          </Badge>
        )}
      </div>

      <div className="mt-1.5 space-y-1.5 text-[11px] text-slate-700">
        {!isCompact && fields.customerName && event.customerName && (
          <p className="line-clamp-1 text-slate-600">{event.customerName}</p>
        )}
        {fields.serviceName && (
          <p className="line-clamp-1 text-slate-700">{event.service}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
          {fields.time && <span>{eventDurationLabel(event)}</span>}
          {!isCompact && fields.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {event.location}
            </span>
          )}
          {!isCompact && fields.staff && (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {event.staff}
              {roleLabel && <span className="text-slate-400">({roleLabel})</span>}
            </span>
          )}
        </div>

        {!isCompact && fields.tagChips && tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <span
                key={`${event.id}-${tag}`}
                className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {!isCompact && fields.addOnIcons && displayedAddOns.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayedAddOns.map((addOn) => {
              const Icon = ADD_ON_ICON_MAP[addOn.iconKey];
              return (
                <span
                  key={`${event.id}-${addOn.id}`}
                  title={addOn.name}
                  className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                >
                  <Icon className="size-3" />
                  <span className="line-clamp-1 max-w-20">{addOn.name}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </button>
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
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white/90 p-3">
      <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">{title}</h3>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {options.map((option) => {
          const checked = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1"
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(option.value)} />
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
  onSlotCreate,
}: {
  day: Date;
  events: OperationsCalendarEvent[];
  timelineRef: RefObject<HTMLDivElement | null>;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const slotHeight = getTimelineSlotHeight(renderSettings.visualConfig.zoomLevel);

  return (
    <div
      ref={timelineRef}
      className="max-h-[700px] overflow-y-auto rounded-xl border border-slate-200 bg-white"
    >
      {hours.map((hour) => {
        const slotStart = new Date(day);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = addMinutes(slotStart, 60);
        const slotEvents = events.filter(
          (event) => event.start < slotEnd && event.end > slotStart,
        );

        return (
          <div key={hour} className="grid grid-cols-[72px_1fr] border-b border-slate-100 last:border-b-0">
            <div className="border-r border-slate-100 px-3 py-4 text-xs font-medium text-slate-500">
              {slotStart.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            <div
              className="space-y-2 p-2.5"
              style={{ minHeight: slotHeight }}
              onDoubleClick={(clickEvent) => {
                const target = clickEvent.target as HTMLElement;
                if (target.closest("[data-calendar-event-chip]")) return;
                onSlotCreate?.(slotStart);
              }}
            >
              {slotEvents.map((event) => (
                <EventChip
                  key={`${event.id}-${hour}`}
                  event={event}
                  renderSettings={renderSettings}
                  onEventClick={onEventClick}
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
  onSlotCreate,
}: {
  days: Date[];
  events: OperationsCalendarEvent[];
  showMonthMask?: boolean;
  anchorDate?: Date;
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date) => void;
}) {
  const visibleLimit = getZoomEventLimit(renderSettings.visualConfig.zoomLevel);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const dayEvents = getEventsForDay(events, day);
        const visibleEvents = dayEvents.slice(0, visibleLimit);
        const overflowCount = Math.max(0, dayEvents.length - visibleEvents.length);

        return (
          <Card
            key={formatDateKey(day)}
            className={cn(
              "border-slate-200 bg-white/90",
              showMonthMask &&
                anchorDate &&
                !isCurrentMonthDay(day, anchorDate) &&
                "bg-slate-50/70",
            )}
          >
            <CardHeader className="space-y-1 p-3 pb-2">
              <CardTitle className="text-sm text-slate-800">
                {day.toLocaleDateString("en-US", {
                  weekday: days.length >= 14 ? "short" : "long",
                  month: "short",
                  day: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent
              className="space-y-2 p-3 pt-0"
              onDoubleClick={() => {
                const slot = new Date(day);
                slot.setHours(9, 0, 0, 0);
                onSlotCreate?.(slot);
              }}
            >
              {visibleEvents.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  renderSettings={renderSettings}
                  onEventClick={onEventClick}
                />
              ))}
              {overflowCount > 0 && (
                <p className="text-xs font-medium text-slate-500">+{overflowCount} more events</p>
              )}
              {dayEvents.length === 0 && <p className="text-xs text-slate-400">No events</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ResourceColumnsView({
  resources,
  events,
  renderSettings,
  onEventClick,
  onSlotCreate,
}: {
  resources: Array<{ id: string; name: string; type: string }>;
  events: OperationsCalendarEvent[];
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date) => void;
}) {
  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No resources are configured for this resource calendar type.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {resources.map((resource) => {
        const laneEvents = events
          .filter(
            (event) =>
              (event.resourceId && event.resourceId === resource.id) ||
              event.resource === resource.name,
          )
          .sort((first, second) => first.start.getTime() - second.start.getTime());

        let conflictCount = 0;
        for (let index = 0; index < laneEvents.length; index += 1) {
          const current = laneEvents[index];
          const hasOverlap = laneEvents.some(
            (candidate, candidateIndex) =>
              candidateIndex > index &&
              current.start < candidate.end &&
              current.end > candidate.start,
          );
          if (hasOverlap) conflictCount += 1;
        }

        return (
          <Card key={resource.id} className="border-slate-200 bg-white/90">
            <CardHeader className="space-y-1 p-3 pb-2">
              <CardTitle className="flex items-center justify-between text-sm text-slate-800">
                <span className="line-clamp-1">{resource.name}</span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {resource.type}
                </Badge>
              </CardTitle>
              {conflictCount > 0 && (
                <p className="text-xs text-rose-600">{conflictCount} conflict window(s)</p>
              )}
            </CardHeader>
            <CardContent
              className="space-y-2 p-3 pt-0"
              onDoubleClick={() => {
                const seed = new Date();
                seed.setMinutes(0, 0, 0);
                onSlotCreate?.(seed);
              }}
            >
              {laneEvents.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  renderSettings={renderSettings}
                  onEventClick={onEventClick}
                />
              ))}
              {laneEvents.length === 0 && (
                <p className="text-xs text-slate-400">No events assigned</p>
              )}
            </CardContent>
          </Card>
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
}: {
  days: Date[];
  events: OperationsCalendarEvent[];
  renderSettings: EventRenderSettings;
  onEventClick?: (event: OperationsCalendarEvent) => void;
}) {
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayEvents = getEventsForDay(events, day);
        if (dayEvents.length === 0) {
          return null;
        }

        return (
          <Card key={formatDateKey(day)} className="border-slate-200 bg-white/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">
                {day.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayEvents.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  renderSettings={renderSettings}
                  onEventClick={onEventClick}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
