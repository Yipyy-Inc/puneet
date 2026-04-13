"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Palette, RotateCcw, X } from "lucide-react";
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
  hexToRgba,
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
              "size-7 rounded-lg transition-all duration-200 flex items-center justify-center",
              "hover:scale-110 active:scale-95 ring-1",
              selected
                ? "ring-2 ring-offset-2 ring-slate-900 shadow-md"
                : "ring-slate-200/60 hover:ring-slate-300 shadow-sm hover:shadow-md",
            )}
            style={{ backgroundColor: hex }}
          >
            {selected && <Check className="size-3.5 text-white drop-shadow-md" />}
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
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded((prev) => !prev); } }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <span
          className="size-5 rounded-lg shrink-0 shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: currentColor }}
        />
        <span className="flex-1 text-left text-[13px] font-semibold text-slate-700 truncate capitalize">
          {label}
        </span>
        {hasOverride && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="opacity-0 group-hover:opacity-100 size-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
            title="Reset to default"
          >
            <RotateCcw className="size-3" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
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
            <p className="text-[10px] text-slate-400 mt-1.5 px-1">
              Default: <span className="font-semibold">{BRAND_COLOR_PALETTE.find((c) => c.hex === defaultColor)?.name ?? defaultColor}</span>
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
    const entries: Array<{ key: string; label: string; defaultColor: string }> = [];
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
          className="gap-2 h-10 rounded-full px-5 transition-all duration-300 border shadow-sm bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/60 hover:border-slate-300 hover:shadow-md"
        >
          <Palette className="size-4 text-slate-400" />
          <span className="font-medium">Colors</span>
          {overrideCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 ml-1 text-[11px] font-bold rounded-full bg-indigo-500 text-white shadow-inner">
              {overrideCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200/60">
                <Palette className="size-4.5 text-indigo-600" />
              </div>
              <div>
                <SheetTitle className="text-sm font-black text-slate-800 tracking-tight leading-none">
                  Event Colors
                </SheetTitle>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customize calendar event colors
                </p>
              </div>
            </div>
            {overrideCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="text-xs text-slate-500 hover:text-slate-700 gap-1.5 h-8 rounded-lg"
              >
                <RotateCcw className="size-3" />
                Reset all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Services section */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-3">
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
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-3">
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
