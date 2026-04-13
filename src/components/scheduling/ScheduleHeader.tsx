"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Building2,
  Printer,
  Download,
  Plus,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
}

function formatDateRange(date: Date, viewMode: ViewMode): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const yearOpts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (viewMode === "month") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + (viewMode === "2weeks" ? 13 : 6));

  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", yearOpts);

  return `${startStr} - ${endStr}`;
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
}: ScheduleHeaderProps) {
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    const offset = viewMode === "month" ? 30 : viewMode === "2weeks" ? 14 : 7;
    newDate.setDate(
      newDate.getDate() + (direction === "next" ? offset : -offset),
    );
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="space-y-4 px-6 pt-5 pb-4">
      {/* Top row: Department + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Department Selector */}
          <div className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: selectedDepartment.color }}
            />
            <Select
              value={selectedDepartment.id}
              onValueChange={(val) => {
                const dept = departments.find((d) => d.id === val);
                if (dept) onDepartmentChange(dept);
              }}
            >
              <SelectTrigger className="h-9 w-[200px] border-none bg-transparent text-base font-semibold shadow-none">
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
        </div>

        <div className="flex items-center gap-2">
          {isDraft && draftShiftCount > 0 && (
            <Button
              onClick={onPublish}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              size="sm"
            >
              Publish Schedule
              <Badge
                variant="secondary"
                className="ml-1.5 bg-white/20 text-white"
              >
                {draftShiftCount}
              </Badge>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onAddShift}>
            <Plus className="mr-1.5 size-3.5" />
            Add Shift
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onPrint}>
            <Printer className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Bottom row: Date Navigation + View Mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs font-medium"
          >
            Today
          </Button>
          <div className="flex items-center gap-1">
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
          <h2 className="text-lg font-semibold tracking-tight">
            {formatDateRange(currentDate, viewMode)}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-muted flex items-center rounded-lg p-0.5">
            {(
              [
                { value: "week", label: "Week" },
                { value: "2weeks", label: "2 Weeks" },
                { value: "month", label: "Month" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => onViewModeChange(option.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
