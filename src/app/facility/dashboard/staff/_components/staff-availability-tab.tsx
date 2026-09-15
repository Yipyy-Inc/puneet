"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Info, Save } from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import type { AvailabilityDay } from "@/lib/api/mappers/scheduling";
import {
  availabilityQueries,
  useDecideAvailability,
  useProposeAvailability,
} from "@/lib/api/scheduling";
import { localDay } from "@/lib/tasks/use-module-day-tasks";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatWeekday } from "@/lib/i18n/format";

// ============================================================================
// A staff member's weekly availability, as the schedule reads it.
//
// This tab seeded its grid from `src/data/staff-availability` and saved back
// into that array, so a manager's edit reached nothing the scheduler checks
// and was gone on reload. It now reads `staff_availability` through
// `/api/scheduling/availability`, and a save goes the audited way that route
// already offers: a proposal for this person, approved at once when the viewer
// may decide availability (the approval applies the week in one transaction),
// or left in the approval queue when they may not.
// ============================================================================

// Monday-first, mirroring the employee availability view.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface DayRow {
  dayOfWeek: number;
  isAvailable: boolean;
  /** Empty with `endTime` empty means all day. */
  startTime: string;
  endTime: string;
}

/**
 * The stored week as rows. A day nobody stated arrives from the route as
 * available with no window, the reading that produces no conflict either way.
 */
function rowsFrom(week: AvailabilityDay[] | undefined): DayRow[] {
  return DAY_ORDER.map((dayOfWeek) => {
    const day = week?.find((d) => d.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      isAvailable: day?.isAvailable ?? true,
      startTime: day?.startTime ?? "",
      endTime: day?.endTime ?? "",
    };
  });
}

/** Seven days, Sunday first, as the route takes them. */
function weekFrom(rows: DayRow[]): AvailabilityDay[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const row = rows.find((r) => r.dayOfWeek === dayOfWeek);
    if (!row || !row.isAvailable) return { dayOfWeek, isAvailable: false };
    return row.startTime && row.endTime
      ? {
          dayOfWeek,
          isAvailable: true,
          startTime: row.startTime,
          endTime: row.endTime,
        }
      : { dayOfWeek, isAvailable: true };
  });
}

/**
 * What is wrong with a day, if anything. A window may run past midnight (a
 * night worker's 22:00 to 06:00), which the route accepts; half a window and a
 * window of no length are not windows.
 */
function problemOf(row: DayRow): "bothTimes" | "endAfterStart" | null {
  if (!row.isAvailable) return null;
  if (Boolean(row.startTime) !== Boolean(row.endTime)) return "bothTimes";
  if (row.startTime && row.startTime === row.endTime) return "endAfterStart";
  return null;
}

export function StaffAvailabilityTab({ staff }: { staff: StaffProfile }) {
  const { t } = useStaffText("availability");
  const { data, isPending, isError } = useQuery(availabilityQueries.all());

  if (isPending) {
    return (
      <Skeleton
        className="h-80 rounded-[16px]"
        aria-busy="true"
        aria-label={t("loading")}
      />
    );
  }
  if (isError) {
    return <p className="text-muted-foreground text-sm">{t("loadFailed")}</p>;
  }
  // Patterns are keyed by the staff row; a profile without one has nowhere to
  // hold a week.
  if (!staff.rowId) {
    return <p className="text-muted-foreground text-sm">{t("noStaffRow")}</p>;
  }

  return (
    <AvailabilityEditor
      key={staff.rowId}
      staff={staff}
      rowId={staff.rowId}
      week={data.patterns[staff.rowId]}
      canDecide={data.canDecide}
    />
  );
}

function AvailabilityEditor({
  staff,
  rowId,
  week,
  canDecide,
}: {
  staff: StaffProfile;
  rowId: string;
  week: AvailabilityDay[] | undefined;
  canDecide: boolean;
}) {
  const { t, fill, locale } = useStaffText("availability");
  const [rows, setRows] = useState<DayRow[]>(() => rowsFrom(week));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const { mutateAsync: propose } = useProposeAvailability();
  const { mutateAsync: decide } = useDecideAvailability();

  const update = (dow: number, patch: Partial<DayRow>) => {
    setRows((rs) =>
      rs.map((r) => (r.dayOfWeek === dow ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  };

  const invalid = rows.some((r) => problemOf(r) !== null);
  const activeDays = rows.filter((r) => r.isAvailable).length;

  const save = async () => {
    if (saving || invalid) return;
    setSaving(true);
    try {
      const request = await propose({
        employeeId: rowId,
        proposed: weekFrom(rows),
        effectiveFrom: localDay(),
      });
      if (canDecide) {
        await decide({ id: request.id, status: "approved" });
        toast.success(t("saved"));
      } else {
        toast.success(t("sentForApproval"));
      }
      setDirty(false);
    } catch (error) {
      toast.error(t("saveFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex items-start gap-2 rounded-[16px] border p-3 text-xs">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>{fill("templateNotice", { name: staff.firstName })}</span>
      </div>

      <div className="overflow-hidden rounded-[16px] border">
        <div className="text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-xs font-medium">
          <CalendarClock className="size-4" />
          {fill("weeklyHeading", { count: activeDays })}
        </div>
        <div className="divide-y">
          {rows.map((row) => {
            const problem = problemOf(row);
            return (
              <div
                key={row.dayOfWeek}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <label className="flex w-36 shrink-0 cursor-pointer items-center gap-2.5">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      value={row.startTime}
                      onChange={(e) =>
                        update(row.dayOfWeek, { startTime: e.target.value })
                      }
                      className="w-32"
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
                      className="w-32"
                    />
                    {!row.startTime && !row.endTime && (
                      <span className="text-muted-foreground text-xs">
                        {t("allDay")}
                      </span>
                    )}
                    {problem && (
                      <span className="text-destructive text-xs">
                        {t(problem)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {t("unavailable")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {dirty && (
          <span className="text-muted-foreground mr-auto text-xs">
            {t("unsaved")}
          </span>
        )}
        <Button
          onClick={() => void save()}
          disabled={!dirty || invalid || saving}
          aria-busy={saving}
          className="gap-1.5"
        >
          <Save className="size-4" />
          {saving ? t("saving") : t("saveAvailability")}
        </Button>
      </div>
    </div>
  );
}
