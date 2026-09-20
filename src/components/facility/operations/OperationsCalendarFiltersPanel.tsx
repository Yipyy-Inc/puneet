"use client";

import { FilterSection } from "@/components/facility/operations/OperationsCalendarViews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FilterOption,
  OperationsCalendarFilters,
  OperationsCalendarFilterOptions,
} from "@/lib/operations-calendar";
import { useStaffText } from "@/lib/staff/use-staff-text";

type ToggleGroupKey =
  | "modules"
  | "addOns"
  | "statuses"
  | "staff"
  | "bookingSources"
  | "locations";

// Curated booking-status set (spec Table 43). Values match the labels events
// carry (see BOOKING_STATUS_LABELS): a completed booking reads "Checked-out".
// A function, not a const: the labels are translated and a module-level array
// is built before any translator exists. The VALUES are the stored ones and
// stay English — they match what an event carries.
function statusFilterOptions(t: (key: string) => string): FilterOption[] {
  return [
    { value: "Confirmed", label: t("statusConfirmed") },
    { value: "Checked-in", label: t("statusCheckedIn") },
    { value: "Checked-out", label: t("statusCompleted") },
    { value: "Cancelled", label: t("statusCancelled") },
  ];
}

interface OperationsCalendarFiltersPanelProps {
  open: boolean;
  filters: OperationsCalendarFilters;
  filterOptions: OperationsCalendarFilterOptions;
  onToggleGroupValue: (group: ToggleGroupKey, value: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function OperationsCalendarFiltersPanel({
  open,
  filters,
  filterOptions,
  onToggleGroupValue,
  onClearAll,
  onClose,
}: OperationsCalendarFiltersPanelProps) {
  // Above the early return: a hook cannot sit behind a condition.
  const { t } = useStaffText("opsCalendar");
  if (!open) {
    return null;
  }

  const statusOptions = statusFilterOptions(t);
  const selectedLocation = filters.locations[0] ?? "";
  // Location is hidden for single-location facilities (one or no location).
  const showLocation = filterOptions.locations.length > 1;

  return (
    <Card className="border-slate-200 bg-slate-50/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("filtersTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-600">{t("filtersHelp")}</p>
        <FilterSection
          title={t("serviceType")}
          options={filterOptions.modules}
          selectedValues={filters.modules}
          onToggle={(value) => onToggleGroupValue("modules", value)}
        />
        <FilterSection
          title={t("filterStatus")}
          options={statusOptions}
          selectedValues={filters.statuses}
          onToggle={(value) => onToggleGroupValue("statuses", value)}
        />
        <FilterSection
          title={t("filterStaff")}
          options={filterOptions.staff}
          selectedValues={filters.staff}
          onToggle={(value) => onToggleGroupValue("staff", value)}
        />
        <FilterSection
          title={t("filterAddOns")}
          options={filterOptions.addOns}
          selectedValues={filters.addOns}
          onToggle={(value) => onToggleGroupValue("addOns", value)}
        />
        {showLocation && (
          <div className="space-y-2 rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-sm">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {t("filterLocation")}
            </h3>
            <div className="grid gap-1.5">
              <LocationRadio
                label={t("allLocations")}
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
          title={t("bookingSource")}
          options={filterOptions.bookingSources}
          selectedValues={filters.bookingSources}
          onToggle={(value) => onToggleGroupValue("bookingSources", value)}
        />

        {/* No "External Calendars" block. It listed connected calendars
            nobody had connected, its "Sync now" only moved a timestamp, and
            the ".ics export" URL carried a hardcoded token to a feed that does
            not exist. It returns with a real calendar integration. */}

        {/* Footer (spec Table 48) */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-slate-500 hover:text-slate-700"
            onClick={onClearAll}
          >
            {t("clearAll")}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-slate-500 hover:text-slate-700"
              onClick={onClose}
            >
              {t("close")}
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onClose}
            >
              {t("applyFilters")}
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
