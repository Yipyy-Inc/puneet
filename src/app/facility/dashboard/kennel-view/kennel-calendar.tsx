"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

type KennelStatus = "vacant" | "occupied" | "reserved" | "maintenance";

interface Kennel {
  id: string;
  name: string;
  type: "standard" | "large" | "suite" | "luxury";
  status: KennelStatus;
  bookingId?: number;
  petName?: string;
  petType?: "dog" | "cat";
  clientName?: string;
  clientPhone?: string;
  checkIn?: string;
  checkOut?: string;
  dailyRate: number;
}

interface KennelBooking {
  kennelId: string;
  petName: string;
  petType?: "dog" | "cat";
  clientName?: string;
  checkIn: string;
  checkOut: string;
  status: "occupied" | "reserved";
}

interface KennelCalendarViewProps {
  kennels: Kennel[];
  onKennelClick?: (kennel: Kennel) => void;
  onAddBooking?: (kennelId: string, date: string) => void;
  onUpdateBooking?: (
    kennelId: string,
    checkIn: string,
    checkOut: string,
  ) => void;
}

type TimeFrame = "1week" | "2weeks";

export function KennelCalendarView({
  kennels,
  onKennelClick,
  onAddBooking,
  onUpdateBooking,
}: KennelCalendarViewProps) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("2weeks");
  const [filterType, setFilterType] = useState<string>("all");

  // Drag state for resizing
  const [dragging, setDragging] = useState<{
    kennelId: string;
    edge: "start" | "end";
    initialX: number;
    initialDate: string;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    kennelId: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);
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

  const bookings = useMemo(() => {
    const result: KennelBooking[] = [];
    kennels.forEach((k) => {
      if (
        (k.status === "occupied" || k.status === "reserved") &&
        k.checkIn &&
        k.checkOut &&
        k.petName
      ) {
        result.push({
          kennelId: k.id,
          petName: k.petName,
          petType: k.petType,
          clientName: k.clientName,
          checkIn: k.checkIn,
          checkOut: k.checkOut,
          status: k.status,
        });
      }
    });
    return result;
  }, [kennels]);

  const filteredKennels = useMemo(() => {
    if (filterType === "all") return kennels;
    return kennels.filter((k) => k.type === filterType);
  }, [kennels, filterType]);

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

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    setStartDate(new Date(today.setDate(diff)));
  };

  const formatDateRange = () => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + numDays - 1);

    const startMonth = startDate.toLocaleDateString("en-US", {
      month: "2-digit",
    });
    const startDay = startDate.getDate().toString().padStart(2, "0");
    const endMonth = endDate.toLocaleDateString("en-US", { month: "2-digit" });
    const endDay = endDate.getDate().toString().padStart(2, "0");
    const endYear = endDate.getFullYear();

    return `${startMonth}/${startDay} - ${endMonth}/${endDay}/${endYear}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getBookingsForKennel = (kennelId: string) => {
    return bookings.filter((b) => b.kennelId === kennelId);
  };

  const getTypeLabel = (type: Kennel["type"]) => {
    switch (type) {
      case "standard":
        return "Standard room";
      case "large":
        return "Large room";
      case "suite":
        return "Suite";
      case "luxury":
        return "Luxury Suite";
    }
  };

  const calculateBookingPosition = (
    booking: KennelBooking,
    dates: Date[],
  ): { startCol: number; span: number } | null => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const rangeStart = dates[0];
    const rangeEnd = dates[dates.length - 1];

    // Check if booking overlaps with current date range
    if (checkOut < rangeStart || checkIn > rangeEnd) {
      return null;
    }

    // Calculate start column
    let startCol = 0;
    if (checkIn >= rangeStart) {
      startCol = Math.floor(
        (checkIn.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // Calculate end column
    let endCol = dates.length - 1;
    if (checkOut <= rangeEnd) {
      endCol = Math.floor(
        (checkOut.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    const span = endCol - startCol + 1;

    return { startCol, span };
  };

  const getDateFromPosition = useCallback(
    (clientX: number, containerRect: DOMRect): string | null => {
      const relativeX = clientX - containerRect.left - 140; // subtract kennel column width
      const cellWidth = (containerRect.width - 140) / dates.length;
      const dateIndex = Math.floor(relativeX / cellWidth);

      if (dateIndex >= 0 && dateIndex < dates.length) {
        return dates[dateIndex].toISOString().split("T")[0];
      }
      return null;
    },
    [dates],
  );

  const handleDragStart = useCallback(
    (
      e: React.MouseEvent,
      kennelId: string,
      edge: "start" | "end",
      currentDate: string,
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const kennel = kennels.find((k) => k.id === kennelId);
      if (!kennel || !kennel.checkIn || !kennel.checkOut) return;

      setDragging({
        kennelId,
        edge,
        initialX: e.clientX,
        initialDate: currentDate,
      });
      setDragPreview({
        kennelId,
        checkIn: kennel.checkIn,
        checkOut: kennel.checkOut,
      });
    },
    [kennels],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !gridRef.current || !dragPreview) return;

      const containerRect = gridRef.current.getBoundingClientRect();
      const newDate = getDateFromPosition(e.clientX, containerRect);

      if (!newDate) return;

      const kennel = kennels.find((k) => k.id === dragging.kennelId);
      if (!kennel || !kennel.checkIn || !kennel.checkOut) return;

      if (dragging.edge === "start") {
        // Don't allow start to go past end
        if (newDate < dragPreview.checkOut) {
          setDragPreview((prev) =>
            prev ? { ...prev, checkIn: newDate } : null,
          );
        }
      } else {
        // Don't allow end to go before start
        if (newDate > dragPreview.checkIn) {
          setDragPreview((prev) =>
            prev ? { ...prev, checkOut: newDate } : null,
          );
        }
      }
    },
    [dragging, dragPreview, kennels, getDateFromPosition],
  );

  const handleDragEnd = useCallback(() => {
    if (dragging && dragPreview && onUpdateBooking) {
      onUpdateBooking(
        dragging.kennelId,
        dragPreview.checkIn,
        dragPreview.checkOut,
      );
    }
    setDragging(null);
    setDragPreview(null);
  }, [dragging, dragPreview, onUpdateBooking]);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[180px] text-center">
            {formatDateRange()}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All lodgings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lodgings</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="suite">Suite</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border overflow-hidden">
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
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className="border rounded-lg overflow-hidden"
        ref={gridRef}
        onMouseMove={dragging ? handleDragMove : undefined}
        onMouseUp={dragging ? handleDragEnd : undefined}
        onMouseLeave={dragging ? handleDragEnd : undefined}
      >
        <div className="overflow-x-auto select-none">
          <div className="min-w-[800px]">
            {/* Date Header */}
            <div className="flex border-b bg-muted/30">
              <div className="w-[140px] min-w-[140px] p-2 border-r shrink-0" />
              {dates.map((date, i) => {
                const dayName = date.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const dayNum = date.getDate();
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 text-center p-2 min-w-[60px]",
                      isTodayDate && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs",
                        isTodayDate
                          ? "text-primary font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {dayNum}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        isTodayDate
                          ? "text-primary font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {dayName}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Kennel Rows */}
            {filteredKennels.map((kennel) => {
              const kennelBookings = getBookingsForKennel(kennel.id);

              return (
                <div key={kennel.id} className="flex border-b last:border-b-0">
                  {/* Kennel Info */}
                  <div
                    className="w-[140px] min-w-[140px] p-2 border-r shrink-0 cursor-pointer hover:bg-muted/50"
                    onClick={() => onKennelClick?.(kennel)}
                  >
                    <div className="font-medium text-sm">{kennel.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getTypeLabel(kennel.type)}
                    </div>
                  </div>

                  {/* Date Cells with Bookings */}
                  <div className="flex-1 relative">
                    {/* Grid Cells */}
                    <div className="flex">
                      {dates.map((date, i) => {
                        const isTodayDate = isToday(date);
                        const dateStr = date.toISOString().split("T")[0];
                        const isMaintenance = kennel.status === "maintenance";

                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 min-h-[60px] min-w-[60px] group",
                              isTodayDate && "bg-primary/5",
                              isMaintenance
                                ? "bg-red-50 dark:bg-red-950/20 cursor-not-allowed"
                                : "cursor-pointer hover:bg-muted/30",
                            )}
                            data-index={i}
                            onClick={() =>
                              !isMaintenance &&
                              onAddBooking?.(kennel.id, dateStr)
                            }
                          >
                            {!isMaintenance && (
                              <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background border rounded px-2 py-1 shadow-sm">
                                  <Plus className="h-3 w-3" />
                                  Add
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Maintenance Bar */}
                    {kennel.status === "maintenance" && (
                      <div
                        className="absolute top-2 h-10 rounded flex items-center gap-2 px-2 bg-red-100 dark:bg-red-900/30 border-l-4 border-l-red-500"
                        style={{
                          left: 2,
                          right: 2,
                        }}
                      >
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">
                          Under Maintenance
                        </span>
                      </div>
                    )}

                    {/* Booking Bars (positioned absolutely using percentages) */}
                    {kennelBookings.map((booking, bIndex) => {
                      // Use drag preview if this is the booking being dragged
                      const displayBooking =
                        dragPreview && dragPreview.kennelId === booking.kennelId
                          ? {
                              ...booking,
                              checkIn: dragPreview.checkIn,
                              checkOut: dragPreview.checkOut,
                            }
                          : booking;

                      const position = calculateBookingPosition(
                        displayBooking,
                        dates,
                      );
                      if (!position) return null;

                      const { startCol, span } = position;
                      const leftPercent = (startCol / dates.length) * 100;
                      const widthPercent = (span / dates.length) * 100;

                      const isReserved = booking.status === "reserved";
                      const isDragging =
                        dragging?.kennelId === booking.kennelId;

                      return (
                        <div
                          key={`${booking.kennelId}-${bIndex}`}
                          className={cn(
                            "absolute top-2 h-10 rounded flex items-center gap-2 px-2 cursor-pointer transition-shadow hover:shadow-md group",
                            isReserved
                              ? "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-l-yellow-500"
                              : "bg-blue-100 dark:bg-blue-900/30",
                            isDragging && "shadow-lg ring-2 ring-primary/50",
                          )}
                          style={{
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                            transition: isDragging ? "none" : undefined,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const k = kennels.find(
                              (k) => k.id === booking.kennelId,
                            );
                            if (k) onKennelClick?.(k);
                          }}
                        >
                          {/* Left drag handle */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 rounded-l transition-opacity"
                            onMouseDown={(e) =>
                              handleDragStart(
                                e,
                                booking.kennelId,
                                "start",
                                booking.checkIn,
                              )
                            }
                          />

                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <PawPrint className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              isReserved
                                ? "text-yellow-800 dark:text-yellow-200"
                                : "text-blue-800 dark:text-blue-200",
                            )}
                          >
                            {booking.petName}
                          </span>

                          {/* Right drag handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 rounded-r transition-opacity"
                            onMouseDown={(e) =>
                              handleDragStart(
                                e,
                                booking.kennelId,
                                "end",
                                booking.checkOut,
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30" />
          <span className="text-muted-foreground">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-l-yellow-500" />
          <span className="text-muted-foreground">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" />
          <span className="text-muted-foreground">Maintenance</span>
        </div>
      </div>
    </div>
  );
}
