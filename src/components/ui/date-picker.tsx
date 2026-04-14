"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { cn } from "@/lib/utils";

type ISODateString = string; // YYYY-MM-DD

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODateString(date: Date): ISODateString {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISODateString(value: string | undefined | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((p) => Number(p));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  // Guard against invalid dates like 2025-02-31
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function parseTypedDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return parseISODateString(`${y}-${pad2(Number(m))}-${pad2(Number(d))}`);
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return parseISODateString(`${y}-${pad2(Number(m))}-${pad2(Number(d))}`);
  }

  return null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export interface DatePickerProps {
  id?: string;
  autoFocus?: boolean;
  value?: ISODateString;
  onValueChange: (next: ISODateString | "") => void;
  placeholder?: string;
  min?: ISODateString;
  max?: ISODateString;
  disabled?: boolean;
  className?: string;
  popoverAlign?: "start" | "center" | "end";
  popoverAlignOffset?: number;
  popoverSide?: "top" | "right" | "bottom" | "left";
  popoverSideOffset?: number;
  popoverAvoidCollisions?: boolean;
  popoverClassName?: string;
  calendarClassName?: string;
  showQuickPresets?: boolean;
  showManualInput?: boolean;
  displayMode?: "popover" | "dialog";
  desktopFixedAnchorClassName?: string;
}

export function DatePicker({
  id,
  autoFocus,
  value,
  onValueChange,
  placeholder = "Select date",
  min,
  max,
  disabled,
  className,
  popoverAlign = "start",
  popoverAlignOffset,
  popoverSide = "bottom",
  popoverSideOffset,
  popoverAvoidCollisions,
  popoverClassName,
  calendarClassName,
  showQuickPresets = true,
  showManualInput = false,
  displayMode = "popover",
  desktopFixedAnchorClassName,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [manualDateInput, setManualDateInput] = React.useState(value ?? "");
  const [manualInputError, setManualInputError] = React.useState("");
  const [isNarrowViewport, setIsNarrowViewport] = React.useState(false);

  const selectedDate = React.useMemo(() => parseISODateString(value), [value]);
  const minDate = React.useMemo(() => parseISODateString(min), [min]);
  const maxDate = React.useMemo(() => parseISODateString(max), [max]);

  React.useEffect(() => {
    setManualDateInput(value ?? "");
    setManualInputError("");
  }, [open, value]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const syncViewport = () => setIsNarrowViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  const useDesktopFixedAnchor =
    displayMode === "popover" &&
    !isNarrowViewport &&
    !!desktopFixedAnchorClassName;

  const effectivePopoverAlign = useDesktopFixedAnchor
    ? "start"
    : isNarrowViewport
      ? "center"
      : popoverAlign;
  const effectivePopoverAlignOffset = useDesktopFixedAnchor
    ? 0
    : isNarrowViewport
      ? 0
      : popoverAlignOffset;
  const effectivePopoverSide = useDesktopFixedAnchor
    ? "bottom"
    : isNarrowViewport
      ? "bottom"
      : popoverSide;
  const effectivePopoverSideOffset = useDesktopFixedAnchor
    ? 0
    : isNarrowViewport
      ? 8
      : popoverSideOffset;
  const effectivePopoverAvoidCollisions = useDesktopFixedAnchor
    ? false
    : isNarrowViewport
      ? true
      : popoverAvoidCollisions;

  const withinLimits = React.useCallback(
    (date: Date) => {
      const normalized = startOfDay(date);
      if (minDate && normalized < startOfDay(minDate)) return false;
      if (maxDate && normalized > startOfDay(maxDate)) return false;
      return true;
    },
    [minDate, maxDate],
  );

  const handleQuickSelect = (date: Date) => {
    if (!withinLimits(date)) return;
    onValueChange(toISODateString(date));
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange("");
    setOpen(false);
  };

  const handleSelectionChange = (dates: Date[]) => {
    if (dates.length === 0) {
      onValueChange("");
      setOpen(false);
      return;
    }
    onValueChange(toISODateString(dates[0]));
    setOpen(false);
  };

  const applyManualDate = () => {
    const typedDate = parseTypedDateInput(manualDateInput);
    if (!typedDate) {
      setManualInputError("Use YYYY-MM-DD or MM/DD/YYYY");
      return;
    }

    if (!withinLimits(typedDate)) {
      if (minDate && typedDate < startOfDay(minDate)) {
        setManualInputError(
          `Date must be on or after ${toISODateString(minDate)}`,
        );
        return;
      }

      if (maxDate && typedDate > startOfDay(maxDate)) {
        setManualInputError(
          `Date must be on or before ${toISODateString(maxDate)}`,
        );
        return;
      }
    }

    setManualInputError("");
    onValueChange(toISODateString(typedDate));
    setOpen(false);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "";

  const quickPresets = [
    { label: "Today", date: startOfDay(new Date()) },
    { label: "Tomorrow", date: startOfDay(addDays(new Date(), 1)) },
    { label: "In 7 Days", date: startOfDay(addDays(new Date(), 7)) },
  ];

  const triggerButton = (
    <Button
      id={id}
      type="button"
      variant="outline"
      autoFocus={autoFocus}
      disabled={disabled}
      className={cn(
        "h-9 w-full justify-between border-slate-200 bg-white/90 px-3 text-left font-normal text-slate-900 shadow-xs hover:bg-slate-50",
        !displayValue && "text-muted-foreground",
        className,
      )}
    >
      <span className="truncate">{displayValue || placeholder}</span>
      <CalendarIcon className="ml-2 size-4 text-sky-600" />
    </Button>
  );

  const calendarPanel = (
    <>
      <div className="border-b border-slate-200 bg-linear-to-r from-sky-50 via-white to-indigo-50 px-3 py-2.5">
        <p className="text-[11px] font-semibold tracking-wider text-sky-700 uppercase">
          Choose Date
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-700">
          {displayValue || "No date selected"}
        </p>
      </div>

      <div className="space-y-2.5 p-3">
        {showManualInput && (
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
            <p className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
              Type Date
            </p>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={manualDateInput}
                onChange={(event) => {
                  setManualDateInput(event.target.value);
                  if (manualInputError) {
                    setManualInputError("");
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyManualDate();
                  }
                }}
                placeholder="YYYY-MM-DD or MM/DD/YYYY"
                className={cn(
                  "h-8 flex-1 rounded-md border bg-white px-2.5 text-xs outline-none",
                  "focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200",
                  manualInputError.length > 0
                    ? "border-rose-300 text-rose-700"
                    : "border-slate-200 text-slate-700",
                )}
                aria-label="Type date manually"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-slate-200 bg-white px-3 text-xs"
                onClick={applyManualDate}
              >
                Apply
              </Button>
            </div>
            <p
              className={cn(
                "mt-1 text-[10px]",
                manualInputError.length > 0
                  ? "text-rose-600"
                  : "text-slate-500",
              )}
            >
              {manualInputError || "Format: YYYY-MM-DD or MM/DD/YYYY"}
            </p>
          </div>
        )}

        {showQuickPresets && (
          <div className="flex flex-wrap items-center gap-1.5">
            {quickPresets.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                disabled={!withinLimits(preset.date)}
                className="h-7 rounded-full border-slate-200 bg-white text-[11px] text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                onClick={() => handleQuickSelect(preset.date)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        <DateSelectionCalendar
          mode="single"
          selectedDates={selectedDate ? [selectedDate] : []}
          onSelectionChange={handleSelectionChange}
          enableAvailabilityRules={false}
          showTimeSelection={false}
          minDate={minDate ?? undefined}
          maxDate={maxDate ?? undefined}
          initialMonth={selectedDate ?? new Date()}
          className={cn(
            "rounded-lg border border-slate-200/80 bg-white p-2",
            calendarClassName,
          )}
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          {(value ?? "").length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-slate-200 bg-white text-xs"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </>
  );

  if (displayMode === "dialog") {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger asChild>
          {triggerButton}
        </DialogPrimitive.Trigger>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-70 bg-black/55 backdrop-blur-[1px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300",
            )}
          />

          <DialogPrimitive.Content
            className={cn(
              "fixed top-1/2 left-1/2 z-71 -translate-x-1/2 -translate-y-1/2",
              "max-h-[90vh] w-[380px] max-w-[calc(100vw-1rem)] overflow-y-auto",
              "rounded-xl border border-slate-200 bg-white p-0",
              "shadow-[0_32px_80px_-12px_rgba(0,0,0,0.45)]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
              "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
              "data-[state=open]:slide-in-from-bottom-3 duration-200 ease-out",
              popoverClassName,
              isNarrowViewport &&
                "w-[min(92vw,340px)]! max-w-[calc(100vw-1rem)]!",
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              Select date
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Choose a date from the calendar.
            </DialogPrimitive.Description>

            {calendarPanel}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {useDesktopFixedAnchor && (
        <PopoverAnchor asChild>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none fixed z-60 h-0 w-0",
              desktopFixedAnchorClassName,
            )}
          />
        </PopoverAnchor>
      )}

      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>

      <PopoverContent
        align={effectivePopoverAlign}
        alignOffset={effectivePopoverAlignOffset}
        side={effectivePopoverSide}
        sideOffset={effectivePopoverSideOffset}
        avoidCollisions={effectivePopoverAvoidCollisions}
        className={cn(
          "w-[380px] max-w-[calc(100vw-1rem)] overflow-hidden border-slate-200 p-0 max-sm:w-[calc(100vw-1rem)]",
          popoverClassName,
          isNarrowViewport && "w-[min(92vw,340px)]! max-w-[calc(100vw-1rem)]!",
        )}
      >
        {calendarPanel}
      </PopoverContent>
    </Popover>
  );
}
