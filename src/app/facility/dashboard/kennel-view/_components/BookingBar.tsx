"use client";

import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTagsForEntity } from "@/data/tags-notes";
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
  isGhost?: boolean;
  isPastWeek?: boolean;
  hideResizeHandles?: boolean;
  arrivalGlow?: boolean;
  departureGlow?: boolean;
  customServices?: CustomServiceCheckIn[];
  moduleColorMap?: Map<string, string>;
  showCustomServices?: boolean;
  onClick?: () => void;
  onResizeStart?: (edge: "start" | "end", e: React.MouseEvent) => void;
  onMoveStart?: (e: React.MouseEvent) => void;
}

// Parse "YYYY-MM-DD" in local time (avoid UTC drift) and render as "Apr 30".
function formatShortDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function BookingBar({
  booking,
  startCol,
  span,
  isDragging,
  isGhost,
  isPastWeek,
  hideResizeHandles,
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

  const barClasses = isCritical
    ? "bg-red-50/95 ring-2 ring-red-400/40 dark:bg-red-900/30 dark:ring-red-500/50"
    : getBookingSurfaceClasses(booking.bookingStatus);
  const textClass = getBookingTextClass(booking.bookingStatus);

  const dateRange =
    booking.checkIn || booking.checkOut
      ? `${formatShortDate(booking.checkIn)} → ${formatShortDate(booking.checkOut)}`
      : "";

  return (
    <div
      aria-label={`${booking.petName ?? "Booking"}${isCritical ? " — critical alert" : ""}`}
      data-bar="booking"
      className={cn(
        "group pointer-events-auto z-10 mx-0.5 my-1.5 flex h-12 cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg border border-black/5 px-2 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md",
        colStart(startCol + 1),
        colSpan(span),
        barClasses,
        isDragging && !isGhost && "ring-primary/50 z-20 shadow-lg ring-2",
        isGhost && "pointer-events-none opacity-30 saturate-50",
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
      <div className="ring-background size-10 shrink-0 overflow-hidden rounded-full ring-2">
        {booking.petPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booking.petPhotoUrl}
            alt={booking.petName ?? ""}
            width={40}
            height={40}
            className="size-full object-cover"
          />
        ) : (
          <div className="bg-muted flex size-full items-center justify-center">
            <PawPrint className="text-muted-foreground size-5" />
          </div>
        )}
      </div>

      {/* Pet name + date range */}
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className={cn("truncate text-sm font-semibold", textClass)}>
          {booking.petName}
        </span>
        {dateRange && (
          <span className={cn("truncate text-xs opacity-75", textClass)}>
            {dateRange}
          </span>
        )}
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

      {/* Resize handles — hidden in past-week mode and when explicitly disabled (e.g. daycare = 1-day stays) */}
      {!isPastWeek && !hideResizeHandles && (
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
