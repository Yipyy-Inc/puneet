"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  LayoutGrid,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_DAYS = [
  { key: "monday", short: "Mon" },
  { key: "tuesday", short: "Tue" },
  { key: "wednesday", short: "Wed" },
  { key: "thursday", short: "Thu" },
  { key: "friday", short: "Fri" },
  { key: "saturday", short: "Sat" },
  { key: "sunday", short: "Sun" },
] as const;

const PRESET_DURATIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 hr" },
  { minutes: 90, label: "1.5 hr" },
  { minutes: 120, label: "2 hr" },
  { minutes: 180, label: "3 hr" },
  { minutes: 240, label: "4 hr" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function durLabel(minutes: number): string {
  const preset = PRESET_DURATIONS.find((d) => d.minutes === minutes);
  if (preset) return preset.label;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

const PRESET_MINUTE_SET = new Set(PRESET_DURATIONS.map((d) => d.minutes));

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface TimeWindow {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EvaluationBookingWizardSettings() {
  const { evaluation, updateEvaluation } = useSettings();
  const sched = evaluation.schedule;

  const [allowedDays, setAllowedDays] = useState<string[]>(
    sched.allowedDays ?? [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ],
  );
  const [durationOptions, setDurationOptions] = useState<number[]>(
    sched.durationOptionsMinutes,
  );
  const [defaultDuration, setDefaultDuration] = useState<number>(
    sched.defaultDurationMinutes ?? sched.durationOptionsMinutes[0] ?? 120,
  );
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>(
    sched.timeWindows.map((w) => ({ ...w })),
  );
  const [slotMode, setSlotMode] = useState<"fixed" | "window">(sched.slotMode);
  const [fixedStartTimes, setFixedStartTimes] = useState<string[]>([
    ...sched.fixedStartTimes,
  ]);
  const [bufferMinutes, setBufferMinutes] = useState<number>(
    sched.bufferMinutes ?? 0,
  );
  const [capacityPerSlot, setCapacityPerSlot] = useState<number>(
    sched.capacityPerSlot ?? 1,
  );

  const [customHours, setCustomHours] = useState<number>(0);
  const [customMins, setCustomMins] = useState<number>(30);

  // Durations not in the preset list — entered by the facility themselves.
  const customDurations = durationOptions.filter(
    (m) => !PRESET_MINUTE_SET.has(m),
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleDay = (key: string) =>
    setAllowedDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );

  const toggleDuration = (mins: number) =>
    setDurationOptions((prev) => {
      if (prev.includes(mins)) {
        if (prev.length === 1) return prev; // keep at least one
        const next = prev.filter((d) => d !== mins);
        if (defaultDuration === mins) setDefaultDuration(next[0]);
        return next;
      }
      return [...prev, mins].sort((a, b) => a - b);
    });

  const addCustomDuration = () => {
    const total = customHours * 60 + customMins;
    if (total <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }
    if (durationOptions.includes(total)) {
      toast.error("This duration is already in the list");
      return;
    }
    setDurationOptions((prev) => [...prev, total].sort((a, b) => a - b));
    // Reset inputs
    setCustomHours(0);
    setCustomMins(30);
  };

  const addWindow = () =>
    setTimeWindows((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}`,
        label: "New Window",
        startTime: "09:00",
        endTime: "17:00",
      },
    ]);

  const removeWindow = (id: string) =>
    setTimeWindows((prev) => prev.filter((w) => w.id !== id));

  const patchWindow = (
    id: string,
    field: keyof TimeWindow,
    val: string,
  ) =>
    setTimeWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: val } : w)),
    );

  const addFixedTime = () =>
    setFixedStartTimes((prev) => [...prev, "09:00"].sort());

  const removeFixedTime = (idx: number) =>
    setFixedStartTimes((prev) => prev.filter((_, i) => i !== idx));

  const updateFixedTime = (idx: number, val: string) =>
    setFixedStartTimes((prev) =>
      prev.map((t, i) => (i === idx ? val : t)).sort(),
    );

  // ── Preview slots ─────────────────────────────────────────────────────────

  const previewSlots = useMemo(() => {
    const dur = defaultDuration;
    const buf = bufferMinutes ?? 0;
    if (slotMode === "fixed") {
      return fixedStartTimes.flatMap((startTime) => {
        const start = timeToMinutes(startTime);
        const end = start + dur;
        const withinWindow = timeWindows.some(
          (w) =>
            start >= timeToMinutes(w.startTime) &&
            end <= timeToMinutes(w.endTime),
        );
        return withinWindow
          ? [{ startTime, endTime: minutesToTime(end) }]
          : [];
      });
    }
    const generated: { startTime: string; endTime: string }[] = [];
    timeWindows.forEach((w) => {
      const wStart = timeToMinutes(w.startTime);
      const wEnd = timeToMinutes(w.endTime);
      let cur = wStart;
      while (cur + dur <= wEnd) {
        generated.push({
          startTime: minutesToTime(cur),
          endTime: minutesToTime(cur + dur),
        });
        cur += dur + buf;
      }
    });
    return generated;
  }, [slotMode, fixedStartTimes, timeWindows, defaultDuration, bufferMinutes]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (allowedDays.length === 0) {
      toast.error("Select at least one available day");
      return;
    }
    if (timeWindows.length === 0) {
      toast.error("Add at least one availability window");
      return;
    }
    if (slotMode === "fixed" && fixedStartTimes.length === 0) {
      toast.error("Add at least one start time");
      return;
    }
    updateEvaluation({
      ...evaluation,
      schedule: {
        ...sched,
        allowedDays,
        durationOptionsMinutes: durationOptions,
        defaultDurationMinutes: defaultDuration,
        timeWindows,
        slotMode,
        fixedStartTimes,
        bufferMinutes,
        capacityPerSlot,
      },
    });
    toast.success("Booking wizard settings saved");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-600">
            <CalendarDays className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-violet-900">
              Booking Wizard Configuration
            </h2>
            <p className="text-sm text-violet-700">
              Control which days, hours, and session lengths clients see when
              booking an evaluation
            </p>
          </div>
        </div>
      </div>

      {/* ── Available Days ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4" />
            Available Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-xs">
            Clients can only book evaluations on the selected days. Unselected
            days are greyed out in the booking calendar.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map(({ key, short }) => {
              const active = allowedDays.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={cn(
                    "w-12 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                      : "border-border text-muted-foreground hover:border-violet-200",
                  )}
                >
                  {short}
                </button>
              );
            })}
          </div>
          {allowedDays.length === 0 && (
            <p className="text-destructive mt-2 text-xs">
              At least one day must be selected.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Session Lengths ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4" />
            Session Lengths
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">
            Select preset durations or define your own. At least one must be
            enabled.
          </p>

          {/* Presets */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_DURATIONS.map(({ minutes, label }) => {
                const selected = durationOptions.includes(minutes);
                return (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => toggleDuration(minutes)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all",
                      selected
                        ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                        : "border-border text-muted-foreground hover:border-violet-200",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Custom durations */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Custom lengths
            </p>

            {/* Existing custom chips */}
            {customDurations.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {customDurations.map((m) => (
                  <span
                    key={m}
                    className="flex items-center gap-1.5 rounded-lg border-2 border-violet-500 bg-violet-50 pl-3 pr-1.5 py-1 text-sm font-medium text-violet-700"
                  >
                    {durLabel(m)}
                    <button
                      type="button"
                      onClick={() => toggleDuration(m)}
                      className="flex size-4 items-center justify-center rounded-full text-violet-400 hover:bg-violet-200 hover:text-violet-700 transition-colors"
                      aria-label={`Remove ${durLabel(m)}`}
                    >
                      <Trash2 className="size-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom input */}
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">Hours</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={customHours}
                  onChange={(e) =>
                    setCustomHours(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="mt-1 h-9 w-20 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Minutes</Label>
                <Select
                  value={String(customMins)}
                  onValueChange={(v) => setCustomMins(Number(v))}
                >
                  <SelectTrigger className="mt-1 h-9 w-24 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                      (m) => (
                        <SelectItem key={m} value={String(m)}>
                          {String(m).padStart(2, "0")} min
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={addCustomDuration}
                disabled={customHours === 0 && customMins === 0}
              >
                <Plus className="size-3" />
                Add
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 text-[10px]">
              e.g. 1 hr 45 min for a 105-minute evaluation
            </p>
          </div>

          {/* Default selection */}
          {durationOptions.length > 1 && (
            <>
              <Separator />
              <div>
                <Label className="text-xs">Default selection</Label>
                <Select
                  value={String(defaultDuration)}
                  onValueChange={(v) => setDefaultDuration(Number(v))}
                >
                  <SelectTrigger className="mt-1 h-9 w-44 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {durLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  Pre-selected when the client opens the wizard
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Availability Windows ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4" />
            Availability Windows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Define the time ranges during which evaluations can be scheduled.
            Slots are only generated within these windows.
          </p>

          <div className="space-y-2">
            {timeWindows.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2.5"
              >
                <Input
                  value={w.label}
                  onChange={(e) => patchWindow(w.id, "label", e.target.value)}
                  placeholder="Label"
                  className="h-8 w-28 text-sm"
                />
                <span className="text-muted-foreground shrink-0 text-xs">
                  from
                </span>
                <Input
                  type="time"
                  value={w.startTime}
                  onChange={(e) =>
                    patchWindow(w.id, "startTime", e.target.value)
                  }
                  className="h-8 w-28 text-sm"
                />
                <span className="text-muted-foreground shrink-0 text-xs">
                  to
                </span>
                <Input
                  type="time"
                  value={w.endTime}
                  onChange={(e) =>
                    patchWindow(w.id, "endTime", e.target.value)
                  }
                  className="h-8 w-28 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-7 shrink-0 text-rose-500 hover:text-rose-700"
                  onClick={() => removeWindow(w.id)}
                  disabled={timeWindows.length === 1}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={addWindow}
          >
            <Plus className="size-3" />
            Add window
          </Button>
        </CardContent>
      </Card>

      {/* ── Slot Configuration ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <LayoutGrid className="size-4" />
            Slot Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">
            Choose how evaluation time slots are generated and presented in the
            booking wizard.
          </p>

          {/* Slot mode */}
          <div className="space-y-2">
            {(
              [
                {
                  value: "fixed" as const,
                  label: "Fixed start times",
                  desc: "Evaluations begin only at the specific times you define below.",
                },
                {
                  value: "window" as const,
                  label: "Rolling window",
                  desc: "Slots are auto-generated across each window, spaced by the session duration plus buffer.",
                },
              ] as const
            ).map((opt) => (
              <div
                key={opt.value}
                onClick={() => setSlotMode(opt.value)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all",
                  slotMode === opt.value
                    ? "border-primary bg-primary/5 ring-primary ring-1"
                    : "hover:border-muted-foreground/30",
                )}
              >
                <input
                  type="radio"
                  readOnly
                  checked={slotMode === opt.value}
                  className="accent-primary mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-muted-foreground text-xs">{opt.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fixed start times */}
          {slotMode === "fixed" && (
            <>
              <Separator />
              <div>
                <Label className="text-xs">Start times</Label>
                <p className="text-muted-foreground mb-2 text-[10px]">
                  Only times that fall within an availability window will appear
                  in the wizard.
                </p>
                <div className="space-y-1.5">
                  {fixedStartTimes.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={t}
                        onChange={(e) => updateFixedTime(i, e.target.value)}
                        className="h-8 w-32 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-rose-500 hover:text-rose-700"
                        onClick={() => removeFixedTime(i)}
                        disabled={fixedStartTimes.length === 1}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 gap-1.5 text-xs"
                  onClick={addFixedTime}
                >
                  <Plus className="size-3" />
                  Add time
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Buffer & capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Buffer between sessions (min)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                step={5}
                value={bufferMinutes}
                onChange={(e) =>
                  setBufferMinutes(parseInt(e.target.value, 10) || 0)
                }
                className="mt-1 h-9 text-sm"
              />
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                Gap between back-to-back evaluations
              </p>
            </div>
            <div>
              <Label className="text-xs">Pets per slot</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={capacityPerSlot}
                onChange={(e) =>
                  setCapacityPerSlot(parseInt(e.target.value, 10) || 1)
                }
                className="mt-1 h-9 text-sm"
              />
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                Max concurrent evaluations at the same start time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Live Preview ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Eye className="size-4" />
            Booking Wizard Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">
            Based on your configuration, here's what clients will see when
            booking an evaluation.
          </p>

          {/* Days strip */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Available days
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map(({ key, short }) => {
                const active = allowedDays.includes(key);
                return (
                  <span
                    key={key}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-xs font-medium",
                      active
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-border text-muted-foreground opacity-35 line-through",
                    )}
                  >
                    {short}
                  </span>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Slot grid */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Time slots &mdash; {durLabel(defaultDuration)} session
            </p>
            {previewSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-6 text-center">
                <p className="text-muted-foreground text-xs">
                  No slots generated. Check that your start times fall within an
                  availability window.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {previewSlots.map((slot, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center rounded-xl border-2 border-violet-100 bg-violet-50 px-2 py-2.5"
                  >
                    <span className="text-xs font-semibold tabular-nums text-violet-700">
                      {fmtTime(slot.startTime)}
                    </span>
                    <span className="text-[10px] text-violet-400">
                      {fmtTime(slot.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duration chips */}
          {durationOptions.length > 1 && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
                  Duration options shown to client
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {durationOptions.map((m) => (
                    <span
                      key={m}
                      className={cn(
                        "rounded-lg border-2 px-3 py-1 text-xs font-medium",
                        m === defaultDuration
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {durLabel(m)}
                      {m === defaultDuration && (
                        <span className="text-violet-400"> (default)</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} className="gap-1.5 px-6">
          Save Booking Wizard Settings
        </Button>
      </div>
    </div>
  );
}
