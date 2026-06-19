"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CustomServiceModule,
  CustomServiceWeekday,
} from "@/types/facility";
import {
  CUSTOM_SERVICE_WEEKDAYS,
  createDefaultOperatingHoursOverride,
  DEFAULT_CUSTOM_SERVICE_BOOKING_WINDOW,
  DEFAULT_CUSTOM_SERVICE_RECURRENCE,
} from "@/data/custom-services";
import { cn } from "@/lib/utils";

type CalendarConfig = CustomServiceModule["calendar"];

interface AvailabilityRulesProps {
  calendar: CalendarConfig;
  onChange: (updates: Partial<CalendarConfig>) => void;
}

export function AvailabilityRules({
  calendar,
  onChange,
}: AvailabilityRulesProps) {
  const operatingHours =
    calendar.operatingHoursOverride ?? createDefaultOperatingHoursOverride();
  const bookingWindow =
    calendar.bookingWindow ?? DEFAULT_CUSTOM_SERVICE_BOOKING_WINDOW;
  const recurrence = calendar.recurrence ?? DEFAULT_CUSTOM_SERVICE_RECURRENCE;

  const updateOperatingDay = (
    day: CustomServiceWeekday,
    updates: Partial<(typeof operatingHours.days)[number]>,
  ) => {
    onChange({
      operatingHoursOverride: {
        ...operatingHours,
        days: operatingHours.days.map((d) =>
          d.day === day ? { ...d, ...updates } : d,
        ),
      },
    });
  };

  return (
    <>
      <Separator />

      {/* Operating Hours Override */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-semibold">
              Operating Hours Override
            </Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Restrict this service to its own weekly hours, separate from the
              facility&apos;s global hours (e.g. a pool open only Wed–Sat).
            </p>
          </div>
          <Switch
            checked={operatingHours.enabled}
            onCheckedChange={(enabled) =>
              onChange({
                operatingHoursOverride: { ...operatingHours, enabled },
              })
            }
          />
        </div>

        {operatingHours.enabled && (
          <div className="border-border space-y-1.5 rounded-lg border p-3">
            {CUSTOM_SERVICE_WEEKDAYS.map(({ value, label }) => {
              const day = operatingHours.days.find((d) => d.day === value);
              if (!day) return null;
              return (
                <div
                  key={value}
                  className="grid grid-cols-[6rem_auto_1fr] items-center gap-3"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={(isOpen) =>
                      updateOperatingDay(value, { isOpen })
                    }
                    aria-label={`${label} open`}
                  />
                  {day.isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={day.openTime}
                        onChange={(e) =>
                          updateOperatingDay(value, {
                            openTime: e.target.value,
                          })
                        }
                        className="w-32"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="time"
                        value={day.closeTime}
                        onChange={(e) =>
                          updateOperatingDay(value, {
                            closeTime: e.target.value,
                          })
                        }
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Closed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Booking Window */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Booking Window</Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            How far ahead clients can book and how much notice they must give.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="max-advance-days">Book up to (days ahead)</Label>
            <Input
              id="max-advance-days"
              type="number"
              min={0}
              value={bookingWindow.maxAdvanceDays}
              onChange={(e) =>
                onChange({
                  bookingWindow: {
                    ...bookingWindow,
                    maxAdvanceDays: parseInt(e.target.value) || 0,
                  },
                })
              }
            />
            <p className="text-muted-foreground text-xs">
              e.g. clients can book up to 30 days in advance.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min-advance-hours">
              Minimum advance notice (hours)
            </Label>
            <Input
              id="min-advance-hours"
              type="number"
              min={0}
              value={bookingWindow.minAdvanceHours}
              onChange={(e) =>
                onChange({
                  bookingWindow: {
                    ...bookingWindow,
                    minAdvanceHours: parseInt(e.target.value) || 0,
                  },
                })
              }
            />
            <p className="text-muted-foreground text-xs">
              e.g. bookings must be made at least 2 hours before the session.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Recurrence */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Recurrence</Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Whether a booking is a single session or repeats on a schedule.
          </p>
        </div>
        <div role="radiogroup" aria-label="Recurrence" className="flex gap-3">
          {(
            [
              {
                value: "one_time",
                title: "One-Time",
                description: "A single scheduled session",
              },
              {
                value: "recurring",
                title: "Recurring",
                description: "Repeats weekly or bi-weekly",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={recurrence.mode === opt.value}
              onClick={() =>
                onChange({ recurrence: { ...recurrence, mode: opt.value } })
              }
              className={cn(
                "flex-1 rounded-lg border-2 p-3 text-left transition-colors",
                recurrence.mode === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-border/80 hover:bg-accent/30",
              )}
            >
              <p className="text-sm font-semibold">{opt.title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {opt.description}
              </p>
            </button>
          ))}
        </div>

        {recurrence.mode === "recurring" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={recurrence.frequency}
                onValueChange={(v) =>
                  onChange({
                    recurrence: {
                      ...recurrence,
                      frequency: v as typeof recurrence.frequency,
                    },
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-recurring-sessions">
                Max recurring sessions
              </Label>
              <Input
                id="max-recurring-sessions"
                type="number"
                min={1}
                value={recurrence.maxSessions}
                onChange={(e) =>
                  onChange({
                    recurrence: {
                      ...recurrence,
                      maxSessions: parseInt(e.target.value) || 1,
                    },
                  })
                }
              />
              <p className="text-muted-foreground text-xs">
                Caps how many sessions are generated from one booking.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
