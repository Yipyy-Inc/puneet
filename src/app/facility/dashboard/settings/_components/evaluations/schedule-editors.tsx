"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
              className="bg-surface-inset-2 text-body-ink flex h-[38px] items-center gap-1 rounded-full pr-1.5 pl-3.5 text-[14px] font-bold tabular-nums"
            >
              {label}
              <button
                type="button"
                aria-label={fill(t("removeNamed"), { name: label })}
                onClick={() => onChange(times.filter((x) => x !== time))}
                className="text-ink-tertiary focus-visible:outline-primary grid size-[26px] place-items-center rounded-full text-[16px] font-normal focus-visible:outline-2"
              >
                <span aria-hidden>×</span>
              </button>
            </span>
          );
        })}
        <Input
          type="time"
          aria-label={t("newStartTime")}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          className="h-[38px] w-[130px] rounded-[12px] px-2.5 text-[14px] tabular-nums max-lg:h-[38px]"
        />
        <button
          type="button"
          onClick={add}
          className="text-body-ink focus-visible:outline-primary flex h-[38px] items-center gap-1 rounded-full border-[1.5px] border-dashed border-(--empty-ring) px-3.5 text-[13.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span aria-hidden>+</span>
          {t("addStartTime")}
        </button>
      </div>
    </div>
  );
}
