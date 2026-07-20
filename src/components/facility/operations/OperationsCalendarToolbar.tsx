"use client";

import type { ReactNode } from "react";
import {
  CalendarPlus,
  Filter,
  FileDown,
  Gauge,
  Printer,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OperationsCalendarView } from "@/lib/operations-calendar";

interface OperationsCalendarToolbarProps {
  view: OperationsCalendarView;
  onViewChange: (view: OperationsCalendarView) => void;
  onToday: () => void;
  onStep: (direction: -1 | 1) => void;
  rangeLabel: string;
  searchTerm: string;
  onSearchTermChange: (next: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  newEventMenu?: ReactNode;
  staffView: boolean;
  onToggleStaffView: () => void;
  capacityView: boolean;
  onToggleCapacityView: () => void;
  staffOptions: string[];
  hiddenStaff: string[];
  onToggleStaffVisibility: (name: string) => void;
  onConnectCalendar: () => void;
  onPrintDay: () => void;
  onExportDayPdf: () => void;
}

export function OperationsCalendarToolbar({
  view,
  onViewChange,
  onToday,
  searchTerm,
  onSearchTermChange,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  newEventMenu,
  staffView,
  onToggleStaffView,
  capacityView,
  onToggleCapacityView,
  staffOptions,
  hiddenStaff,
  onToggleStaffVisibility,
  onConnectCalendar,
  onPrintDay,
  onExportDayPdf,
}: OperationsCalendarToolbarProps) {
  const simplifiedViews: Array<{
    value: OperationsCalendarView;
    label: string;
  }> = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  return (
    <div className="animate-in slide-in-from-top-4 fade-in relative z-10 mb-2 w-full duration-700 ease-out">
      <div className="pointer-events-none absolute -inset-1 rounded-4xl bg-slate-100/70 opacity-60 blur-xl"></div>

      <div className="relative rounded-3xl border border-white/80 bg-white/70 p-3 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/5 backdrop-blur-xl transition-all">
        <div className="flex flex-col gap-4 px-2 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Side: Date Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onToday}
              className="h-9 rounded-full border-slate-200/60 bg-white/80 px-5 font-medium text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-md active:scale-95"
            >
              Today
            </Button>
          </div>

          {/* Right Side: Actions & Search */}
          <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-1">
            {/* basis-full: `flex-1` alone sets basis:0, so the search shrank to
                a ~60px stub beside the action buttons on phones. */}
            <div className="group relative w-full flex-1 basis-full transition-all sm:max-w-[280px] sm:basis-auto">
              <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
              <Input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Search..."
                className="h-10 w-full rounded-full border-slate-200/60 bg-slate-50/50 pl-10 font-medium shadow-inner transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-500/10"
              />
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={onToggleFilters}
              className={`h-10 gap-2 rounded-full border px-5 shadow-sm transition-all duration-300 ${
                showFilters
                  ? "border-slate-800 bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800"
                  : "border-slate-200/60 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md"
              }`}
            >
              <Filter
                className={`size-4 ${showFilters ? "text-slate-300" : "text-slate-400"}`}
              />
              <span className="font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[11px] font-bold text-white shadow-inner">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <div className="transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95">
              {newEventMenu}
            </div>
          </div>
        </div>

        {/* Bottom Section: Tabs + Staff View */}
        <div className="animate-in fade-in mt-3 flex flex-wrap items-center gap-3 px-2 delay-300 duration-500">
          <div className="flex items-center rounded-full border border-slate-200/40 bg-slate-100/60 p-1 shadow-inner">
            {simplifiedViews.map((mode) => (
              <Button
                key={mode.value}
                size="sm"
                variant="ghost"
                onClick={() => onViewChange(mode.value)}
                className={`h-8 rounded-full px-6 text-[13px] transition-all duration-300 ${
                  view === mode.value && !staffView
                    ? "bg-white font-semibold text-indigo-600 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                    : "font-medium text-slate-500 hover:bg-slate-200/50 hover:text-slate-800"
                }`}
              >
                {mode.label}
              </Button>
            ))}
          </div>

          {/* Staff View toggle */}
          <Button
            size="sm"
            variant={staffView ? "default" : "outline"}
            onClick={onToggleStaffView}
            className={`h-8 gap-2 rounded-full px-4 text-[13px] transition-all duration-300 ${
              staffView
                ? "border-slate-800 bg-slate-900 text-white hover:bg-slate-800"
                : "border-slate-200/60 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
            }`}
          >
            <Users className="size-4" />
            Staff View
          </Button>

          {/* Staff filter (only in Staff View) */}
          {staffView && staffOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-2 rounded-full border-slate-200/60 bg-white/80 px-4 text-[13px] text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <Filter className="size-3.5" />
                  Staff
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 tabular-nums">
                    {staffOptions.length - hiddenStaff.length}/
                    {staffOptions.length}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-72 w-56 overflow-y-auto"
              >
                <DropdownMenuLabel>Show staff</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {staffOptions.map((name) => (
                  <DropdownMenuCheckboxItem
                    key={name}
                    checked={!hiddenStaff.includes(name)}
                    onCheckedChange={() => onToggleStaffVisibility(name)}
                    onSelect={(selectEvent) => selectEvent.preventDefault()}
                  >
                    {name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Capacity View toggle (spec 8.3 / Table 88) */}
          <Button
            size="sm"
            variant={capacityView ? "default" : "outline"}
            onClick={onToggleCapacityView}
            className={`h-8 gap-2 rounded-full px-4 text-[13px] transition-all duration-300 ${
              capacityView
                ? "border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700"
                : "border-slate-200/60 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
            }`}
          >
            <Gauge className="size-4" />
            Capacity View
          </Button>

          {/* Capacity heat legend (only in Capacity View) */}
          {capacityView && (
            <div className="flex items-center gap-3 rounded-full border border-slate-200/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-400/70" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                &gt;70%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500/70" />
                Full
              </span>
            </div>
          )}

          {/* Connect external calendar (spec 6.4) */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onConnectCalendar}
            className="ml-auto h-8 gap-1.5 rounded-full px-3 text-[13px] text-sky-600 hover:bg-sky-50 hover:text-sky-700"
          >
            <CalendarPlus className="size-4" />
            Connect Calendar
          </Button>

          {/* Print Day (spec 8.8 / Table 93) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-full border-slate-200/60 bg-white/80 px-4 text-[13px] text-slate-600 hover:bg-white hover:text-slate-900"
              >
                <Printer className="size-4" />
                Print Day
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2" onClick={onPrintDay}>
                <Printer className="size-4" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={onExportDayPdf}>
                <FileDown className="size-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
