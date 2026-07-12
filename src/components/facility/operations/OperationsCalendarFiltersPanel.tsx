"use client";

import { toast } from "sonner";
import { CalendarPlus, Copy, RefreshCw } from "lucide-react";
import { FilterSection } from "@/components/facility/operations/OperationsCalendarViews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FilterOption,
  OperationsCalendarFilters,
  OperationsCalendarFilterOptions,
} from "@/lib/operations-calendar";
import {
  EXTERNAL_PLATFORM_META,
  formatLastSynced,
  getYipyyIcsExportUrl,
  syncExternalCalendar,
  useExternalCalendars,
} from "@/lib/external-calendars";

type ToggleGroupKey =
  | "modules"
  | "addOns"
  | "statuses"
  | "staff"
  | "bookingSources"
  | "locations";

// Curated booking-status set (spec Table 43). Values match the labels events
// carry (see BOOKING_STATUS_LABELS): a completed booking reads "Checked-out".
const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: "Confirmed", label: "Confirmed" },
  { value: "Checked-in", label: "Checked In" },
  { value: "Checked-out", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

interface OperationsCalendarFiltersPanelProps {
  open: boolean;
  filters: OperationsCalendarFilters;
  filterOptions: OperationsCalendarFilterOptions;
  onToggleGroupValue: (group: ToggleGroupKey, value: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  onConnectCalendar: () => void;
}

export function OperationsCalendarFiltersPanel({
  open,
  filters,
  filterOptions,
  onToggleGroupValue,
  onClearAll,
  onClose,
  onConnectCalendar,
}: OperationsCalendarFiltersPanelProps) {
  const externalCalendars = useExternalCalendars();

  if (!open) {
    return null;
  }

  const copyExportUrl = () => {
    navigator.clipboard?.writeText(getYipyyIcsExportUrl());
    toast.success("Export URL copied");
  };

  const selectedLocation = filters.locations[0] ?? "";
  // Location is hidden for single-location facilities (one or no location).
  const showLocation = filterOptions.locations.length > 1;

  return (
    <Card className="border-slate-200 bg-slate-50/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-600">
          Service filters include built-in services and active custom modules
          configured for this facility.
        </p>
        <FilterSection
          title="Service Type"
          options={filterOptions.modules}
          selectedValues={filters.modules}
          onToggle={(value) => onToggleGroupValue("modules", value)}
        />
        <FilterSection
          title="Status"
          options={STATUS_FILTER_OPTIONS}
          selectedValues={filters.statuses}
          onToggle={(value) => onToggleGroupValue("statuses", value)}
        />
        <FilterSection
          title="Staff"
          options={filterOptions.staff}
          selectedValues={filters.staff}
          onToggle={(value) => onToggleGroupValue("staff", value)}
        />
        <FilterSection
          title="Add-Ons"
          options={filterOptions.addOns}
          selectedValues={filters.addOns}
          onToggle={(value) => onToggleGroupValue("addOns", value)}
        />
        {showLocation && (
          <div className="space-y-2 rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-sm">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Location
            </h3>
            <div className="grid gap-1.5">
              <LocationRadio
                label="All Locations"
                checked={selectedLocation === ""}
                onSelect={() => onToggleGroupValue("locations", "")}
              />
              {filterOptions.locations.map((option) => (
                <LocationRadio
                  key={option.value}
                  label={option.label}
                  checked={selectedLocation === option.value}
                  onSelect={() => onToggleGroupValue("locations", option.value)}
                />
              ))}
            </div>
          </div>
        )}
        <FilterSection
          title="Booking Source"
          options={filterOptions.bookingSources}
          selectedValues={filters.bookingSources}
          onToggle={(value) => onToggleGroupValue("bookingSources", value)}
        />

        {/* External calendars (spec 6.4 / Tables 75 & 77) */}
        <div className="space-y-2 rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              External Calendars
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-sky-600 hover:text-sky-700"
              onClick={onConnectCalendar}
            >
              <CalendarPlus className="size-3.5" />
              Connect External Calendar
            </Button>
          </div>

          {externalCalendars.length === 0 ? (
            <p className="py-1 text-[11px] text-slate-400">
              No external calendars connected.
            </p>
          ) : (
            <div className="space-y-1.5">
              {externalCalendars.map((calendar) => {
                const meta = EXTERNAL_PLATFORM_META[calendar.platform];
                return (
                  <div
                    key={calendar.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5"
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-white text-[9px] font-black ring-1 ring-slate-200"
                      style={{ color: meta.color }}
                    >
                      {meta.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-slate-700">
                        {calendar.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Last synced: {formatLastSynced(calendar.lastSyncedAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 text-slate-400 hover:text-slate-700"
                      title="Sync now"
                      onClick={() => {
                        syncExternalCalendar(calendar.id);
                        toast.success(`${calendar.name} synced`);
                      }}
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Read-only .ics export URL (Task 36 / Table 77) */}
          <div className="mt-1 border-t border-slate-100 pt-2">
            <p className="mb-1 text-[10px] font-medium text-slate-500">
              Yipyy calendar export (read-only .ics)
            </p>
            <div className="flex items-center gap-1.5">
              <code className="min-w-0 flex-1 truncate rounded-sm bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                {getYipyyIcsExportUrl()}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="size-6 shrink-0"
                title="Copy export URL"
                onClick={copyExportUrl}
              >
                <Copy className="size-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer (spec Table 48) */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-slate-500 hover:text-slate-700"
            onClick={onClearAll}
          >
            Clear All
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-slate-500 hover:text-slate-700"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onClose}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LocationRadio({
  label,
  checked,
  onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50">
      <input
        type="radio"
        name="calendar-location-filter"
        checked={checked}
        onChange={onSelect}
        className="size-3.5 accent-slate-900"
      />
      <span className="text-xs text-slate-700">{label}</span>
    </label>
  );
}
