"use client";

/**
 * What the pricing-rules panel and its eight modals both reach for.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────
 *
 * `PricingRulesPanel.tsx` was 5,822 lines: the panel, plus eight modals
 * averaging 460 lines each, in one module. CLAUDE.md's build-performance
 * rules say no `.tsx` over ~500 lines and one file per modal, and the reason
 * is not tidiness — a module that large cannot be parallelised by the
 * bundler, and every one of those modals shipped to a viewer who opened none
 * of them.
 *
 * The split is mechanical on purpose. Each modal already took a complete prop
 * interface and closed over nothing in the panel, so moving one is a cut and
 * a paste; anything that reads differently afterwards is a mistake, not an
 * improvement.
 */

import { cn } from "@/lib/utils";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";

// ── Helpers ──────────────────────────────────────────────────────────

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface ServiceOption {
  value: string;
  label: string;
}

export interface PublicHolidayApiItem {
  date: string;
  localName: string;
  name: string;
}

export interface HolidayCatalogItem {
  name: string;
  dates: string[];
}

export const HOLIDAY_SYNC_YEAR_OPTIONS = [1, 2, 3, 5] as const;

export function normalizeApplicableServices(applicableServices?: string[]) {
  if (!applicableServices || applicableServices.length === 0) return ["all"];
  return applicableServices.includes("all")
    ? ["all"]
    : Array.from(new Set(applicableServices));
}

// Toggle a single service in/out of a rule's scope. "all" expands to every
// service; you can't remove the last one; re-selecting everything collapses
// back to ["all"].
export function toggleServiceScope(
  applicableServices: string[] | undefined,
  allValues: string[],
  service: string,
): string[] {
  const normalized = normalizeApplicableServices(applicableServices);
  const current = normalized.includes("all") ? [...allValues] : normalized;
  const has = current.includes(service);
  if (has && current.length === 1) return normalized; // keep at least one
  const next = has
    ? current.filter((s) => s !== service)
    : [...current, service];
  return allValues.every((v) => next.includes(v)) ? ["all"] : next;
}

// Clickable service-scope chips for a rule — toggles apply immediately (the
// panel auto-saves on rule-state change).
export function ServiceScopeChips({
  applicableServices,
  serviceOptions,
  onToggle,
}: {
  applicableServices?: string[];
  serviceOptions: ServiceOption[];
  onToggle: (service: string) => void;
}) {
  const { t } = usePricingLabels();
  const normalized = normalizeApplicableServices(applicableServices);
  const allSelected = normalized.includes("all");
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground text-[10px]">
        {t("scopeAvailableFor")}
      </span>
      {serviceOptions.map((opt) => {
        const selected = allSelected || normalized.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            aria-pressed={selected}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
              selected
                ? "border-primary text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground border-dashed hover:border-solid",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function shiftIsoDate(dateIso: string, dayOffset: number) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

export function latestYearFromIsoDates(dates: string[]) {
  return dates.reduce((maxYear, dateIso) => {
    const year = Number(dateIso.slice(0, 4));
    if (!Number.isFinite(year)) return maxYear;
    return year > maxYear ? year : maxYear;
  }, 0);
}

export function buildHolidayDateList(
  selectedNames: string[],
  catalog: HolidayCatalogItem[],
  extensionDaysBefore = 0,
  extensionDaysAfter = 0,
) {
  const dateSet = new Set<string>();
  for (const holiday of catalog) {
    if (!selectedNames.includes(holiday.name)) continue;
    for (const date of holiday.dates) {
      for (
        let offset = -extensionDaysBefore;
        offset <= extensionDaysAfter;
        offset += 1
      ) {
        dateSet.add(shiftIsoDate(date, offset));
      }
    }
  }
  return Array.from(dateSet).sort();
}

export async function fetchHolidayCatalog(
  countryCode: string,
  yearsAhead: number,
): Promise<HolidayCatalogItem[]> {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(1, yearsAhead) },
    (_, index) => currentYear + index,
  );

  const responses = await Promise.all(
    years.map((year) =>
      fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      ),
    ),
  );

  const failed = responses.find((response) => !response.ok);
  if (failed) {
    throw new Error("Could not load holiday dates for this country");
  }

  const payloads = (await Promise.all(
    responses.map((response) => response.json()),
  )) as PublicHolidayApiItem[][];

  const holidaysByName = new Map<string, Set<string>>();

  for (const payload of payloads) {
    for (const holiday of payload) {
      const holidayName = holiday.name?.trim() || holiday.localName?.trim();
      if (!holidayName) continue;
      if (!holidaysByName.has(holidayName)) {
        holidaysByName.set(holidayName, new Set<string>());
      }
      holidaysByName.get(holidayName)?.add(holiday.date);
    }
  }

  return Array.from(holidaysByName.entries())
    .map(([name, dates]) => ({
      name,
      dates: Array.from(dates).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
