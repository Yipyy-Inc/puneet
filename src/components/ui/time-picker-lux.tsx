"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HH_MM = string; // "HH:mm"

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(value: string | undefined | null) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function formatDisplay(value: string | undefined) {
  const parsed = parseTime(value);
  if (!parsed) return "";
  const period = parsed.h >= 12 ? "PM" : "AM";
  const hour12 = parsed.h % 12 === 0 ? 12 : parsed.h % 12;
  return `${hour12}:${pad2(parsed.m)} ${period}`;
}

export interface TimePickerLuxProps {
  id?: string;
  value?: HH_MM;
  onValueChange: (next: HH_MM) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  stepMinutes?: number;
  min?: HH_MM;
  max?: HH_MM;
  displayMode?: "popover" | "dialog";
  defaultOpen?: boolean;
}

function toMinutes(time: HH_MM | undefined | null) {
  const parsed = parseTime(time ?? "");
  if (!parsed) return null;
  return parsed.h * 60 + parsed.m;
}

function toMinutes24(hour12: number, minute: number, period: "AM" | "PM") {
  const h24 =
    period === "AM"
      ? hour12 === 12
        ? 0
        : hour12
      : hour12 === 12
        ? 12
        : hour12 + 12;
  return h24 * 60 + minute;
}

export function TimePickerLux({
  id,
  value,
  onValueChange,
  onOpenChange: onOpenChangeProp,
  disabled,
  placeholder = "Select time",
  className,
  stepMinutes = 5,
  min,
  max,
  displayMode = "dialog",
  defaultOpen = false,
}: TimePickerLuxProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChangeProp?.(next);
  };

  const parsed = parseTime(value);
  const currentHour12 = parsed
    ? parsed.h % 12 === 0
      ? 12
      : parsed.h % 12
    : null;
  const currentMinute = parsed ? parsed.m : null;
  const currentPeriod: "AM" | "PM" = parsed
    ? parsed.h >= 12
      ? "PM"
      : "AM"
    : "AM";

  const hours = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    [],
  );
  const minutes = React.useMemo(() => {
    const step = Math.max(1, Math.min(30, Math.round(stepMinutes)));
    const out: number[] = [];
    for (let m = 0; m < 60; m += step) out.push(m);
    return out;
  }, [stepMinutes]);

  const minMinutes = toMinutes(min);
  const maxMinutes = toMinutes(max);

  const inRange = React.useCallback(
    (hour12: number, minute: number, period: "AM" | "PM") => {
      const total = toMinutes24(hour12, minute, period);
      if (minMinutes !== null && total < minMinutes) return false;
      if (maxMinutes !== null && total > maxMinutes) return false;
      return true;
    },
    [minMinutes, maxMinutes],
  );

  const hourDisabled = (h: number) =>
    !minutes.some(
      (m) =>
        inRange(h, m, "AM") ||
        inRange(h, m, "PM"),
    );

  const minuteDisabled = (m: number) => {
    const effectivePeriod: "AM" | "PM" = currentPeriod;
    const effectiveHour = currentHour12 ?? 9;
    return !inRange(effectiveHour, m, effectivePeriod);
  };

  const periodDisabled = (p: "AM" | "PM") => {
    const h = currentHour12 ?? 9;
    return !minutes.some((m) => inRange(h, m, p));
  };

  const commit = (next: {
    hour12: number;
    minute: number;
    period: "AM" | "PM";
  }) => {
    const h24 =
      next.period === "AM"
        ? next.hour12 === 12
          ? 0
          : next.hour12
        : next.hour12 === 12
          ? 12
          : next.hour12 + 12;
    onValueChange(`${pad2(h24)}:${pad2(next.minute)}`);
  };

  const handleHour = (h: number) => {
    commit({
      hour12: h,
      minute: currentMinute ?? 0,
      period: currentPeriod,
    });
  };

  const handleMinute = (m: number) => {
    commit({
      hour12: currentHour12 ?? 9,
      minute: m,
      period: currentPeriod,
    });
  };

  const handlePeriod = (p: "AM" | "PM") => {
    commit({
      hour12: currentHour12 ?? 9,
      minute: currentMinute ?? 0,
      period: p,
    });
  };

  const display = formatDisplay(value);

  const triggerButton = (
    <Button
      id={id}
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "h-9 w-full justify-between border-slate-200 bg-white/90 px-3 text-left font-normal text-slate-900 shadow-xs hover:bg-slate-50",
        !display && "text-muted-foreground",
        className,
      )}
    >
      <span className="truncate tabular-nums">{display || placeholder}</span>
      <Clock className="ml-2 size-4 text-sky-600" />
    </Button>
  );

  const panel = (
    <>
      <div className="border-b border-slate-200 bg-linear-to-r from-sky-50 via-white to-indigo-50 px-3 py-2.5">
        <p className="text-[11px] font-semibold tracking-wider text-sky-700 uppercase">
          Select Time
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
          {display || "--:-- --"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1 p-2">
        <TimeColumn
          label="Hour"
          items={hours.map((h) => ({
            value: h,
            label: String(h),
            disabled: hourDisabled(h),
          }))}
          selectedValue={currentHour12}
          onSelect={handleHour}
        />
        <TimeColumn
          label="Min"
          items={minutes.map((m) => ({
            value: m,
            label: pad2(m),
            disabled: minuteDisabled(m),
          }))}
          selectedValue={currentMinute}
          onSelect={handleMinute}
        />
        <div className="flex flex-col">
          <p className="px-1 pb-1 text-center text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Period
          </p>
          <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/60 p-1">
            {(["AM", "PM"] as const).map((p) => {
              const active = currentPeriod === p;
              const isDisabled = periodDisabled(p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handlePeriod(p)}
                  className={cn(
                    "h-9 rounded-md text-xs font-semibold tabular-nums transition-all duration-200",
                    active
                      ? "bg-linear-to-br from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-900/20"
                      : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-xs",
                    isDisabled &&
                      "cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300 hover:shadow-none",
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            const now = new Date();
            const h12 = now.getHours() % 12 === 0 ? 12 : now.getHours() % 12;
            const period: "AM" | "PM" = now.getHours() >= 12 ? "PM" : "AM";
            const step = Math.max(1, Math.round(stepMinutes));
            const snappedMin = Math.round(now.getMinutes() / step) * step;
            commit({
              hour12: h12,
              minute: Math.min(59, snappedMin),
              period,
            });
          }}
        >
          Now
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 border-slate-200 bg-white text-xs"
          onClick={() => handleOpenChange(false)}
        >
          Done
        </Button>
      </div>
    </>
  );

  if (displayMode === "dialog") {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Trigger asChild>{triggerButton}</DialogPrimitive.Trigger>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-70 bg-black/30 backdrop-blur-[2px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200",
            )}
          />

          <DialogPrimitive.Content
            className={cn(
              "fixed top-1/2 left-1/2 z-71 -translate-x-1/2 -translate-y-1/2",
              "w-[260px] max-w-[calc(100vw-1rem)] overflow-hidden",
              "rounded-xl border border-slate-200 bg-white p-0",
              "shadow-[0_32px_80px_-12px_rgba(2,32,71,0.45)]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
              "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
              "data-[state=open]:slide-in-from-bottom-3 duration-200 ease-out",
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              Select time
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Choose an hour, minute, and period.
            </DialogPrimitive.Description>

            {panel}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[240px] overflow-hidden rounded-xl border border-slate-200 p-0 shadow-[0_20px_50px_-20px_rgba(2,32,71,0.35)]"
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

interface TimeColumnProps {
  label: string;
  items: Array<{ value: number; label: string; disabled?: boolean }>;
  selectedValue: number | null;
  onSelect: (value: number) => void;
}

function TimeColumn({ label, items, selectedValue, onSelect }: TimeColumnProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const activeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedValue]);

  React.useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      const canScroll = node.scrollHeight > node.clientHeight;
      if (!canScroll) return;

      const atTop = node.scrollTop <= 0;
      const atBottom =
        node.scrollTop + node.clientHeight >= node.scrollHeight - 1;

      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      node.scrollBy({ top: event.deltaY, behavior: "auto" });
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div className="flex flex-col">
      <p className="px-1 pb-1 text-center text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <div
        ref={listRef}
        className="scrollbar-thin flex h-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/60 p-1"
      >
        {items.map((item) => {
          const active = selectedValue === item.value;
          return (
            <button
              key={item.value}
              ref={active ? activeRef : null}
              type="button"
              disabled={item.disabled}
              onClick={() => onSelect(item.value)}
              className={cn(
                "h-7 shrink-0 rounded-md text-xs font-medium tabular-nums transition-all duration-150",
                active
                  ? "bg-linear-to-br from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-900/20"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-xs",
                item.disabled &&
                  "cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300 hover:shadow-none",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
