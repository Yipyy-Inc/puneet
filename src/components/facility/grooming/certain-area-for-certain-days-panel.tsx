"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { CalendarClock, Plus, X } from "lucide-react";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { facilityStaff } from "@/data/facility-staff";
import { DAY_SHORT } from "@/lib/service-areas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NO_AREA_VALUE = "__off__";

/**
 * Certain Area for Certain Days — weekly per-staff area template plus
 * per-date overrides. The weekly template seeds the default coverage; date
 * overrides win on the dates they're set for. Disabling the master toggle
 * leaves the templates in place but skips them during coverage checks.
 */
export function CertainAreaForCertainDaysPanel() {
  const {
    certainAreaEnabled,
    setCertainAreaEnabled,
    serviceAreas,
    staffSchedules,
    setStaffWeeklyDay,
    setStaffDateOverride,
  } = useMobileGrooming();

  const groomers = useMemo(
    () => facilityStaff.filter((s) => s.primaryRole === "groomer"),
    [],
  );
  const activeAreas = useMemo(
    () => serviceAreas.filter((a) => a.active),
    [serviceAreas],
  );

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    groomers[0]?.id ?? "",
  );
  const [overrideDate, setOverrideDate] = useState<string>("");
  const [overrideAreaId, setOverrideAreaId] = useState<string>("");

  const selectedSchedule = useMemo(
    () => staffSchedules.find((s) => s.staffId === selectedStaffId),
    [staffSchedules, selectedStaffId],
  );

  const selectedStaff = groomers.find((g) => g.id === selectedStaffId);

  function areaName(areaId: string | null): string {
    if (!areaId) return "Off";
    return activeAreas.find((a) => a.id === areaId)?.name ?? "(deleted area)";
  }

  function colorFor(areaId: string | null): string | undefined {
    if (!areaId) return undefined;
    return activeAreas.find((a) => a.id === areaId)?.color;
  }

  function applyWeeklyChange(dow: number, raw: string) {
    const next = raw === NO_AREA_VALUE ? null : raw;
    setStaffWeeklyDay(selectedStaffId, dow, next);
    toast.success(
      next === null
        ? `${selectedStaff?.firstName ?? "Staff"} is off on ${DAY_SHORT[dow]}s`
        : `${DAY_SHORT[dow]}s set to ${areaName(next)}`,
    );
  }

  function addOverride() {
    if (!overrideDate || !overrideAreaId) {
      toast.error("Pick a date and an area to override");
      return;
    }
    const next = overrideAreaId === NO_AREA_VALUE ? null : overrideAreaId;
    setStaffDateOverride(selectedStaffId, overrideDate, next);
    toast.success(
      next === null
        ? `Marked ${overrideDate} as off for ${selectedStaff?.firstName ?? "staff"}`
        : `Override saved: ${overrideDate} → ${areaName(next)}`,
    );
    setOverrideDate("");
    setOverrideAreaId("");
  }

  function clearOverride(dateStr: string) {
    setStaffDateOverride(selectedStaffId, dateStr, undefined);
    toast.success(`Override cleared for ${dateStr}`);
  }

  const sortedOverrides = useMemo(() => {
    const entries = Object.entries(selectedSchedule?.dateOverrides ?? {});
    return entries.sort(([a], [b]) => a.localeCompare(b));
  }, [selectedSchedule]);

  return (
    <Card className="border-sky-200 dark:border-sky-900">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-sky-600" />
            Certain Area for Certain Days
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Per-staff weekly area template + date overrides. When on, smart
            scheduling and online booking only offer slots inside the staff&apos;s
            scheduled area for that day.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground">
            {certainAreaEnabled ? "On" : "Off"}
          </span>
          <Switch
            checked={certainAreaEnabled}
            onCheckedChange={setCertainAreaEnabled}
            aria-label="Toggle Certain Area for Certain Days"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {groomers.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
            No groomers found — add staff in Staff Settings first.
          </p>
        ) : (
          <>
            {/* Staff picker */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-muted-foreground">
                Staff
              </label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Pick a groomer" />
                </SelectTrigger>
                <SelectContent>
                  {groomers.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-xs">
                      {g.firstName} {g.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Weekly template — 7-day grid */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Weekly template — repeats every week
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_SHORT.map((dayLabel, dow) => {
                  const areaId =
                    selectedSchedule?.weeklyTemplate[String(dow)] ?? null;
                  const color = colorFor(areaId);
                  return (
                    <div
                      key={dow}
                      className="flex flex-col rounded-md border bg-card px-2 py-1.5"
                    >
                      <span className="mb-1 text-center text-[10px] font-semibold text-muted-foreground">
                        {dayLabel}
                      </span>
                      <Select
                        value={areaId ?? NO_AREA_VALUE}
                        onValueChange={(v) => applyWeeklyChange(dow, v)}
                      >
                        <SelectTrigger
                          className="h-7 text-[10px]"
                          style={
                            color
                              ? {
                                  borderLeft: `3px solid ${color}`,
                                }
                              : undefined
                          }
                        >
                          <SelectValue placeholder="Off" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_AREA_VALUE} className="text-xs">
                            <span className="text-muted-foreground">Off</span>
                          </SelectItem>
                          {activeAreas.map((a) => (
                            <SelectItem
                              key={a.id}
                              value={a.id}
                              className="text-xs"
                            >
                              <span
                                className="mr-1.5 inline-block size-2 rounded-full align-middle"
                                style={{ backgroundColor: a.color }}
                              />
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date overrides */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Date overrides — one-off changes that beat the weekly template
              </p>

              {sortedOverrides.length === 0 ? (
                <p className="rounded-md border border-dashed bg-card/50 px-3 py-2 text-center text-[11px] text-muted-foreground italic">
                  No overrides yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {sortedOverrides.map(([dateStr, areaId]) => {
                    const dow = new Date(dateStr + "T00:00:00").getDay();
                    const templateAreaId =
                      selectedSchedule?.weeklyTemplate[String(dow)] ?? null;
                    return (
                      <li
                        key={dateStr}
                        className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-1.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {dateStr}{" "}
                            <span className="text-muted-foreground font-normal">
                              · {DAY_SHORT[dow]}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-px font-semibold",
                                "bg-muted/60",
                              )}
                            >
                              template: {areaName(templateAreaId)}
                            </span>
                            <span className="mx-1.5">→</span>
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                              style={
                                colorFor(areaId)
                                  ? {
                                      borderLeft: `2px solid ${colorFor(areaId)}`,
                                    }
                                  : undefined
                              }
                            >
                              override: {areaName(areaId)}
                            </Badge>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearOverride(dateStr)}
                          aria-label="Clear override"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          title="Revert to weekly template"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Add-override row */}
              <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <DatePicker
                  value={overrideDate}
                  onValueChange={(v) => setOverrideDate(v)}
                  placeholder="Pick date"
                />
                <Select
                  value={overrideAreaId}
                  onValueChange={setOverrideAreaId}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Area for that date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_AREA_VALUE} className="text-xs">
                      <span className="text-muted-foreground">Off (no coverage)</span>
                    </SelectItem>
                    {activeAreas.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        <span
                          className="mr-1.5 inline-block size-2 rounded-full align-middle"
                          style={{ backgroundColor: a.color }}
                        />
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={addOverride}
                >
                  <Plus className="mr-1 size-3" />
                  Override
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Tip — date overrides are mobile-friendly too. Managers can flip
                an area on the go without rewriting the weekly template.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
