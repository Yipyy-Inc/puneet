"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  BRAND_COLOR_PALETTE,
  BUILTIN_SERVICE_COLORS,
  EMPTY_COLOR_OVERRIDES,
  STATUS_COLOR_MAP,
} from "@/lib/operations-calendar";

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

export function ServiceColorSettings() {
  const {
    daycare,
    boarding,
    grooming,
    training,
    serviceColorOverrides,
    updateDaycare,
    updateBoarding,
    updateGrooming,
    updateTraining,
    updateServiceColorOverrides,
  } = useSettings();
  const { modules } = useCustomServices();

  const builtInServices = useMemo(
    () => [
      {
        key: "Daycare",
        label: "Daycare",
        config: daycare,
        defaultColor: "#0284c7",
        update: updateDaycare,
      },
      {
        key: "Boarding",
        label: "Boarding",
        config: boarding,
        defaultColor: "#8b5cf6",
        update: updateBoarding,
      },
      {
        key: "Grooming",
        label: "Grooming",
        config: grooming,
        defaultColor: "#ec4899",
        update: updateGrooming,
      },
      {
        key: "Training",
        label: "Training",
        config: training,
        defaultColor: "#f97316",
        update: updateTraining,
      },
    ],
    [
      daycare,
      boarding,
      grooming,
      training,
      updateDaycare,
      updateBoarding,
      updateGrooming,
      updateTraining,
    ],
  );

  const otherServices = useMemo(() => {
    const entries: Array<{
      key: string;
      label: string;
      defaultColor: string;
    }> = [];
    for (const [name, color] of Object.entries(BUILTIN_SERVICE_COLORS)) {
      if (!["Daycare", "Boarding", "Grooming", "Training"].includes(name)) {
        entries.push({ key: name, label: name, defaultColor: color });
      }
    }
    return entries;
  }, []);

  const customServices = useMemo(() => {
    return modules
      .filter((m) => m.status === "active")
      .map((m) => ({
        key: m.name,
        label: m.name,
        defaultColor: m.iconColor || "#64748b",
      }));
  }, [modules]);

  const statusEntries = useMemo(() => {
    return Object.entries(STATUS_COLOR_MAP).map(([status, color]) => ({
      key: status,
      label: status,
      defaultColor: color,
    }));
  }, []);

  const overrideCount = useMemo(() => {
    return (
      Object.keys(serviceColorOverrides.services).length +
      Object.keys(serviceColorOverrides.statuses).length
    );
  }, [serviceColorOverrides]);

  const updateServiceColor = useCallback(
    (serviceName: string, hex: string) => {
      updateServiceColorOverrides({
        ...serviceColorOverrides,
        services: { ...serviceColorOverrides.services, [serviceName]: hex },
      });
    },
    [serviceColorOverrides, updateServiceColorOverrides],
  );

  const resetServiceColor = useCallback(
    (serviceName: string) => {
      const next = { ...serviceColorOverrides.services };
      delete next[serviceName];
      updateServiceColorOverrides({ ...serviceColorOverrides, services: next });
    },
    [serviceColorOverrides, updateServiceColorOverrides],
  );

  const updateStatusColor = useCallback(
    (statusLabel: string, hex: string) => {
      updateServiceColorOverrides({
        ...serviceColorOverrides,
        statuses: { ...serviceColorOverrides.statuses, [statusLabel]: hex },
      });
    },
    [serviceColorOverrides, updateServiceColorOverrides],
  );

  const resetStatusColor = useCallback(
    (statusLabel: string) => {
      const next = { ...serviceColorOverrides.statuses };
      delete next[statusLabel];
      updateServiceColorOverrides({ ...serviceColorOverrides, statuses: next });
    },
    [serviceColorOverrides, updateServiceColorOverrides],
  );

  const resetAll = useCallback(() => {
    updateServiceColorOverrides(EMPTY_COLOR_OVERRIDES);
  }, [updateServiceColorOverrides]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200/60">
                <Palette className="size-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle>Service Colors</CardTitle>
                <CardDescription>
                  Assign colors to each service. These colors are used across
                  the system — calendar, badges, and reports — to identify
                  services at a glance.
                </CardDescription>
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
                Reset overrides
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Built-in Services — colors stored on ModuleConfig */}
          <div>
            <p className="mb-2 px-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Built-in Services
            </p>
            <div className="space-y-0.5">
              {builtInServices.map((svc) => {
                const currentColor =
                  serviceColorOverrides.services[svc.key] ??
                  svc.config.color ??
                  svc.defaultColor;
                const hasOverride = Boolean(
                  serviceColorOverrides.services[svc.key],
                );
                return (
                  <ColorRow
                    key={svc.key}
                    label={svc.label}
                    currentColor={currentColor}
                    defaultColor={svc.config.color ?? svc.defaultColor}
                    hasOverride={hasOverride}
                    onColorChange={(hex) => {
                      svc.update({ ...svc.config, color: hex });
                      resetServiceColor(svc.key);
                    }}
                    onReset={() => {
                      svc.update({
                        ...svc.config,
                        color: svc.defaultColor,
                      });
                      resetServiceColor(svc.key);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Other built-in services (Evaluation, Retail / POS, Facility) */}
          {otherServices.length > 0 && (
            <div>
              <p className="mb-2 px-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Other Services
              </p>
              <div className="space-y-0.5">
                {otherServices.map((entry) => {
                  const overridden = serviceColorOverrides.services[entry.key];
                  return (
                    <ColorRow
                      key={entry.key}
                      label={entry.label}
                      currentColor={overridden ?? entry.defaultColor}
                      defaultColor={entry.defaultColor}
                      hasOverride={Boolean(overridden)}
                      onColorChange={(hex) =>
                        updateServiceColor(entry.key, hex)
                      }
                      onReset={() => resetServiceColor(entry.key)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Services */}
          {customServices.length > 0 && (
            <div>
              <p className="mb-2 px-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Custom Services
              </p>
              <div className="space-y-0.5">
                {customServices.map((entry) => {
                  const overridden = serviceColorOverrides.services[entry.key];
                  return (
                    <ColorRow
                      key={entry.key}
                      label={entry.label}
                      currentColor={overridden ?? entry.defaultColor}
                      defaultColor={entry.defaultColor}
                      hasOverride={Boolean(overridden)}
                      onColorChange={(hex) =>
                        updateServiceColor(entry.key, hex)
                      }
                      onReset={() => resetServiceColor(entry.key)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Colors */}
          <div>
            <p className="mb-2 px-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Status Colors
            </p>
            <div className="space-y-0.5">
              {statusEntries.map((entry) => {
                const overridden = serviceColorOverrides.statuses[entry.key];
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
        </CardContent>
      </Card>
    </div>
  );
}
