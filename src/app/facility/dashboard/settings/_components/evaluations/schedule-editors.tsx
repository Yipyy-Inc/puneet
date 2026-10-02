"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hhmmOf, minutesOf } from "@/lib/bookings/wizard/time-windows";
import { formatTimeOfDay } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { fill } from "@/lib/medications/dose";
import { newRowId } from "@/lib/settings/care-setup";
import type { EvaluationConfig } from "@/types/facility";

import { FieldLabel } from "./step-card";

// ============================================================================
// STEP 2's two list editors (the client's mock):
//
//   Time windows   [Morning] [09:00] to [12:00]  🗑      + Add window
//   Start times    (9:00 AM ×) (11:00 AM ×) … [10:00] + Add
//
// A window is named by the facility, so its name is the facility's words and
// never passes through the catalogue (§5q).
// ============================================================================

type Schedule = EvaluationConfig["schedule"];

export function TimeWindowsEditor({
  schedule,
  onChange,
  t,
}: {
  schedule: Schedule;
  onChange: (windows: Schedule["timeWindows"]) => void;
  t: (key: string) => string;
}) {
  const windows = schedule.timeWindows;
  const update = (index: number, patch: Partial<Schedule["timeWindows"][0]>) =>
    onChange(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FieldLabel>{t("timeWindows")}</FieldLabel>
      <ul className="flex min-w-0 flex-col gap-2">
        {windows.map((window, index) => (
          <li
            key={window.id}
            className="flex min-w-0 flex-wrap items-center gap-2"
          >
            <Input
              aria-label={t("windowName")}
              value={window.label}
              onChange={(event) => update(index, { label: event.target.value })}
              className="w-[150px] font-semibold"
            />
            <Input
              type="time"
              aria-label={fill(t("windowFrom"), { name: window.label })}
              value={window.startTime}
              onChange={(event) =>
                update(index, { startTime: event.target.value })
              }
              className="w-[130px] tabular-nums"
            />
            <span className="text-meta text-ink-tertiary">{t("to")}</span>
            <Input
              type="time"
              aria-label={fill(t("windowTo"), { name: window.label })}
              value={window.endTime}
              onChange={(event) =>
                update(index, { endTime: event.target.value })
              }
              className="w-[130px] tabular-nums"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={fill(t("removeNamed"), { name: window.label })}
              onClick={() => onChange(windows.filter((_, i) => i !== index))}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() =>
          onChange([
            ...windows,
            {
              id: newRowId("window"),
              label: t("windowEvening"),
              startTime: "16:00",
              endTime: "18:00",
            },
          ])
        }
      >
        <Plus aria-hidden />
        {t("addWindow")}
      </Button>
    </div>
  );
}

export function StartTimesEditor({
  schedule,
  onChange,
  t,
  locale,
}: {
  schedule: Schedule;
  onChange: (times: string[]) => void;
  t: (key: string) => string;
  locale: AppLocale;
}) {
  const [next, setNext] = useState("10:00");
  const times = [...schedule.fixedStartTimes].sort(
    (a, b) => (minutesOf(a) ?? 0) - (minutesOf(b) ?? 0),
  );
  const add = () => {
    const minutes = minutesOf(next);
    if (minutes === null) return;
    const value = hhmmOf(minutes);
    if (times.includes(value)) return;
    onChange([...times, value]);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FieldLabel>{t("startTimes")}</FieldLabel>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {times.map((time) => {
          const label = formatTimeOfDay(time, locale);
          return (
            <span
              key={time}
              className="bg-surface-inset text-body-strong text-body-ink flex min-h-10 items-center gap-1 rounded-full py-0.5 pr-1 pl-4 tabular-nums max-lg:min-h-12"
            >
              {label}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={fill(t("removeNamed"), { name: label })}
                onClick={() => onChange(times.filter((x) => x !== time))}
                className="size-8 max-lg:size-10"
              >
                <X aria-hidden />
              </Button>
            </span>
          );
        })}
        <Input
          type="time"
          aria-label={t("newStartTime")}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          className="w-[130px] tabular-nums"
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus aria-hidden />
          {t("addStartTime")}
        </Button>
      </div>
    </div>
  );
}
