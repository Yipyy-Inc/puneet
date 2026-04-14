"use client";

import type { ReactNode } from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

export function OperationsCalendarToolbar({
  view,
  onViewChange,
  onToday,
  onStep,
  rangeLabel,
  searchTerm,
  onSearchTermChange,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  newEventMenu,
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
            <div className="group relative w-full flex-1 transition-all sm:max-w-[280px]">
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

        {/* Bottom Section: Tabs */}
        <div className="animate-in fade-in mt-3 flex px-2 delay-300 duration-500">
          <div className="flex items-center rounded-full border border-slate-200/40 bg-slate-100/60 p-1 shadow-inner">
            {simplifiedViews.map((mode) => (
              <Button
                key={mode.value}
                size="sm"
                variant="ghost"
                onClick={() => onViewChange(mode.value)}
                className={`h-8 rounded-full px-6 text-[13px] transition-all duration-300 ${
                  view === mode.value
                    ? "bg-white font-semibold text-indigo-600 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                    : "font-medium text-slate-500 hover:bg-slate-200/50 hover:text-slate-800"
                }`}
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
