"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  type CalendarColorOverrides,
  BRAND_COLOR_PALETTE,
  BUILTIN_SERVICE_COLORS,
  EMPTY_COLOR_OVERRIDES,
  STATUS_COLOR_MAP,
} from "@/lib/operations-calendar";

interface OperationsCalendarColorPanelProps {
  colorOverrides: CalendarColorOverrides;
  onColorOverridesChange: (overrides: CalendarColorOverrides) => void;
  /** Additional service names from custom modules */
  customServiceNames?: string[];
}

function ColorSwatch({
  hex,
  name,
  selected,
  onSelect,
}: {
  hex: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg transition-all duration-200",
              "ring-1 hover:scale-110 active:scale-95",
              selected
                ? "shadow-md ring-2 ring-slate-900 ring-offset-2"
                : "shadow-sm ring-slate-200/60 hover:shadow-md hover:ring-slate-300",
            )}
            style={{ backgroundColor: hex }}
          >
            {selected && (
              <Check className="size-3.5 text-white drop-shadow-md" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ColorRow({
  label,
  currentColor,
  defaultColor,
  onColorChange,
  onReset,
  hasOverride,
}: {
  label: string;
  currentColor: string;
  defaultColor: string;
  onColorChange: (hex: string) => void;
  onReset: () => void;
  hasOverride: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
      >
        <span
          className="size-5 shrink-0 rounded-lg shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: currentColor }}
        />
        <span className="flex-1 truncate text-left text-[13px] font-semibold text-slate-700 capitalize">
          {label}
        </span>
        {hasOverride && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="flex size-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-600"
            title="Reset to default"
          >
            <RotateCcw className="size-3" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-2 px-3 pt-1 pb-3 duration-200">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
            {BRAND_COLOR_PALETTE.map((color) => (
              <ColorSwatch
                key={color.hex}
                hex={color.hex}
                name={color.name}
                selected={currentColor === color.hex}
                onSelect={() => onColorChange(color.hex)}
              />
            ))}
          </div>
          {hasOverride && (
            <p className="mt-1.5 px-1 text-[10px] text-slate-400">
              Default:{" "}
              <span className="font-semibold">
                {BRAND_COLOR_PALETTE.find((c) => c.hex === defaultColor)
                  ?.name ?? defaultColor}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OperationsCalendarColorPanel({
  colorOverrides,
  onColorOverridesChange,
  customServiceNames = [],
}: OperationsCalendarColorPanelProps) {
  const [open, setOpen] = useState(false);

  const serviceEntries = useMemo(() => {
    const entries: Array<{ key: string; label: string; defaultColor: string }> =
      [];
    for (const [name, color] of Object.entries(BUILTIN_SERVICE_COLORS)) {
      entries.push({ key: name, label: name, defaultColor: color });
    }
    for (const name of customServiceNames) {
      if (!BUILTIN_SERVICE_COLORS[name]) {
        entries.push({ key: name, label: name, defaultColor: "#64748b" });
      }
    }
    return entries;
  }, [customServiceNames]);

  const statusEntries = useMemo(() => {
    return Object.entries(STATUS_COLOR_MAP).map(([status, color]) => ({
      key: status,
      label: status,
      defaultColor: color,
    }));
  }, []);

  const overrideCount = useMemo(() => {
    return (
      Object.keys(colorOverrides.services).length +
      Object.keys(colorOverrides.statuses).length
    );
  }, [colorOverrides]);

  const updateServiceColor = useCallback(
    (serviceName: string, hex: string) => {
      onColorOverridesChange({
        ...colorOverrides,
        services: { ...colorOverrides.services, [serviceName]: hex },
      });
    },
    [colorOverrides, onColorOverridesChange],
  );

  const resetServiceColor = useCallback(
    (serviceName: string) => {
      const next = { ...colorOverrides.services };
      delete next[serviceName];
      onColorOverridesChange({ ...colorOverrides, services: next });
    },
    [colorOverrides, onColorOverridesChange],
  );

  const updateStatusColor = useCallback(
    (statusLabel: string, hex: string) => {
      onColorOverridesChange({
        ...colorOverrides,
        statuses: { ...colorOverrides.statuses, [statusLabel]: hex },
      });
    },
    [colorOverrides, onColorOverridesChange],
  );

  const resetStatusColor = useCallback(
    (statusLabel: string) => {
      const next = { ...colorOverrides.statuses };
      delete next[statusLabel];
      onColorOverridesChange({ ...colorOverrides, statuses: next });
    },
    [colorOverrides, onColorOverridesChange],
  );

  const resetAll = useCallback(() => {
    onColorOverridesChange(EMPTY_COLOR_OVERRIDES);
  }, [onColorOverridesChange]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-full border border-slate-200/60 bg-white/80 px-5 text-slate-600 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md"
        >
          <Palette className="size-4 text-slate-400" />
          <span className="font-medium">Colors</span>
          {overrideCount > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[11px] font-bold text-white shadow-inner">
              {overrideCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[380px] flex-col p-0 sm:w-[420px]"
      >
        <SheetHeader className="shrink-0 border-b border-slate-100 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200/60">
                <Palette className="size-4.5 text-indigo-600" />
              </div>
              <div>
                <SheetTitle className="text-sm leading-none font-black tracking-tight text-slate-800">
                  Event Colors
                </SheetTitle>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Customize calendar event colors
                </p>
              </div>
            </div>
            {overrideCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="h-8 gap-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700"
              >
                <RotateCcw className="size-3" />
                Reset all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {/* Services section */}
          <div>
            <p className="mb-2 px-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Services
            </p>
            <div className="space-y-0.5">
              {serviceEntries.map((entry) => {
                const overridden = colorOverrides.services[entry.key];
                return (
                  <ColorRow
                    key={entry.key}
                    label={entry.label}
                    currentColor={overridden ?? entry.defaultColor}
                    defaultColor={entry.defaultColor}
                    hasOverride={Boolean(overridden)}
                    onColorChange={(hex) => updateServiceColor(entry.key, hex)}
                    onReset={() => resetServiceColor(entry.key)}
                  />
                );
              })}
            </div>
          </div>

          {/* Statuses section */}
          <div>
            <p className="mb-2 px-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Statuses
            </p>
            <div className="space-y-0.5">
              {statusEntries.map((entry) => {
                const overridden = colorOverrides.statuses[entry.key];
                return (
                  <ColorRow
                    key={entry.key}
                    label={entry.label}
                    currentColor={overridden ?? entry.defaultColor}
                    defaultColor={entry.defaultColor}
                    hasOverride={Boolean(overridden)}
                    onColorChange={(hex) => updateStatusColor(entry.key, hex)}
                    onReset={() => resetStatusColor(entry.key)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
