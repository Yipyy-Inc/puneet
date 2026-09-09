"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarClock, Info, Save } from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";
import {
  staffAvailability,
  upsertStaffAvailabilityForStaff,
} from "@/data/staff-availability";
import { fullNameOf } from "./staff-shared";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatWeekday } from "@/lib/i18n/format";

// Monday-first, mirroring the employee availability view.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
// The EIGHTH copy of the weekday names in this repo, and the second found
// on a measured surface. `formatWeekday` replaced the first; the remaining
// six are in the debt map.
const DAY_LABEL_UNUSED: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

interface DayRow {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

function seedRows(staffId: string): DayRow[] {
  return DAY_ORDER.map((dow) => {
    const existing = staffAvailability.find(
      (a) => a.staffId === staffId && a.dayOfWeek === dow,
    );
    return existing
      ? {
          dayOfWeek: dow,
          isAvailable: existing.isAvailable,
          startTime: existing.startTime,
          endTime: existing.endTime,
        }
      : {
          dayOfWeek: dow,
          isAvailable: false,
          startTime: "09:00",
          endTime: "17:00",
        };
  });
}

/**
 * Stands in when a staff member has neither an availability row nor an
 * assigned location. It is WRITTEN INTO the availability record by save()
 * below, so it is a stored value rather than a label — translating it would
 * put a French word in a row a report reads back.
 */
// french-ok: stored, not a label
const DEFAULT_FACILITY = "Main";

/**
 * Manager-editable weekly availability TEMPLATE — the preference grid the
 * employee submitted at onboarding. Editing here updates the availability
 * template only; it does NOT touch already-approved / published future shifts.
 */
export function StaffAvailabilityTab({ staff }: { staff: StaffProfile }) {
  const { t, fill, locale } = useStaffText("availability");
  const [rows, setRows] = useState<DayRow[]>(() => seedRows(staff.id));
  const [dirty, setDirty] = useState(false);

  const facility =
    staffAvailability.find((a) => a.staffId === staff.id)?.facility ??
    FACILITY_LOCATIONS.find((l) => l.id === staff.assignedLocations[0])
      ?.label ??
    DEFAULT_FACILITY;

  const update = (dow: number, patch: Partial<DayRow>) => {
    setRows((rs) =>
      rs.map((r) => (r.dayOfWeek === dow ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  };

  const invalid = rows.some((r) => r.isAvailable && r.startTime >= r.endTime);
  const activeDays = rows.filter((r) => r.isAvailable).length;

  const save = () => {
    upsertStaffAvailabilityForStaff(
      staff.id,
      fullNameOf(staff),
      facility,
      rows,
    );
    setDirty(false);
    toast.success(t("saved"));
  };

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs dark:border-sky-900/40 dark:bg-sky-950/20">
        <Info className="mt-0.5 size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
        <span>{fill("templateNotice", { name: staff.firstName })}</span>
      </div>

      <div className="border-border/60 overflow-hidden rounded-xl border">
        <div className="text-muted-foreground bg-muted/40 flex items-center gap-2 border-b px-4 py-2 text-xs font-medium">
          <CalendarClock className="size-3.5" />
          {fill("weeklyHeading", { count: activeDays })}
        </div>
        <div className="divide-y">
          {rows.map((row) => (
            <div
              key={row.dayOfWeek}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3",
                !row.isAvailable && "opacity-60",
              )}
            >
              <label className="flex w-32 shrink-0 cursor-pointer items-center gap-2.5">
                <Switch
                  checked={row.isAvailable}
                  onCheckedChange={(v) =>
                    update(row.dayOfWeek, { isAvailable: v })
                  }
                />
                <span className="text-sm font-medium">
                  {formatWeekday(row.dayOfWeek, locale, "long")}
                </span>
              </label>

              {row.isAvailable ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={row.startTime}
                    onChange={(e) =>
                      update(row.dayOfWeek, { startTime: e.target.value })
                    }
                    className="h-8 w-32"
                  />
                  <span className="text-muted-foreground text-xs">
                    {t("to")}
                  </span>
                  <Input
                    type="time"
                    value={row.endTime}
                    onChange={(e) =>
                      update(row.dayOfWeek, { endTime: e.target.value })
                    }
                    className="h-8 w-32"
                  />
                  {row.startTime >= row.endTime && (
                    <span className="text-xs text-rose-600 dark:text-rose-400">
                      {t("endAfterStart")}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {t("unavailable")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {dirty && (
          <span className="text-muted-foreground mr-auto text-xs">
            {t("unsaved")}
          </span>
        )}
        <Button
          onClick={save}
          disabled={!dirty || invalid}
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Save className="size-4" /> {t("saveAvailability")}
        </Button>
      </div>
    </div>
  );
}
