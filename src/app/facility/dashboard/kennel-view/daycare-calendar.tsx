"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, PawPrint, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type DaycareSpotStatus = "available" | "occupied" | "reserved" | "maintenance";

export interface DaycareSpot {
  id: string;
  name: string;
  type: "small" | "medium" | "large" | "xlarge";
  status: DaycareSpotStatus;
  capacity: number;
  hourlyRate: number;
}

export interface DaycareReservation {
  id: string;
  spotId: string;
  petName: string;
  petType?: "dog" | "cat";
  clientName: string;
  clientPhone?: string;
  date: string;
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  status: "checked-in" | "reserved" | "checked-out";
}

interface DaycareCalendarViewProps {
  spots: DaycareSpot[];
  reservations: DaycareReservation[];
  onSpotClick?: (spot: DaycareSpot) => void;
  onAddReservation?: (spotId: string, date: string, hour: number) => void;
  onReservationClick?: (reservation: DaycareReservation) => void;
}

// Business hours: 6 AM to 8 PM
const BUSINESS_HOURS_START = 6;
const BUSINESS_HOURS_END = 20;
const HOURS = Array.from(
  { length: BUSINESS_HOURS_END - BUSINESS_HOURS_START },
  (_, i) => BUSINESS_HOURS_START + i,
);

export function DaycareCalendarView({
  spots,
  reservations,
  onAddReservation,
  onReservationClick,
}: DaycareCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedSpots, setExpandedSpots] = useState<Set<string>>(new Set());

  const toggleSpotExpanded = (spotId: string) => {
    setExpandedSpots((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        next.delete(spotId);
      } else {
        next.add(spotId);
      }
      return next;
    });
  };

  const dateStr = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const filteredSpots = useMemo(() => {
    if (filterType === "all") return spots;
    return spots.filter((s) => s.type === filterType);
  }, [spots, filterType]);

  const getReservationsForSpot = (spotId: string) => {
    return reservations.filter(
      (r) => r.spotId === spotId && r.date === dateStr,
    );
  };

  const getReservationsForHour = (spotId: string, hour: number) => {
    const spotReservations = getReservationsForSpot(spotId);
    return spotReservations.filter((r) => {
      const [startHour] = r.startTime.split(":").map(Number);
      const [endHour, endMin] = r.endTime.split(":").map(Number);
      const effectiveEndHour = endMin > 0 ? endHour : endHour - 1;
      return hour >= startHour && hour <= effectiveEndHour;
    });
  };

  const getStatusCounts = (spotId: string, hour: number) => {
    const hourReservations = getReservationsForHour(spotId, hour);
    return {
      checkedIn: hourReservations.filter((r) => r.status === "checked-in")
        .length,
      reserved: hourReservations.filter((r) => r.status === "reserved").length,
      checkedOut: hourReservations.filter((r) => r.status === "checked-out")
        .length,
      total: hourReservations.length,
    };
  };

  const handlePrevious = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}${period}`;
  };

  const getTypeLabel = (type: DaycareSpot["type"]) => {
    switch (type) {
      case "small":
        return "Small Dogs";
      case "medium":
        return "Medium Dogs";
      case "large":
        return "Large Dogs";
      case "xlarge":
        return "XL Dogs";
    }
  };

  const calculateReservationPosition = (
    reservation: DaycareReservation,
  ): { startCol: number; span: number } | null => {
    const [startHour] = reservation.startTime.split(":").map(Number);
    const [endHour, endMin] = reservation.endTime.split(":").map(Number);

    const effectiveEndHour = endMin > 0 ? endHour + 1 : endHour;

    if (startHour < BUSINESS_HOURS_START || startHour >= BUSINESS_HOURS_END) {
      return null;
    }

    const startCol = startHour - BUSINESS_HOURS_START;
    const endCol = Math.min(
      effectiveEndHour - BUSINESS_HOURS_START,
      HOURS.length,
    );
    const span = endCol - startCol;

    if (span <= 0) return null;

    return { startCol, span };
  };

  const getStatusColor = (status: DaycareReservation["status"]) => {
    switch (status) {
      case "checked-in":
        return "bg-blue-100 dark:bg-blue-900/30 border-l-blue-500";
      case "reserved":
        return "bg-yellow-100 dark:bg-yellow-900/30 border-l-yellow-500";
      case "checked-out":
        return "bg-gray-100 dark:bg-gray-900/30 border-l-gray-500";
    }
  };

  const getStatusTextColor = (status: DaycareReservation["status"]) => {
    switch (status) {
      case "checked-in":
        return "text-blue-800 dark:text-blue-200";
      case "reserved":
        return "text-yellow-800 dark:text-yellow-200";
      case "checked-out":
        return "text-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[280px] text-center">
            {formatDate(selectedDate)}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          {isToday(selectedDate) && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              <SelectItem value="small">Small Dogs</SelectItem>
              <SelectItem value="medium">Medium Dogs</SelectItem>
              <SelectItem value="large">Large Dogs</SelectItem>
              <SelectItem value="xlarge">XL Dogs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto select-none">
          <div className="min-w-[1200px]">
            {/* Time Header */}
            <div className="flex border-b bg-muted/30">
              <div className="w-40 min-w-40 p-2 border-r shrink-0 font-medium text-sm">
                Area / Time
              </div>
              {HOURS.map((hour) => {
                const now = new Date();
                const isCurrentHour =
                  isToday(selectedDate) && now.getHours() === hour;

                return (
                  <div
                    key={hour}
                    className={cn(
                      "flex-1 min-w-[70px] p-2 text-center text-sm font-medium border-r",
                      isCurrentHour && "bg-blue-100 dark:bg-blue-900/30",
                    )}
                  >
                    {formatHour(hour)}
                  </div>
                );
              })}
            </div>

            {/* Spot Rows */}
            {filteredSpots.map((spot) => {
              const spotReservations = getReservationsForSpot(spot.id);
              const isMaintenance = spot.status === "maintenance";
              const reservationCount = spotReservations.length;
              const isExpanded = expandedSpots.has(spot.id);
              const rowHeight = isExpanded
                ? Math.max(60, reservationCount * 32 + 16)
                : 60;

              return (
                <div key={spot.id} className="flex border-b last:border-b-0">
                  {/* Spot Info */}
                  <div
                    className={cn(
                      "w-40 min-w-40 p-2 border-r shrink-0 cursor-pointer hover:bg-muted/50 transition-colors flex flex-col justify-center",
                      isMaintenance && "bg-red-50 dark:bg-red-950/20",
                      isExpanded && "bg-muted/30",
                    )}
                    style={{ minHeight: rowHeight }}
                    onClick={() => toggleSpotExpanded(spot.id)}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "text-xs transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      >
                        ▶
                      </span>
                      <span className="font-medium text-sm">{spot.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4">
                      {getTypeLabel(spot.type)} • Cap: {spot.capacity}
                    </div>
                    {reservationCount > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 ml-4">
                        {reservationCount} pet{reservationCount > 1 ? "s" : ""}{" "}
                        today
                      </div>
                    )}
                  </div>

                  {/* Hour Cells with Reservations */}
                  <div className="flex-1 relative">
                    {/* Background cells */}
                    <div className="flex" style={{ minHeight: rowHeight }}>
                      {HOURS.map((hour) => {
                        const now = new Date();
                        const isCurrentHour =
                          isToday(selectedDate) && now.getHours() === hour;
                        const statusCounts = getStatusCounts(spot.id, hour);

                        return (
                          <div
                            key={hour}
                            className={cn(
                              "flex-1 min-w-[70px] border-r group relative",
                              isMaintenance
                                ? "bg-red-50/50 dark:bg-red-950/10 cursor-not-allowed"
                                : isCurrentHour
                                  ? "bg-blue-50/50 dark:bg-blue-950/10"
                                  : "hover:bg-muted/30 cursor-pointer",
                            )}
                            style={{ minHeight: rowHeight }}
                            onClick={() => {
                              if (!isMaintenance && onAddReservation) {
                                onAddReservation(spot.id, dateStr, hour);
                              }
                            }}
                          >
                            {/* Collapsed view: show pet count by status */}
                            {!isExpanded &&
                              !isMaintenance &&
                              statusCounts.total > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center gap-1">
                                  {statusCounts.checkedIn > 0 && (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                      <PawPrint className="h-2.5 w-2.5" />
                                      {statusCounts.checkedIn}
                                    </div>
                                  )}
                                  {statusCounts.reserved > 0 && (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                      <PawPrint className="h-2.5 w-2.5" />
                                      {statusCounts.reserved}
                                    </div>
                                  )}
                                  {statusCounts.checkedOut > 0 && (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                                      <PawPrint className="h-2.5 w-2.5" />
                                      {statusCounts.checkedOut}
                                    </div>
                                  )}
                                </div>
                              )}
                            {/* Empty cell hover for adding */}
                            {!isMaintenance &&
                              statusCounts.total === 0 &&
                              !isExpanded && (
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
                    {isMaintenance && (
                      <div
                        className="absolute top-2 h-8 rounded flex items-center gap-2 px-2 bg-red-100 dark:bg-red-900/30 border-l-4 border-l-red-500"
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

                    {/* Reservation Bars - stacked vertically (only when expanded) */}
                    {isExpanded &&
                      spotReservations.map((reservation, index) => {
                        const position =
                          calculateReservationPosition(reservation);
                        if (!position) return null;

                        const { startCol, span } = position;
                        const leftPercent = (startCol / HOURS.length) * 100;
                        const widthPercent = (span / HOURS.length) * 100;
                        const topOffset = 8 + index * 32;

                        return (
                          <div
                            key={reservation.id}
                            className={cn(
                              "absolute h-7 rounded border-l-4 px-2 cursor-pointer overflow-hidden shadow-sm transition-all hover:shadow-md flex items-center gap-1.5",
                              getStatusColor(reservation.status),
                            )}
                            style={{
                              top: topOffset,
                              left: `calc(${leftPercent}% + 2px)`,
                              width: `calc(${widthPercent}% - 4px)`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReservationClick?.(reservation);
                            }}
                          >
                            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <PawPrint className="h-2.5 w-2.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-xs font-medium truncate",
                                  getStatusTextColor(reservation.status),
                                )}
                              >
                                {reservation.petName}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {reservation.startTime} - {reservation.endTime}
                              </span>
                            </div>
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
          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border-l-2 border-l-blue-500" />
          <span className="text-muted-foreground">Checked In</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-l-yellow-500" />
          <span className="text-muted-foreground">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-900/30 border-l-2 border-l-gray-500" />
          <span className="text-muted-foreground">Checked Out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" />
          <span className="text-muted-foreground">Maintenance</span>
        </div>
      </div>
    </div>
  );
}
