"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CalendarView = "day" | "week" | "month" | "list";

export interface CalendarItem {
  id: string | number;
  date: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

export interface CalendarRowData {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

interface CalendarRenderProps<T extends CalendarItem> {
  item: T;
  isToday: boolean;
}

interface CalendarCellRenderProps<T extends CalendarItem> {
  date: Date;
  items: T[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface CalendarConfig<T extends CalendarItem> {
  // Required callbacks
  onItemClick?: (item: T) => void;
  onAddClick?: (date: string) => void;

  // Custom renderers
  renderMonthItem?: (props: CalendarRenderProps<T>) => React.ReactNode;
  renderWeekCell?: (props: CalendarCellRenderProps<T>) => React.ReactNode;
  renderListItem?: (item: T) => React.ReactNode;

  // Styling functions
  getItemColor?: (item: T) => string;
  getItemBorderColor?: (item: T) => string;

  // Legend items for color indicators
  legendItems?: Array<{ color: string; label: string }>;

  // For row-based week view (like staff schedules)
  rowData?: CalendarRowData[];
  getItemsForDateAndRow?: (date: Date, rowId: string | number) => T[];
  renderRowHeader?: (row: CalendarRowData) => React.ReactNode;

  // Table columns for list view
  listColumns?: Array<{
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
  }>;

  // Optional features
  showAddButton?: boolean;
  title?: string;
}

interface GenericCalendarProps<T extends CalendarItem> {
  items: T[];
  config: CalendarConfig<T>;
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  initialDate?: Date;
}

export function GenericCalendar<T extends CalendarItem>({
  items,
  config,
  view = "month",
  initialDate = new Date(),
}: GenericCalendarProps<T>) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const currentView = view;

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getItemsForDate = (date: Date): T[] => {
    const dateStr = formatDate(date);
    return items.filter((item) => {
      if (item.date === dateStr) return true;
      // Handle date ranges if item has startDate/endDate
      if ("startDate" in item && "endDate" in item) {
        const startDate = item.startDate as string;
        const endDate = item.endDate as string;
        return startDate <= dateStr && endDate >= dateStr;
      }
      return false;
    });
  };

  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getMonthCalendarGrid = (): Array<
    Array<{ date: Date; isCurrentMonth: boolean }>
  > => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust for Monday start (0 = Sunday, need to convert to Monday = 0)
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const startPadding = firstDayOfWeek;

    const grid: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const paddingDate = new Date(year, month, -i);
      grid.push({ date: paddingDate, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      grid.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    // Next month padding
    const remainingCells = 42 - grid.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingCells; i++) {
      const paddingDate = new Date(year, month + 1, i);
      grid.push({ date: paddingDate, isCurrentMonth: false });
    }

    // Convert to weeks
    const weeks: Array<Array<{ date: Date; isCurrentMonth: boolean }>> = [];
    for (let i = 0; i < grid.length; i += 7) {
      weeks.push(grid.slice(i, i + 7));
    }

    return weeks;
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeText = (): string => {
    if (currentView === "week") {
      const weekDates = getWeekDates();
      return `${weekDates[0].toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })} - ${weekDates[6].toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const renderMonthView = () => {
    const monthGrid = getMonthCalendarGrid();

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-sm py-2 border-b"
          >
            {day}
          </div>
        ))}

        {/* Calendar grid */}
        {monthGrid.map((week, weekIndex) =>
          week.map((cell, dayIndex) => {
            const dayItems = getItemsForDate(cell.date);
            const isTodayDate = isToday(cell.date);

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={cn(
                  "min-h-[100px] border rounded-lg p-2 transition-all hover:shadow-sm",
                  !cell.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                  cell.isCurrentMonth && "bg-card",
                  isTodayDate && "ring-2 ring-primary",
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isTodayDate && "text-primary font-bold",
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                  {config.showAddButton &&
                    cell.isCurrentMonth &&
                    config.onAddClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() =>
                          config.onAddClick?.(formatDate(cell.date))
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                </div>

                <div className="space-y-1">
                  {config.renderWeekCell ? (
                    config.renderWeekCell({
                      date: cell.date,
                      items: dayItems,
                      isToday: isTodayDate,
                      isCurrentMonth: cell.isCurrentMonth,
                    })
                  ) : (
                    <>
                      {dayItems.slice(0, 3).map((item) =>
                        config.renderMonthItem ? (
                          <div key={item.id}>
                            {config.renderMonthItem({
                              item,
                              isToday: isTodayDate,
                            })}
                          </div>
                        ) : (
                          <button
                            key={item.id}
                            onClick={() => config.onItemClick?.(item)}
                            className={cn(
                              "w-full text-left p-1 rounded text-xs border-l-2 hover:bg-accent transition-colors",
                              config.getItemBorderColor?.(item) ||
                                "border-gray-500",
                            )}
                          >
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full inline-block mr-1",
                                config.getItemColor?.(item) || "bg-gray-500",
                              )}
                            />
                            <span className="truncate">#{item.id}</span>
                          </button>
                        ),
                      )}
                      {dayItems.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayItems.length - 3} more
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          }),
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates();

    if (config.rowData && config.getItemsForDateAndRow) {
      // Row-based week view (e.g., staff schedules)
      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">
                  {config.title || "Items"}
                </TableHead>
                {weekDates.map((date) => {
                  const isTodayDate = isToday(date);
                  return (
                    <TableHead
                      key={date.toISOString()}
                      className={cn(
                        "text-center",
                        isTodayDate && "bg-primary/10",
                      )}
                    >
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "font-semibold",
                            isTodayDate && "text-primary",
                          )}
                        >
                          {date.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            isTodayDate
                              ? "text-primary font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.rowData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {config.renderRowHeader?.(row) || row.name}
                  </TableCell>
                  {weekDates.map((date) => {
                    const cellItems = config.getItemsForDateAndRow!(
                      date,
                      row.id,
                    );
                    const isTodayDate = isToday(date);
                    return (
                      <TableCell
                        key={date.toISOString()}
                        className={cn(
                          "text-center p-2",
                          isTodayDate && "bg-primary/5",
                        )}
                      >
                        {config.renderWeekCell ? (
                          config.renderWeekCell({
                            date,
                            items: cellItems,
                            isToday: isTodayDate,
                            isCurrentMonth: true,
                          })
                        ) : cellItems.length > 0 ? (
                          cellItems.map((item) => (
                            <div key={item.id} className="mb-1">
                              <Badge
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => config.onItemClick?.(item)}
                              >
                                {item.startTime && item.endTime
                                  ? `${item.startTime} - ${item.endTime}`
                                  : `#${item.id}`}
                              </Badge>
                            </div>
                          ))
                        ) : config.showAddButton && config.onAddClick ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-full text-xs"
                            onClick={() =>
                              config.onAddClick?.(formatDate(date))
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        ) : null}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    // Simple week view (like bookings)
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const dayItems = getItemsForDate(date);
          const isTodayDate = isToday(date);

          return (
            <div key={date.toISOString()} className="space-y-2">
              <div
                className={cn(
                  "text-center p-2 rounded-lg",
                  isTodayDate && "bg-primary text-primary-foreground",
                )}
              >
                <div className="font-semibold">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="text-sm">
                  {date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="space-y-1">
                {dayItems.map((item) =>
                  config.renderMonthItem ? (
                    <div key={item.id}>
                      {config.renderMonthItem({ item, isToday: isTodayDate })}
                    </div>
                  ) : (
                    <button
                      key={item.id}
                      onClick={() => config.onItemClick?.(item)}
                      className="w-full text-left p-2 rounded border hover:bg-accent transition-colors text-sm"
                    >
                      #{item.id}
                    </button>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    if (!config.listColumns) {
      return (
        <div className="text-center text-muted-foreground py-8">
          List view configuration not provided
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {config.listColumns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) =>
            config.renderListItem ? (
              <TableRow key={item.id}>{config.renderListItem(item)}</TableRow>
            ) : (
              <TableRow key={item.id}>
                {config.listColumns!.map((col) => (
                  <TableCell key={col.key}>
                    {col.render
                      ? col.render(item)
                      : String(item[col.key] || "-")}
                  </TableCell>
                ))}
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {config.title || getDateRangeText()}
        </CardTitle>
        <div className="flex gap-2">
          {currentView !== "list" && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {currentView === "month" && renderMonthView()}
        {currentView === "week" && renderWeekView()}
        {currentView === "list" && renderListView()}

        {config.legendItems && config.legendItems.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
            {config.legendItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", item.color)} />
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
