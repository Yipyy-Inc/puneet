"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { dayWindows, hhmmOf } from "@/lib/bookings/wizard/time-windows";
import { formatWeekday } from "@/lib/i18n/format";
import type {
  DropOffPickUpHours,
  ServiceTimeWindows,
} from "@/lib/settings/service-time-windows";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// DROP-OFF AND PICK-UP HOURS, where a facility sets them (the client,
// 2026-10-01: "the times it shows for drop off and pick up need to be
// according to the facility"). Boarding's per weekday, daycare's per day type;
// a row left off takes the opening hours, as the booking wizard always did.
// Saved as `service_time_windows`, the other service's half untouched.
// ============================================================================

type Row = { key: string; label: string; hours: DropOffPickUpHours | null };

const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

function valid(hours: DropOffPickUpHours): boolean {
  return (
    hours.dropOff.start < hours.dropOff.end &&
    hours.pickUp.start < hours.pickUp.end
  );
}

export function DropOffHoursCard({
  service,
}: {
  service: "boarding" | "daycare";
}) {
  const { t, fill, locale } = useStaffText("serviceHours");
  const { settings, isPending } = useFacilitySettings();
  const { hours, scheduleTimeOverrides } = useSettings();
  const save = useSaveFacilitySetting();
  const stored: ServiceTimeWindows = settings.service_time_windows.value;
  // Null until somebody edits: what shows is what is stored, so hours that
  // have not loaded yet can never be saved over the real ones.
  const [draft, setDraft] = useState<ServiceTimeWindows | null>(null);
  const value = draft ?? stored;

  /** What a booking offers that day when the facility sets nothing. */
  const fromOpening = (weekday: number, part: "full" | "am" | "pm") => {
    // A date in a week with every weekday, for the weekly hours.
    const date = new Date(2026, 0, 4 + weekday);
    const day = dayWindows({
      date,
      service,
      part,
      hours,
      overrides: scheduleTimeOverrides,
    });
    return day
      ? {
          dropOff: {
            start: hhmmOf(day.dropOff.start),
            end: hhmmOf(day.dropOff.end),
          },
          pickUp: {
            start: hhmmOf(day.pickUp.start),
            end: hhmmOf(day.pickUp.end),
          },
        }
      : {
          dropOff: { start: "07:00", end: "11:00" },
          pickUp: { start: "15:00", end: "19:00" },
        };
  };

  const rows: Row[] =
    service === "boarding"
      ? WEEK.map((weekday) => {
          const day = value.boarding?.find((d) => d.weekday === weekday);
          return {
            key: String(weekday),
            label: formatWeekday(weekday, locale, "long"),
            hours: day ? { dropOff: day.dropOff, pickUp: day.pickUp } : null,
          };
        })
      : (["full", "am", "pm"] as const).map((part) => ({
          key: part,
          label: t(
            part === "full"
              ? "fullDay"
              : part === "am"
                ? "morning"
                : "afternoon",
          ),
          hours: value.daycare?.[part] ?? null,
        }));

  const setRow = (key: string, hours: DropOffPickUpHours | null) => {
    if (service === "boarding") {
      const weekday = Number(key);
      const others = (value.boarding ?? []).filter(
        (d) => d.weekday !== weekday,
      );
      setDraft({
        ...value,
        boarding: (hours ? [...others, { weekday, ...hours }] : others).sort(
          (a, b) => a.weekday - b.weekday,
        ),
      });
      return;
    }
    const part = key as "full" | "am" | "pm";
    const daycare = { ...(value.daycare ?? {}) };
    if (hours) daycare[part] = hours;
    else delete daycare[part];
    setDraft({ ...value, daycare });
  };

  const invalid = rows.some((row) => row.hours && !valid(row.hours));
  const changed =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(stored);

  const submit = () => {
    if (isPending || !changed || invalid) return;
    save.mutate(
      { domain: "service_time_windows", value },
      {
        onSuccess: () => {
          setDraft(null);
          toast.success(t("saved"));
        },
        onError: (error) =>
          toast.error(t("saveFailed"), { description: error.message }),
      },
    );
  };

  const time = (
    id: string,
    label: string,
    current: string,
    onChange: (next: string) => void,
  ) => (
    <Input
      id={id}
      type="time"
      step={900}
      aria-label={label}
      className="w-32 tabular-nums"
      value={current}
      disabled={isPending || save.isPending}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return (
    <Card id={`${service}-drop-off-hours`}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t(
            service === "boarding"
              ? "descriptionBoarding"
              : "descriptionDaycare",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row) => {
          const id = `${service}-hours-${row.key}`;
          const bad = !!row.hours && !valid(row.hours);
          return (
            <div
              key={row.key}
              className="border-line flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <span className="text-body-strong text-body-ink">
                  {row.label}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-meta text-ink-tertiary">
                    {row.hours ? t("ownHours") : t("usesOpening")}
                  </span>
                  <Switch
                    id={`${id}-on`}
                    aria-label={fill("setFor", { day: row.label })}
                    checked={!!row.hours}
                    disabled={isPending || save.isPending}
                    onCheckedChange={(on) =>
                      setRow(
                        row.key,
                        on
                          ? fromOpening(
                              service === "boarding" ? Number(row.key) : 1,
                              service === "boarding"
                                ? "full"
                                : (row.key as "full" | "am" | "pm"),
                            )
                          : null,
                      )
                    }
                  />
                </div>
              </div>
              {row.hours ? (
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  {(["dropOff", "pickUp"] as const).map((kind) => {
                    const window = row.hours![kind];
                    const put = (patch: Partial<typeof window>) =>
                      setRow(row.key, {
                        ...row.hours!,
                        [kind]: { ...window, ...patch },
                      });
                    return (
                      <div
                        key={kind}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="text-meta text-ink-secondary w-24">
                          {t(kind === "dropOff" ? "dropOff" : "pickUp")}
                        </span>
                        {time(
                          `${id}-${kind}-start`,
                          t(
                            kind === "dropOff" ? "dropOffStart" : "pickUpStart",
                          ),
                          window.start,
                          (start) => put({ start }),
                        )}
                        <span className="text-meta text-ink-tertiary">
                          {t("toWord")}
                        </span>
                        {time(
                          `${id}-${kind}-end`,
                          t(kind === "dropOff" ? "dropOffEnd" : "pickUpEnd"),
                          window.end,
                          (end) => put({ end }),
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {bad ? (
                <p role="alert" className="text-meta text-destructive">
                  {t("invalid")}
                </p>
              ) : null}
            </div>
          );
        })}

        <Button
          type="button"
          className="self-start"
          loading={save.isPending}
          disabled={isPending || !changed || invalid}
          onClick={submit}
        >
          {save.isPending ? null : <Save aria-hidden />}
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
