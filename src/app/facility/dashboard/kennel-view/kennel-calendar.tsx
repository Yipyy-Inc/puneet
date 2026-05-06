"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomCategory } from "@/types/rooms";
import type { CustomServiceCheckIn } from "@/data/custom-service-checkins";

import { BookingBar } from "./_components/BookingBar";
import { BookingDetailsSheet } from "./_components/BookingDetailsSheet";
import { RoomCell } from "./_components/RoomCell";
import { BlockRoomDialog } from "./_components/BlockRoomDialog";
import { CalendarFilters } from "./_components/CalendarFilters";
import { ArrivalsDeparturesStrip } from "./_components/ArrivalsDeparturesStrip";
import { WeekPicker } from "./_components/WeekPicker";
import {
  toLocalISODate,
  startOfWeek,
  startOfDay,
  isPastWeek as checkPastWeek,
  detectMoveConflict,
  isRoomBlockedOnDate,
  dateRangesOverlap,
} from "./_lib/calendar-helpers";
import { gridCols, colStart, colSpan } from "./_lib/grid-position";
import {
  DEFAULT_FILTER_STATE,
  type CalendarFilterState,
  type OccupancyKennel,
  type RoomBlock,
} from "./_lib/calendar-types";
import { printOccupancyGrid } from "./_lib/print-calendar";

interface KennelCalendarViewProps {
  kennels: OccupancyKennel[];
  categories: RoomCategory[];
  facilityName?: string;
  /** Suffix shown next to the per-room rate, e.g. "/night" or "/day". */
  rateSuffix?: string;
  /** Disable the bar resize handles. Used for daycare where stays are 1-day. */
  disableResize?: boolean;
  onAddBooking?: (kennelId: string, date: string) => void;
  onUpdateBooking?: (
    kennelId: string,
    checkIn: string,
    checkOut: string,
    staffInitials: string,
  ) => void;
  onMoveBooking?: (
    bookingId: number,
    fromRoomId: string,
    toRoomId: string,
    staffInitials: string,
  ) => void;
  customServicesMap?: Map<number, CustomServiceCheckIn[]>;
  moduleColorMap?: Map<string, string>;
  showCustomServices?: boolean;
}

type TimeFrame = "1week" | "2weeks";
type DragKind = "resize-start" | "resize-end" | "move";

const ROOM_COL_WIDTH = 180;

// "2026-04-30" → "Apr 30" (parsed in local time to avoid TZ drift).
function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split("-").map(Number);
  const [y2, m2, d2] = checkOut.split("-").map(Number);
  if (!y1 || !y2) return 0;
  const start = new Date(y1, m1 - 1, d1).getTime();
  const end = new Date(y2, m2 - 1, d2).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

export function KennelCalendarView({
  kennels,
  categories,
  facilityName = "Facility",
  rateSuffix = "/night",
  disableResize = false,
  onAddBooking,
  onUpdateBooking,
  onMoveBooking,
  customServicesMap,
  moduleColorMap,
  showCustomServices,
}: KennelCalendarViewProps) {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date()));
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("2weeks");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [filters, setFilters] = useState<CalendarFilterState>(
    DEFAULT_FILTER_STATE,
  );
  const [selectedBooking, setSelectedBooking] = useState<OccupancyKennel | null>(
    null,
  );
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [blockDialog, setBlockDialog] = useState<{
    roomId: string;
    roomName: string;
    date: string;
  } | null>(null);

  // Unified drag state — covers resize and move.
  const [drag, setDrag] = useState<{
    kind: DragKind;
    bookingId?: number;
    sourceRoomId: string;
    petName: string;
    initialCheckIn: string;
    initialCheckOut: string;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    roomId: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [pendingMove, setPendingMove] = useState<{
    bookingId: number;
    petName: string;
    fromRoomId: string;
    fromRoomName: string;
    toRoomId: string;
    toRoomName: string;
  } | null>(null);
  const [pendingResize, setPendingResize] = useState<{
    kennelId: string;
    petName: string;
    oldCheckIn: string;
    oldCheckOut: string;
    newCheckIn: string;
    newCheckOut: string;
  } | null>(null);
  const [staffInitials, setStaffInitials] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const numDays = timeFrame === "1week" ? 7 : 14;

  const dates = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [startDate, numDays]);

  const todayStr = toLocalISODate(new Date());
  const isPastWeek = checkPastWeek(dates[dates.length - 1], new Date());

  // Apply filters to kennels
  const filteredKennels = useMemo(() => {
    return kennels.filter((k) => {
      if (
        filters.categoryIds.length > 0 &&
        !filters.categoryIds.includes(k.categoryId)
      ) {
        return false;
      }
      if (filters.bookingStatuses.length > 0) {
        if (!k.bookingStatus) return false;
        if (!filters.bookingStatuses.includes(k.bookingStatus)) return false;
      }
      if (
        filters.petSizes.length > 0 &&
        (!k.petSize || !filters.petSizes.includes(k.petSize))
      ) {
        return false;
      }
      if (
        filters.species.length > 0 &&
        (!k.petSpecies || !filters.species.includes(k.petSpecies))
      ) {
        return false;
      }
      return true;
    });
  }, [kennels, filters]);

  const groupedKennels = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        rooms: filteredKennels.filter((k) => k.categoryId === cat.id),
      }))
      .filter((g) => g.rooms.length > 0);
  }, [categories, filteredKennels]);

  // Per-day occupancy across the visible roster (excludes blocked rooms)
  const dayOccupancy = useMemo(() => {
    return dates.map((date) => {
      const ds = toLocalISODate(date);
      const totalRooms = filteredKennels.filter(
        (k) => !isRoomBlockedOnDate(blocks, k.id, ds),
      ).length;
      if (totalRooms === 0) return 0;
      const occupied = filteredKennels.filter((k) => {
        if (!k.checkIn || !k.checkOut) return false;
        return ds >= k.checkIn && ds <= k.checkOut;
      }).length;
      return Math.round((occupied / totalRooms) * 100);
    });
  }, [filteredKennels, dates, blocks]);

  // Per-category occupancy across visible range
  const categoryOccupancy = useMemo(() => {
    const map = new Map<string, number>();
    const rangeStart = toLocalISODate(dates[0]);
    const rangeEnd = toLocalISODate(dates[dates.length - 1]);
    groupedKennels.forEach(({ category, rooms }) => {
      const eligibleRooms = rooms.filter(
        (r) =>
          !blocks.some(
            (b) =>
              b.roomId === r.id &&
              dateRangesOverlap(rangeStart, rangeEnd, b.startDate, b.endDate),
          ),
      );
      const occupiedRooms = eligibleRooms.filter((room) => {
        if (!room.checkIn || !room.checkOut) return false;
        return room.checkOut >= rangeStart && room.checkIn <= rangeEnd;
      }).length;
      const total = eligibleRooms.length;
      map.set(
        category.id,
        total > 0 ? Math.round((occupiedRooms / total) * 100) : 0,
      );
    });
    return map;
  }, [groupedKennels, dates, blocks]);

  // Today's arrivals and departures
  const arrivalsToday = useMemo(
    () =>
      filteredKennels.filter((k) => k.checkIn === todayStr).length,
    [filteredKennels, todayStr],
  );
  const departuresToday = useMemo(
    () =>
      filteredKennels.filter((k) => k.checkOut === todayStr).length,
    [filteredKennels, todayStr],
  );

  const handlePrevious = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - numDays);
    setStartDate(newDate);
  };
  const handleNext = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + numDays);
    setStartDate(newDate);
  };
  const handleToday = () => setStartDate(startOfWeek(new Date()));
  const handleJumpToDate = (iso: string) => {
    if (!iso) return;
    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) return;
    setStartDate(startOfWeek(target));
  };

  const formatDateRange = () => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + numDays - 1);
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    return `${fmt(startDate)} - ${fmt(endDate)}/${endDate.getFullYear()}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const calculateBookingPosition = (
    booking: { checkIn: string; checkOut: string },
  ): { startCol: number; span: number } | null => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const rangeStart = startOfDay(dates[0]);
    const rangeEnd = startOfDay(dates[dates.length - 1]);

    if (checkOut < rangeStart || checkIn > rangeEnd) return null;

    let startCol = 0;
    if (checkIn >= rangeStart) {
      startCol = Math.floor(
        (checkIn.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    let endCol = dates.length - 1;
    if (checkOut <= rangeEnd) {
      endCol = Math.floor(
        (checkOut.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    return { startCol, span: endCol - startCol + 1 };
  };

  /**
   * Resolves the date column under the cursor relative to the grid, used for
   * resize. Each cell is a fraction of the grid width minus the room column.
   */
  const getDateFromPosition = useCallback(
    (clientX: number): string | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left - ROOM_COL_WIDTH;
      const cellWidth = (rect.width - ROOM_COL_WIDTH) / dates.length;
      const dateIndex = Math.floor(relativeX / cellWidth);
      if (dateIndex < 0 || dateIndex >= dates.length) return null;
      return toLocalISODate(dates[dateIndex]);
    },
    [dates],
  );

  const startResize = useCallback(
    (
      booking: OccupancyKennel,
      edge: "start" | "end",
      e: React.MouseEvent,
    ) => {
      if (isPastWeek || !booking.checkIn || !booking.checkOut) return;
      e.preventDefault();
      e.stopPropagation();
      setDrag({
        kind: edge === "start" ? "resize-start" : "resize-end",
        bookingId: booking.bookingId,
        sourceRoomId: booking.id,
        petName: booking.petName ?? "",
        initialCheckIn: booking.checkIn,
        initialCheckOut: booking.checkOut,
      });
      setDragPreview({
        roomId: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
      });
      setTooltipPos({ x: e.clientX, y: e.clientY });
    },
    [isPastWeek],
  );

  const startMove = useCallback(
    (booking: OccupancyKennel, e: React.MouseEvent) => {
      if (isPastWeek || !booking.checkIn || !booking.checkOut) return;
      e.preventDefault();
      e.stopPropagation();
      setDrag({
        kind: "move",
        bookingId: booking.bookingId,
        sourceRoomId: booking.id,
        petName: booking.petName ?? "",
        initialCheckIn: booking.checkIn,
        initialCheckOut: booking.checkOut,
      });
      setDragPreview({
        roomId: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
      });
      setTooltipPos({ x: e.clientX, y: e.clientY });
    },
    [isPastWeek],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag || !dragPreview) return;
      setTooltipPos({ x: e.clientX, y: e.clientY });

      if (drag.kind === "resize-start" || drag.kind === "resize-end") {
        const newDate = getDateFromPosition(e.clientX);
        if (!newDate) return;
        if (drag.kind === "resize-start" && newDate < dragPreview.checkOut) {
          setDragPreview((prev) =>
            prev ? { ...prev, checkIn: newDate } : null,
          );
        } else if (
          drag.kind === "resize-end" &&
          newDate > dragPreview.checkIn
        ) {
          setDragPreview((prev) =>
            prev ? { ...prev, checkOut: newDate } : null,
          );
        }
        return;
      }

      // move: figure out which room row the cursor is over
      const target = e.target as HTMLElement;
      const roomRow = target.closest<HTMLElement>("[data-room-row]");
      if (roomRow?.dataset.roomId) {
        setDragPreview((prev) =>
          prev ? { ...prev, roomId: roomRow.dataset.roomId! } : null,
        );
      }
    },
    [drag, dragPreview, getDateFromPosition],
  );

  const endDrag = useCallback(() => {
    if (!drag || !dragPreview) {
      setDrag(null);
      setDragPreview(null);
      setTooltipPos(null);
      return;
    }

    if (drag.kind === "resize-start" || drag.kind === "resize-end") {
      const datesChanged =
        dragPreview.checkIn !== drag.initialCheckIn ||
        dragPreview.checkOut !== drag.initialCheckOut;
      if (datesChanged) {
        setPendingResize({
          kennelId: drag.sourceRoomId,
          petName: drag.petName,
          oldCheckIn: drag.initialCheckIn,
          oldCheckOut: drag.initialCheckOut,
          newCheckIn: dragPreview.checkIn,
          newCheckOut: dragPreview.checkOut,
        });
      }
    } else if (
      drag.kind === "move" &&
      dragPreview.roomId !== drag.sourceRoomId &&
      drag.bookingId !== undefined
    ) {
      const conflict = detectMoveConflict(
        kennels,
        blocks,
        drag.bookingId,
        dragPreview.roomId,
        dragPreview.checkIn,
        dragPreview.checkOut,
      );
      if (!conflict) {
        const fromRoom = kennels.find((k) => k.id === drag.sourceRoomId);
        const toRoom = kennels.find((k) => k.id === dragPreview.roomId);
        setPendingMove({
          bookingId: drag.bookingId,
          petName: drag.petName,
          fromRoomId: drag.sourceRoomId,
          fromRoomName: fromRoom?.name ?? drag.sourceRoomId,
          toRoomId: dragPreview.roomId,
          toRoomName: toRoom?.name ?? dragPreview.roomId,
        });
      }
    }
    setDrag(null);
    setDragPreview(null);
    setTooltipPos(null);
  }, [drag, dragPreview, kennels, blocks]);

  // Global mouseup so a drag finishes even if the cursor leaves the grid.
  useEffect(() => {
    if (!drag) return;
    const handler = () => endDrag();
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, [drag, endDrag]);

  const handleAddBookingForCell = (kennelId: string, date: string) => {
    if (isPastWeek) return;
    onAddBooking?.(kennelId, date);
  };

  const handleConfirmBlock = (start: string, end: string, reason: string) => {
    if (!blockDialog) return;
    setBlocks((prev) => [
      ...prev,
      {
        id: `blk-${Date.now()}`,
        roomId: blockDialog.roomId,
        startDate: start,
        endDate: end,
        reason,
        createdAt: new Date().toISOString(),
      },
    ]);
    setBlockDialog(null);
  };

  const handleUnblockRoomDate = (roomId: string, date: string) => {
    setBlocks((prev) =>
      prev.filter(
        (b) =>
          !(
            b.roomId === roomId &&
            date >= b.startDate &&
            date <= b.endDate
          ),
      ),
    );
  };

  const tooltipDate =
    drag && dragPreview
      ? drag.kind === "resize-end"
        ? dragPreview.checkOut
        : drag.kind === "resize-start"
          ? dragPreview.checkIn
          : `${dragPreview.checkIn} → ${dragPreview.checkOut}`
      : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <CalendarFilters
        state={filters}
        categories={categories}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTER_STATE)}
      />

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium">
            {formatDateRange()}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <WeekPicker
            value={toLocalISODate(startDate)}
            onValueChange={handleJumpToDate}
            className="w-[180px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border">
            <Button
              variant={timeFrame === "1week" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setTimeFrame("1week")}
            >
              Week
            </Button>
            <Button
              variant={timeFrame === "2weeks" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setTimeFrame("2weeks")}
            >
              2 Weeks
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              printOccupancyGrid({
                startDate,
                numDays,
                facilityName,
                groupedKennels,
              })
            }
          >
            <Printer className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Read-only banner */}
      {isPastWeek && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <Lock className="size-4" />
          Viewing a past week — read only. You can open bookings to view
          details, but drag and edit are disabled.
        </div>
      )}

      {/* Calendar Grid */}
      <div
        className="overflow-hidden rounded-lg border"
        ref={gridRef}
        onMouseMove={drag ? handlePointerMove : undefined}
      >
        {/* Arrivals/Departures strip */}
        <ArrivalsDeparturesStrip
          arrivalsCount={arrivalsToday}
          departuresCount={departuresToday}
          focus={filters.arrivalDepartureFocus}
          onFocusChange={(focus) =>
            setFilters((prev) => ({ ...prev, arrivalDepartureFocus: focus }))
          }
        />

        <div className="overflow-x-auto select-none">
          <div className="min-w-[900px]">
            {/* Date Header */}
            <div className="bg-muted/30 sticky top-0 z-10 flex border-b">
              <div className="w-[180px] min-w-[180px] shrink-0 border-r p-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Room
              </div>
              {dates.map((date, i) => {
                const dayName = date.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const dayNum = date.getDate();
                const isTodayDate = isToday(date);
                const occ = dayOccupancy[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-w-[64px] flex-1 border-r p-2 text-center last:border-r-0",
                      isTodayDate && "bg-primary/10",
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        isTodayDate
                          ? "text-primary"
                          : "text-foreground",
                      )}
                    >
                      {dayNum}
                    </div>
                    <div
                      className={cn(
                        "text-[11px]",
                        isTodayDate
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {dayName} {occ}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category Groups */}
            {groupedKennels.map(({ category, rooms }) => {
              const collapsed = collapsedCategories.has(category.id);
              const occupancy = categoryOccupancy.get(category.id) ?? 0;
              return (
                <div key={category.id}>
                  {/* Category Header Row */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="bg-muted/70 hover:bg-muted flex w-full items-center gap-2 border-y px-3 py-3 text-left"
                  >
                    {collapsed ? (
                      <ChevronRight className="size-5 shrink-0" />
                    ) : (
                      <ChevronDown className="size-5 shrink-0" />
                    )}
                    <span className="text-base font-bold tracking-tight">
                      {category.name}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium">
                      {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
                    </span>
                    <span className="ml-auto flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Occupancy</span>
                      <span
                        className={cn(
                          "font-semibold",
                          occupancy >= 80
                            ? "text-red-600"
                            : occupancy >= 50
                              ? "text-amber-600"
                              : "text-emerald-600",
                        )}
                      >
                        {occupancy}%
                      </span>
                    </span>
                  </button>

                  {!collapsed &&
                    rooms.map((kennel) => {
                      const isMaint = kennel.status === "maintenance";
                      const isDropTarget =
                        drag?.kind === "move" &&
                        dragPreview?.roomId === kennel.id;
                      const dropConflict = isDropTarget
                        ? detectMoveConflict(
                            kennels,
                            blocks,
                            drag.bookingId,
                            kennel.id,
                            dragPreview!.checkIn,
                            dragPreview!.checkOut,
                          )
                        : false;

                      return (
                        <div
                          key={kennel.id}
                          data-room-row
                          data-room-id={kennel.id}
                          className="flex border-b last:border-b-0"
                        >
                          {/* Room label */}
                          <div className="w-[180px] min-w-[180px] shrink-0 border-r p-2 pl-9">
                            <div className="text-muted-foreground text-xs font-normal">
                              {kennel.name}
                            </div>
                            <div className="text-muted-foreground/70 text-[11px]">
                              ${kennel.dailyRate}
                              {rateSuffix}
                            </div>
                          </div>

                          {/* Date cells with bookings */}
                          <div className="relative flex-1">
                            <div className={cn("grid", gridCols(numDays))}>
                              {dates.map((date, i) => {
                                const isTodayDate = isToday(date);
                                const dateStr = toLocalISODate(date);
                                const block = isRoomBlockedOnDate(
                                  blocks,
                                  kennel.id,
                                  dateStr,
                                );

                                return (
                                  <div key={i} className="relative min-w-[64px]">
                                    <RoomCell
                                      date={dateStr}
                                      dateLabel={date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                      roomName={kennel.name}
                                      isToday={isTodayDate}
                                      isPastWeek={isPastWeek}
                                      isMaintenance={isMaint}
                                      isBlocked={!!block}
                                      blockedReason={block?.reason}
                                      onAddBooking={() =>
                                        handleAddBookingForCell(kennel.id, dateStr)
                                      }
                                      onBlockRoom={() =>
                                        setBlockDialog({
                                          roomId: kennel.id,
                                          roomName: kennel.name,
                                          date: dateStr,
                                        })
                                      }
                                      onUnblockRoom={() =>
                                        handleUnblockRoomDate(kennel.id, dateStr)
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Bars layer — same grid as cells, overlaid on top.
                                Bars use col-start/col-span Tailwind classes — no inline styles. */}
                            <div
                              className={cn(
                                "pointer-events-none absolute inset-0 grid",
                                gridCols(numDays),
                              )}
                            >
                              {/* Maintenance overlay bar */}
                              {isMaint && (
                                <div
                                  className={cn(
                                    "pointer-events-none my-1.5 mx-0.5 flex items-center gap-2 rounded-sm border-l-4 border-l-red-500 bg-red-100 px-2 dark:bg-red-900/30",
                                    colStart(1),
                                    colSpan(numDays),
                                  )}
                                >
                                  <span className="text-xs font-medium text-red-800 dark:text-red-200">
                                    Under Maintenance
                                  </span>
                                </div>
                              )}

                              {/* Booking bar */}
                              {!isMaint && kennel.checkIn && kennel.checkOut && kennel.petName && (
                              (() => {
                                const displayBooking =
                                  dragPreview &&
                                  drag &&
                                  drag.sourceRoomId === kennel.id
                                    ? {
                                        checkIn: dragPreview.checkIn,
                                        checkOut: dragPreview.checkOut,
                                      }
                                    : {
                                        checkIn: kennel.checkIn,
                                        checkOut: kennel.checkOut,
                                      };
                                const pos = calculateBookingPosition(displayBooking);
                                if (!pos) return null;
                                const isMoveDragging =
                                  drag?.kind === "move" &&
                                  drag.sourceRoomId === kennel.id;
                                if (
                                  isMoveDragging &&
                                  dragPreview &&
                                  dragPreview.roomId !== kennel.id
                                ) {
                                  // Source row — fade the bar so the user sees it's being relocated
                                  return (
                                    <BookingBar
                                      booking={kennel}
                                      startCol={pos.startCol}
                                      span={pos.span}
                                      isGhost
                                      isPastWeek={isPastWeek}
                                      customServices={
                                        kennel.petId
                                          ? customServicesMap?.get(kennel.petId)
                                          : undefined
                                      }
                                      moduleColorMap={moduleColorMap}
                                      showCustomServices={showCustomServices}
                                    />
                                  );
                                }
                                return (
                                  <BookingBar
                                    booking={kennel}
                                    startCol={pos.startCol}
                                    span={pos.span}
                                    isDragging={
                                      drag?.sourceRoomId === kennel.id
                                    }
                                    isPastWeek={isPastWeek}
                                    hideResizeHandles={disableResize}
                                    arrivalGlow={
                                      filters.arrivalDepartureFocus ===
                                        "arrivals" &&
                                      kennel.checkIn === todayStr
                                    }
                                    departureGlow={
                                      filters.arrivalDepartureFocus ===
                                        "departures" &&
                                      kennel.checkOut === todayStr
                                    }
                                    customServices={
                                      kennel.petId
                                        ? customServicesMap?.get(kennel.petId)
                                        : undefined
                                    }
                                    moduleColorMap={moduleColorMap}
                                    showCustomServices={showCustomServices}
                                    onClick={() => setSelectedBooking(kennel)}
                                    onMoveStart={(e) => startMove(kennel, e)}
                                    onResizeStart={(edge, e) =>
                                      startResize(kennel, edge, e)
                                    }
                                  />
                                );
                              })()
                            )}

                            {/* Subtle ghost preview at the proposed drop spot */}
                            {drag?.kind === "move" &&
                              dragPreview?.roomId === kennel.id &&
                              drag.sourceRoomId !== kennel.id &&
                              (() => {
                                const sourceKennel = kennels.find(
                                  (k) => k.id === drag.sourceRoomId,
                                );
                                const pos = calculateBookingPosition({
                                  checkIn: dragPreview.checkIn,
                                  checkOut: dragPreview.checkOut,
                                });
                                if (!pos) return null;
                                return (
                                  <div
                                    className={cn(
                                      "pointer-events-none z-20 my-1.5 mx-0.5 flex h-12 items-center gap-2.5 overflow-hidden rounded-lg border border-dashed bg-background/50 px-2 backdrop-blur-sm",
                                      colStart(pos.startCol + 1),
                                      colSpan(pos.span),
                                      dropConflict
                                        ? "border-red-400/80"
                                        : "border-foreground/30",
                                    )}
                                  >
                                    {sourceKennel?.petPhotoUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={sourceKennel.petPhotoUrl}
                                        alt=""
                                        width={40}
                                        height={40}
                                        className="size-10 shrink-0 rounded-full object-cover opacity-60"
                                      />
                                    ) : null}
                                    <span
                                      className={cn(
                                        "truncate text-sm font-medium",
                                        dropConflict
                                          ? "text-red-600 dark:text-red-300"
                                          : "text-foreground/70",
                                      )}
                                    >
                                      {dropConflict
                                        ? "Can't drop here"
                                        : (sourceKennel?.petName ?? drag.petName)}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drag tooltip */}
      {drag && tooltipDate && tooltipPos && (
        <div
          className="bg-foreground text-background pointer-events-none fixed z-50 rounded-md px-2 py-1 text-xs shadow-lg"
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 28,
          }}
        >
          {drag.kind === "move"
            ? `Moving ${drag.petName}`
            : drag.kind === "resize-end"
              ? `→ ${tooltipDate}`
              : `← ${tooltipDate}`}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/30" />
          <span className="text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/30" />
          <span className="text-muted-foreground">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" />
          <span className="text-muted-foreground">Checked-in</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm border-l-4 border-l-slate-400 bg-slate-100 dark:bg-slate-800/40" />
          <span className="text-muted-foreground">Checked-out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20" />
          <span className="text-muted-foreground">Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.3)_0,rgba(239,68,68,0.3)_3px,transparent_3px,transparent_6px)]" />
          <span className="text-muted-foreground">Blocked</span>
        </div>
      </div>

      {/* Booking details side panel */}
      <BookingDetailsSheet
        booking={selectedBooking}
        isPastWeek={isPastWeek}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        onCheckIn={(id) => console.log("check-in", id)}
        onCheckOut={(id) => console.log("check-out", id)}
        onEdit={() => setSelectedBooking(null)}
      />

      {/* Block-room dialog */}
      <BlockRoomDialog
        open={blockDialog !== null}
        roomName={blockDialog?.roomName ?? ""}
        initialDate={blockDialog?.date ?? toLocalISODate(new Date())}
        onOpenChange={(open) => !open && setBlockDialog(null)}
        onConfirm={handleConfirmBlock}
      />

      {/* Move-booking confirmation */}
      <AlertDialog
        open={pendingMove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMove(null);
            setStaffInitials("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move pet to another room?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMove && (
                <>
                  You&apos;re about to move{" "}
                  <span className="text-foreground font-semibold">
                    {pendingMove.petName || "this pet"}
                  </span>{" "}
                  from{" "}
                  <span className="text-foreground font-semibold">
                    {pendingMove.fromRoomName}
                  </span>{" "}
                  to{" "}
                  <span className="text-foreground font-semibold">
                    {pendingMove.toRoomName}
                  </span>
                  .
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="move-staff-initials">Your initials</Label>
            <Input
              id="move-staff-initials"
              value={staffInitials}
              onChange={(e) =>
                setStaffInitials(e.target.value.toUpperCase().slice(0, 4))
              }
              placeholder="e.g. JD"
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              Required so we can track who moved this pet.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!staffInitials.trim()}
              onClick={() => {
                const initials = staffInitials.trim();
                if (pendingMove && initials) {
                  onMoveBooking?.(
                    pendingMove.bookingId,
                    pendingMove.fromRoomId,
                    pendingMove.toRoomId,
                    initials,
                  );
                }
                setPendingMove(null);
                setStaffInitials("");
              }}
            >
              Move pet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resize-booking confirmation */}
      <AlertDialog
        open={pendingResize !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingResize(null);
            setStaffInitials("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingResize
                ? `Update ${pendingResize.petName || "this pet"}'s stay?`
                : "Update stay?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirm the new check-in and check-out dates for this booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingResize &&
            (() => {
              const oldNights = nightsBetween(
                pendingResize.oldCheckIn,
                pendingResize.oldCheckOut,
              );
              const newNights = nightsBetween(
                pendingResize.newCheckIn,
                pendingResize.newCheckOut,
              );
              const diff = newNights - oldNights;
              return (
                <div className="bg-muted/40 space-y-1 rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Was</span>
                    <span className="font-medium">
                      {formatShortDate(pendingResize.oldCheckIn)} →{" "}
                      {formatShortDate(pendingResize.oldCheckOut)}
                      <span className="text-muted-foreground ml-2 font-normal">
                        ({oldNights} {oldNights === 1 ? "night" : "nights"})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">New</span>
                    <span className="font-medium">
                      {formatShortDate(pendingResize.newCheckIn)} →{" "}
                      {formatShortDate(pendingResize.newCheckOut)}
                      <span className="text-muted-foreground ml-2 font-normal">
                        ({newNights} {newNights === 1 ? "night" : "nights"})
                      </span>
                    </span>
                  </div>
                  {diff !== 0 && (
                    <div className="flex justify-end pt-1">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          diff > 0 ? "text-emerald-600" : "text-amber-600",
                        )}
                      >
                        {diff > 0 ? `+${diff}` : diff}{" "}
                        {Math.abs(diff) === 1 ? "night" : "nights"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          <div className="space-y-2">
            <Label htmlFor="resize-staff-initials">Your initials</Label>
            <Input
              id="resize-staff-initials"
              value={staffInitials}
              onChange={(e) =>
                setStaffInitials(e.target.value.toUpperCase().slice(0, 4))
              }
              placeholder="e.g. JD"
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              Required so we can track who changed this stay.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!staffInitials.trim()}
              onClick={() => {
                const initials = staffInitials.trim();
                if (pendingResize && initials) {
                  onUpdateBooking?.(
                    pendingResize.kennelId,
                    pendingResize.newCheckIn,
                    pendingResize.newCheckOut,
                    initials,
                  );
                }
                setPendingResize(null);
                setStaffInitials("");
              }}
            >
              Save changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
