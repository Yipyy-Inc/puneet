"use client";

import { useState } from "react";
import { Clock, TriangleAlert } from "lucide-react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import {
  checkCustomTime,
  hhmmOf,
  minutesOf,
  type TimeWindow,
} from "@/lib/bookings/wizard/time-windows";
import { formatTimeOfDay } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// A drop-off or pick-up time: the facility's times for that day as chips,
// then "Custom time" (the client asked for it, 2026-10-01). A customer's own
// time stays inside opening hours; staff may book any time, and are told
// when it falls outside the usual window.
// ============================================================================

export function TimePicker({
  name,
  label,
  chips,
  value,
  onChange,
  window,
  open,
  asCustomer,
}: {
  /** One per picker on the screen: the radios' group. */
  name: string;
  /** "Drop-off · Thu, Oct 1". */
  label: string;
  chips: readonly number[];
  /** Minutes from midnight; null before a time is chosen. */
  value: number | null;
  onChange: (minutes: number) => void;
  /** The usual window the chips come from. */
  window: TimeWindow;
  /** The facility's opening hours that day. */
  open: TimeWindow;
  asCustomer: boolean;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const time = (minutes: number) => formatTimeOfDay(hhmmOf(minutes), locale);
  const isCustom = value !== null && !chips.includes(value);
  const [custom, setCustom] = useState(isCustom);
  const [typed, setTyped] = useState(value !== null ? hhmmOf(value) : "");
  const check = checkCustomTime(minutesOf(typed), { window, open }, asCustomer);
  const customOn = custom || isCustom;

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={label}>
      <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
        <span className="text-body-strong text-body-ink">{label}</span>
        <span className="text-meta text-ink-tertiary tabular-nums">
          {time(window.start)} – {time(window.end)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((minutes) => (
          <ChoicePill
            key={minutes}
            type="radio"
            name={name}
            value={hhmmOf(minutes)}
            checked={!customOn && value === minutes}
            onChange={() => {
              setCustom(false);
              onChange(minutes);
            }}
            className="tabular-nums"
          >
            {time(minutes)}
          </ChoicePill>
        ))}
        <ChoicePill
          type="radio"
          name={name}
          value="custom"
          checked={customOn}
          onChange={() => {
            setCustom(true);
            const minutes = minutesOf(typed);
            if (
              minutes !== null &&
              checkCustomTime(minutes, { window, open }, asCustomer).ok
            ) {
              onChange(minutes);
            }
          }}
        >
          <Clock aria-hidden className="size-4" />
          {t("wizCustomTime")}
        </ChoicePill>
      </div>
      {customOn ? (
        <div className="flex flex-col gap-1.5">
          <Input
            type="time"
            step={300}
            value={typed}
            min={asCustomer ? hhmmOf(open.start) : undefined}
            max={asCustomer ? hhmmOf(open.end) : undefined}
            aria-label={fill2(t("wizCustomTimeFor"), label)}
            aria-invalid={typed !== "" && !check.ok}
            onChange={(event) => {
              setTyped(event.target.value);
              const minutes = minutesOf(event.target.value);
              if (
                minutes !== null &&
                checkCustomTime(minutes, { window, open }, asCustomer).ok
              ) {
                onChange(minutes);
              }
            }}
            className="w-40"
          />
          {typed !== "" && !check.ok ? (
            <p className="text-meta text-destructive">
              {t("wizCustomTimeClosed")
                .replace("{from}", time(open.start))
                .replace("{to}", time(open.end))}
            </p>
          ) : typed !== "" && check.outside && !asCustomer ? (
            <p className="text-meta text-warning flex items-center gap-1.5">
              <TriangleAlert aria-hidden className="size-4 shrink-0" />
              {t("wizCustomTimeOutside")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function fill2(template: string, label: string): string {
  return template.replace("{label}", label);
}
