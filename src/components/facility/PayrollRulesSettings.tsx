"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, Plus, Timer, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { useFacilityRole } from "@/hooks/use-facility-role";
import type { PayrollConfig, PayrollHoliday } from "@/lib/settings/payroll";

// ============================================================================
// The overtime rule and the holiday list.
//
// ── WHY THIS EXISTS AT ALL, AND WHY IT SHIPPED WITH THE FUNCTION ──────────
//
// `payroll_summary` learned about overtime and holidays on 2026-08-21, reading
// both from the `payroll_config` domain. A domain with no editor is a setting
// nobody can set — domains.ts says exactly that about `facilityHolidays`, which
// is parked read-only for want of one.
//
// This module has now made the same mistake twice in three days: converting a
// reader and leaving its writer for later, so the approval queues had nothing
// to file into and the org chart had nothing to edit it. The rule earned there
// is that a table's readers and writers ship together, and payroll is the worst
// possible place to break it.
//
// ── THE NUMBERS ARE THE FACILITY'S ────────────────────────────────────────
//
// Nothing here is pre-filled with Quebec's rule, or Ontario's. `enabled` starts
// false and the holiday list starts empty, for the reason `tax_config` starts
// with no tax: a threshold this codebase invented is not a threshold anybody
// agreed to, and it decides what a person is paid.
//
// The screen says so rather than leaving it to be inferred — an unset rule and
// "no overtime is owed here" look identical on a payslip, and only one of them
// is a decision.
// ============================================================================

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** The form, as the saved config would fill it in. */
interface Draft {
  enabled: boolean;
  threshold: string;
  multiplier: string;
  weekStartsOn: string;
  holidays: PayrollHoliday[];
}

function draftFrom(saved: PayrollConfig | undefined): Draft {
  return {
    enabled: saved?.overtime?.enabled ?? false,
    threshold: String(saved?.overtime?.weeklyThresholdHours ?? 40),
    multiplier: String(saved?.overtime?.multiplier ?? 1.5),
    weekStartsOn: String(saved?.weekStartsOn ?? 0),
    holidays: saved?.holidays ?? [],
  };
}

export function PayrollRulesSettings() {
  const { role } = useFacilityRole();
  const { settings, isPending } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const saved = settings.payroll_config.value;

  // ── DERIVED FROM THE SERVER, NOT SEEDED FROM IT ────────────────────────
  //
  // `useState(saved.overtime.enabled)` runs on the FIRST render, when the
  // settings query has not resolved and `saved` is the disabled fallback. The
  // toggle then latched to false for the rest of the page's life, so a facility
  // that HAD configured overtime opened this screen and saw it switched off —
  // and the threshold fields, which only render when it is on, never appeared
  // at all. A browser walk caught it; nothing else could have.
  //
  // Same fix as the availability screen: the server's value is the truth, state
  // holds only what has been EDITED since it arrived.
  const [draft, setDraft] = useState<Draft | null>(null);
  const form = draft ?? draftFrom(saved);
  const { enabled, threshold, multiplier, weekStartsOn, holidays } = form;

  const patch = (changes: Partial<Draft>) =>
    setDraft((prev) => ({ ...(prev ?? draftFrom(saved)), ...changes }));

  const setEnabled = (value: boolean) => patch({ enabled: value });
  const setThreshold = (value: string) => patch({ threshold: value });
  const setMultiplier = (value: string) => patch({ multiplier: value });
  const setWeekStartsOn = (value: string) => patch({ weekStartsOn: value });
  const setHolidays = (
    update: PayrollHoliday[] | ((prev: PayrollHoliday[]) => PayrollHoliday[]),
  ) =>
    patch({
      holidays: typeof update === "function" ? update(form.holidays) : update,
    });

  const thresholdNumber = Number(threshold);
  const multiplierNumber = Number(multiplier);

  // A threshold of zero with the rule ON would make every minute overtime. The
  // function already treats that as unconfigured; refusing it here means a
  // facility gets a sentence rather than a silently ignored setting.
  const badThreshold =
    enabled && (!Number.isFinite(thresholdNumber) || thresholdNumber <= 0);
  const badMultiplier =
    enabled && (!Number.isFinite(multiplierNumber) || multiplierNumber < 1);
  const badHoliday = holidays.some(
    (h) => !/^\d{4}-\d{2}-\d{2}$/.test(h.date) || !h.name.trim(),
  );
  const blocked = badThreshold || badMultiplier || badHoliday;

  const addHoliday = () =>
    setHolidays((prev) => [...prev, { date: "", name: "", multiplier: 1.5 }]);

  const updateHoliday = (index: number, patch: Partial<PayrollHoliday>) =>
    setHolidays((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    );

  const removeHoliday = (index: number) =>
    setHolidays((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (blocked) {
      toast.error("Fix the highlighted fields before saving.");
      return;
    }
    // Awaited, and the failure reported. RLS refuses this write without
    // `manage_settings`, and an unawaited mutation shows the same toast for a
    // refusal as for a success.
    try {
      await saveSetting.mutateAsync({
        domain: "payroll_config",
        value: {
          overtime: {
            enabled,
            weeklyThresholdHours: thresholdNumber,
            multiplier: multiplierNumber,
          },
          holidays: holidays.map((h) => ({
            ...h,
            multiplier: Number(h.multiplier) || 1,
          })),
          weekStartsOn: Number(weekStartsOn),
        } satisfies PayrollConfig,
      });
      setDraft(null);
      toast.success("Payroll rules saved");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Payroll rules were not saved.",
      );
    }
  };

  // "No overtime rule is set" while the request is still in flight is a
  // statement about the facility that nobody has checked.
  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          Only an owner or a manager can change what the facility pays.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-4" /> Overtime
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!enabled ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                No overtime rule is set. Payroll is currently billing every hour
                at the ordinary rate — which is <em>not</em> a statement that no
                overtime is owed here, only that nobody has said what the rule
                is.
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Pay overtime</Label>
              <p className="text-muted-foreground text-xs">
                Hours past the weekly threshold pay at the multiplier below.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled ? (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ot-threshold">Weekly threshold (hours)</Label>
                  <Input
                    id="ot-threshold"
                    inputMode="decimal"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className={badThreshold ? "border-rose-400" : undefined}
                  />
                  {badThreshold ? (
                    <p className="text-xs text-rose-600">
                      Must be more than zero.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ot-multiplier">Multiplier</Label>
                  <Input
                    id="ot-multiplier"
                    inputMode="decimal"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    className={badMultiplier ? "border-rose-400" : undefined}
                  />
                  <p className="text-muted-foreground text-xs">
                    1.5 = time and a half.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Week starts on</Label>
                  <Select value={weekStartsOn} onValueChange={setWeekStartsOn}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, index) => (
                        <SelectItem key={day} value={String(index)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Decides where a week&apos;s hours are counted from.
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4" /> Statutory holidays
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Hours worked on these dates pay at their multiplier. The calendar
            shows them on the roster and payroll bills them — one list, so the
            two cannot disagree. Holiday hours are not <em>also</em> given the
            overtime premium.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {holidays.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No holidays set. Quebec has eight and Ontario nine, and they fall
              on different days — so none are assumed.
            </p>
          ) : (
            holidays.map((holiday, index) => (
              <div
                key={index}
                className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_100px_40px]"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={holiday.date}
                    onChange={(e) =>
                      updateHoliday(index, { date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={holiday.name}
                    placeholder="Fête nationale"
                    onChange={(e) =>
                      updateHoliday(index, { name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Multiplier</Label>
                  <Input
                    inputMode="decimal"
                    value={String(holiday.multiplier)}
                    onChange={(e) =>
                      updateHoliday(index, {
                        multiplier: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeHoliday(index)}
                  aria-label={`Remove ${holiday.name || "holiday"}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
          {badHoliday ? (
            <p className="text-xs text-rose-600">
              Every holiday needs a date and a name.
            </p>
          ) : null}
          <Button variant="outline" size="sm" onClick={addHoliday}>
            <Plus className="mr-1.5 size-3.5" /> Add a holiday
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={blocked || saveSetting.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saveSetting.isPending ? "Saving…" : "Save payroll rules"}
        </Button>
      </div>
    </div>
  );
}
