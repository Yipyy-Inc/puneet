"use client";

import {
  AlertTriangle,
  FileText,
  PawPrint,
  Pill,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TagList } from "@/components/shared/TagList";
import { getTagsForEntity, getNoteCount } from "@/data/tags-notes";
import { incidents } from "@/data/incidents";
import {
  getBookingSurfaceClasses,
  getBookingTextClass,
} from "../_lib/calendar-helpers";
import { colStart, colSpan, bgClassForHex } from "../_lib/grid-position";
import type { OccupancyKennel } from "../_lib/calendar-types";
import type { CustomServiceCheckIn } from "@/data/custom-service-checkins";

interface BookingBarProps {
  booking: OccupancyKennel;
  startCol: number;
  span: number;
  isDragging?: boolean;
  isPastWeek?: boolean;
  arrivalGlow?: boolean;
  departureGlow?: boolean;
  customServices?: CustomServiceCheckIn[];
  moduleColorMap?: Map<string, string>;
  showCustomServices?: boolean;
  onClick?: () => void;
  onResizeStart?: (edge: "start" | "end", e: React.MouseEvent) => void;
  onMoveStart?: (e: React.MouseEvent) => void;
}

function hasOpenIncident(petId: number | undefined): boolean {
  if (!petId) return false;
  return incidents.some(
    (i) => i.petIds.includes(petId) && i.status !== "resolved" && i.status !== "closed",
  );
}

export function BookingBar({
  booking,
  startCol,
  span,
  isDragging,
  isPastWeek,
  arrivalGlow,
  departureGlow,
  customServices,
  moduleColorMap,
  showCustomServices,
  onClick,
  onResizeStart,
  onMoveStart,
}: BookingBarProps) {
  const petTags = booking.petId ? getTagsForEntity("pet", booking.petId) : [];
  const isCritical = petTags.some((t) => t.priority === "critical");
  const noteCount = booking.petId ? getNoteCount("pet", booking.petId) : 0;
  const hasIncident = hasOpenIncident(booking.petId);
  const tagTooltip = petTags.map((t) => t.name).join(", ");

  const barClasses = isCritical
    ? "bg-red-50/95 ring-2 ring-red-400/40 dark:bg-red-900/30 dark:ring-red-500/50"
    : getBookingSurfaceClasses(booking.bookingStatus);
  const textClass = getBookingTextClass(booking.bookingStatus);

  return (
    <div
      title={tagTooltip || undefined}
      aria-label={`${booking.petName ?? "Booking"}${isCritical ? " — critical alert" : ""}`}
      data-bar="booking"
      className={cn(
        "group pointer-events-auto z-10 mx-0.5 my-1.5 flex h-12 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-black/5 px-2 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md",
        colStart(startCol + 1),
        colSpan(span),
        barClasses,
        isDragging && "ring-primary/50 z-20 shadow-lg ring-2",
        arrivalGlow && "ring-2 ring-cyan-400/70 ring-offset-1",
        departureGlow && "ring-2 ring-fuchsia-400/70 ring-offset-1",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseDown={(e) => {
        if (isPastWeek) return;
        const target = e.target as HTMLElement;
        if (target.dataset.handle) return;
        onMoveStart?.(e);
      }}
    >
      {/* Pet photo — plain <img> so no inline left/top from next/image. */}
      <div className="ring-background size-9 shrink-0 overflow-hidden rounded-full ring-2">
        {booking.petPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booking.petPhotoUrl}
            alt={booking.petName ?? ""}
            width={36}
            height={36}
            className="size-full object-cover"
          />
        ) : (
          <div className="bg-muted flex size-full items-center justify-center">
            <PawPrint className="text-muted-foreground size-4" />
          </div>
        )}
      </div>

      {/* Pet name + flags */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("truncate text-sm font-semibold", textClass)}>
            {booking.petName}
          </span>
          {hasIncident && (
            <AlertTriangle
              className="size-3.5 shrink-0 text-red-500"
              aria-label="Open incident"
            />
          )}
          {isCritical && (
            <span
              className="size-2 shrink-0 rounded-full bg-red-500"
              aria-label="Critical alert"
            />
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] opacity-80">
          {booking.petId && (
            <TagList
              entityType="pet"
              entityId={booking.petId}
              compact
              maxVisible={2}
            />
          )}
          {booking.hasFeedingInstructions && (
            <Utensils
              className="size-3 text-amber-600 dark:text-amber-400"
              aria-label="Feeding instructions"
            />
          )}
          {booking.hasMedications && (
            <Pill
              className="size-3 text-purple-600 dark:text-purple-400"
              aria-label="Medications"
            />
          )}
          {noteCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-300"
              aria-label={`${noteCount} notes`}
            >
              <FileText className="size-3" />
              {noteCount}
            </span>
          )}
        </div>
      </div>

      {/* Service indicator dots — colour mapped to Tailwind class so the bar
          carries no inline style attribute at all. */}
      {showCustomServices && customServices && customServices.length > 0 && (
        <div className="flex shrink-0 items-center gap-0.5">
          {customServices.slice(0, 3).map((s) => (
            <div
              key={s.id}
              title={s.moduleName}
              className={cn(
                "ring-background size-2 shrink-0 rounded-full ring-1",
                bgClassForHex(moduleColorMap?.get(s.moduleId)),
              )}
            />
          ))}
        </div>
      )}

      {/* Resize handles (hidden in past-week mode) */}
      {!isPastWeek && (
        <>
          <div
            data-handle="start"
            className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize rounded-l opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart?.("start", e);
            }}
          />
          <div
            data-handle="end"
            className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize rounded-r opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart?.("end", e);
            }}
          />
        </>
      )}
    </div>
  );
}
