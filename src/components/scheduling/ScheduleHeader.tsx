"use client";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MoreVertical,
  BookmarkPlus,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Department } from "@/types/scheduling";

export type ViewMode = "week" | "2weeks" | "month";

interface ScheduleHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  selectedDepartment: Department;
  departments: Department[];
  isDraft: boolean;
  draftShiftCount: number;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onDepartmentChange: (dept: Department) => void;
  onPublish: () => void;
  onAddShift: () => void;
  onPrint: () => void;
  onSaveAsTemplate: () => void;
  onOpenTimeClock: () => void;
}

function formatDateRange(date: Date, viewMode: ViewMode): string {
  if (viewMode === "month") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + (viewMode === "2weeks" ? 13 : 6));

  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startStr} – ${endStr}`;
}

export function ScheduleHeader({
  currentDate,
  viewMode,
  selectedDepartment,
  departments,
  isDraft,
  draftShiftCount,
  onDateChange,
  onViewModeChange,
  onDepartmentChange,
  onPublish,
  onAddShift,
  onPrint,
  onSaveAsTemplate,
  onOpenTimeClock,
}: ScheduleHeaderProps) {
  const { can } = useCurrentUser();
  const canEdit = can("schedule.edit");
  const canPublish = can("schedule.publish");

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    const offset = viewMode === "month" ? 30 : viewMode === "2weeks" ? 14 : 7;
    newDate.setDate(
      newDate.getDate() + (direction === "next" ? offset : -offset),
    );
    onDateChange(newDate);
  };

  const goToToday = () => onDateChange(new Date());

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 px-6 pt-4 pb-3">
      {/* Department */}
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <div
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: selectedDepartment.color }}
        />
        <Select
          value={selectedDepartment.id}
          onValueChange={(val) => {
            const dept = departments.find((d) => d.id === val);
            if (dept) onDepartmentChange(dept);
          }}
        >
          <SelectTrigger className="h-9 w-[180px] border-none bg-transparent text-base font-semibold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  {dept.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date navigation */}
      <div className="flex min-w-0 shrink items-center gap-1.5 rounded-lg border border-border/50 bg-background px-1 py-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="h-7 text-xs font-medium"
        >
          Today
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => navigateDate("prev")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => navigateDate("next")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="min-w-0 truncate pr-2 text-sm font-semibold">
          {formatDateRange(currentDate, viewMode)}
        </span>
      </div>

      {/* View mode toggle */}
      <div className="bg-muted flex shrink-0 items-center rounded-lg p-0.5">
        {(
          [
            { value: "week", label: "Week" },
            { value: "2weeks", label: "2 Wk" },
            { value: "month", label: "Month" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            onClick={() => onViewModeChange(option.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Spacer pushes actions to right */}
      <div className="flex-1" />

      {/* Action buttons — primary actions visible, overflow in menu */}
      <div className="flex shrink-0 items-center gap-1.5">
        {canPublish && isDraft && draftShiftCount > 0 && (
          <Button
            onClick={onPublish}
            className="h-8 bg-indigo-600 text-white hover:bg-indigo-700"
            size="sm"
          >
            Publish
            <Badge
              variant="secondary"
              className="ml-1.5 bg-white/20 text-white"
            >
              {draftShiftCount}
            </Badge>
          </Button>
        )}
        {canEdit && (
          <Button
            size="sm"
            onClick={onAddShift}
            className="h-8"
            variant="outline"
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onOpenTimeClock}>
              <Clock className="mr-2 size-3.5" />
              Time Clock
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={onSaveAsTemplate}>
                <BookmarkPlus className="mr-2 size-3.5" />
                Save as Template
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="mr-2 size-3.5" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
