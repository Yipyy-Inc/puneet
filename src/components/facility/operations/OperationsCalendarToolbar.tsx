"use client";

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  type OperationsCalendarView,
  formatDateKey,
} from "@/lib/operations-calendar";

interface OperationsCalendarToolbarProps {
  view: OperationsCalendarView;
  onViewChange: (view: OperationsCalendarView) => void;
  anchorDate: Date;
  onDateChange: (date: string | "") => void;
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
  anchorDate,
  onDateChange,
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
  const simplifiedViews: Array<{ value: OperationsCalendarView; label: string }> = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  return (
    <div className="relative animate-in slide-in-from-top-4 fade-in duration-700 ease-out z-10 w-full mb-2">
      {/* Luxurious subtle glow effect behind the toolbar */}
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-sky-100/50 via-indigo-100/40 to-purple-100/50 blur-xl opacity-70 pointer-events-none"></div>
      
      <div className="relative rounded-[1.5rem] border border-white/80 bg-white/70 backdrop-blur-xl p-3 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/5 transition-all">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-2">
          
          {/* Left Side: Date Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onToday} 
              className="rounded-full px-5 h-9 bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 font-medium"
            >
              Today
            </Button>
            
            <div className="flex items-center rounded-full bg-slate-50/80 p-0.5 border border-slate-100 shadow-inner">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onStep(-1)}
                aria-label="Go to previous period"
                className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all active:scale-95"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="w-[1px] h-3.5 bg-slate-200/80 mx-0.5 rounded-full"></div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onStep(1)}
                aria-label="Go to next period"
                className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all active:scale-95"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
              <div className="relative">
                <DatePicker
                  value={formatDateKey(anchorDate)}
                  onValueChange={onDateChange}
                  className="w-[160px] h-9 rounded-full bg-white border-slate-200/60 shadow-sm hover:border-indigo-200 focus-visible:ring-indigo-100 focus-visible:border-indigo-400 transition-all font-medium text-slate-700"
                />
              </div>
              <div className="text-[15px] font-semibold text-slate-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 hidden sm:block">
                {rangeLabel}
              </div>
            </div>
          </div>

          {/* Right Side: Actions & Search */}
          <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-1">
            <div className="relative w-full sm:max-w-[280px] group flex-1 transition-all">
              <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
              <Input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Search..."
                className="h-10 pl-10 w-full rounded-full bg-slate-50/50 border-slate-200/60 shadow-inner focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-400 transition-all duration-300 font-medium placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={onToggleFilters}
              className={`gap-2 h-10 rounded-full px-5 transition-all duration-300 border shadow-sm ${
                showFilters 
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 shadow-slate-900/20' 
                  : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/60 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <Filter className={`size-4 ${showFilters ? 'text-slate-300' : 'text-slate-400'}`} />
              <span className="font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center h-5 min-w-5 px-1.5 ml-1 text-[11px] font-bold rounded-full bg-indigo-500 text-white shadow-inner">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <div className="transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-300">
              {newEventMenu}
            </div>
          </div>
        </div>

        {/* Bottom Section: Tabs */}
        <div className="mt-3 px-2 flex animate-in fade-in duration-500 delay-300">
          <div className="p-1 bg-slate-100/60 rounded-full flex items-center shadow-inner border border-slate-200/40">
            {simplifiedViews.map((mode) => (
              <Button
                key={mode.value}
                size="sm"
                variant="ghost"
                onClick={() => onViewChange(mode.value)}
                className={`h-8 rounded-full px-6 text-[13px] transition-all duration-300 ${
                  view === mode.value 
                    ? "bg-white text-indigo-600 shadow-[0_2px_12px_rgba(0,0,0,0.06)] font-semibold" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 font-medium"
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
