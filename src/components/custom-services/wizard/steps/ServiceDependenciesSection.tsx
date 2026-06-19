"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2 } from "lucide-react";
import type { CustomServiceModule } from "@/types/facility";
import { defaultCustomServiceModules } from "@/data/custom-services";

type DepsConfig = NonNullable<CustomServiceModule["serviceDependencies"]>;
type RequiredService = NonNullable<DepsConfig["requiresServices"]>[number];

const STANDARD_DEP_SERVICES: { id: string; name: string }[] = [
  { id: "daycare", name: "Daycare" },
  { id: "boarding", name: "Boarding" },
  { id: "grooming", name: "Grooming" },
  { id: "training", name: "Training" },
];

const DEPENDENCY_TYPES: { value: RequiredService["type"]; label: string }[] = [
  { value: "same_day", label: "Active booking on the same day" },
  { value: "concurrent", label: "Concurrent (overlapping) booking" },
  { value: "any_active", label: "Any active booking" },
];

interface ServiceDependenciesSectionProps {
  value: DepsConfig;
  onChange: (patch: Partial<DepsConfig>) => void;
  /** Current module id, excluded from the selectable services. */
  currentModuleId: string;
}

export function ServiceDependenciesSection({
  value: deps,
  onChange,
  currentModuleId,
}: ServiceDependenciesSectionProps) {
  const requiresAnother = !!deps.requiresServices?.length;
  const isStandalone = !deps.addonOnly && !requiresAnother;
  const required = deps.requiresServices?.[0];

  const serviceOptions = [
    ...STANDARD_DEP_SERVICES,
    ...defaultCustomServiceModules
      .filter((m) => m.id !== currentModuleId && m.status === "active")
      .map((m) => ({ id: m.id, name: m.name })),
  ];

  // Keep the current selection visible even if it's no longer in the list
  // (e.g. a removed module), so the Select trigger doesn't render blank.
  if (
    required?.moduleId &&
    !serviceOptions.some((o) => o.id === required.moduleId)
  ) {
    serviceOptions.push({ id: required.moduleId, name: required.moduleName });
  }

  const setRequiredService = (moduleId: string) => {
    const opt = serviceOptions.find((o) => o.id === moduleId);
    onChange({
      requiresServices: [
        {
          moduleId,
          moduleName: opt?.name ?? moduleId,
          type: required?.type ?? "same_day",
        },
      ],
    });
  };

  const setDependencyType = (type: RequiredService["type"]) => {
    if (!required) return;
    onChange({ requiresServices: [{ ...required, type }] });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="size-5" />
        <h3 className="text-sm font-semibold">Service Dependencies</h3>
      </div>

      <div className="space-y-3">
        <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 rounded-md border p-3">
          <input
            type="radio"
            name="depType"
            checked={isStandalone}
            onChange={() =>
              onChange({ addonOnly: false, requiresServices: [] })
            }
            className="accent-primary"
          />
          <div>
            <p className="text-sm font-medium">Standalone service</p>
            <p className="text-muted-foreground text-xs">
              Can be booked independently
            </p>
          </div>
        </label>

        <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 rounded-md border p-3">
          <input
            type="radio"
            name="depType"
            checked={requiresAnother}
            onChange={() =>
              onChange({
                addonOnly: false,
                requiresServices: [
                  {
                    moduleId: STANDARD_DEP_SERVICES[1].id,
                    moduleName: STANDARD_DEP_SERVICES[1].name,
                    type: "same_day",
                  },
                ],
              })
            }
            className="accent-primary"
          />
          <div>
            <p className="text-sm font-medium">Requires another service</p>
            <p className="text-muted-foreground text-xs">
              Client must also have a booking for…
            </p>
          </div>
        </label>

        {requiresAnother && (
          <div className="bg-muted/30 ml-6 space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Required service</Label>
                <Select
                  value={required?.moduleId ?? ""}
                  onValueChange={setRequiredService}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Requirement</Label>
                <Select
                  value={required?.type ?? "same_day"}
                  onValueChange={(v) =>
                    setDependencyType(v as RequiredService["type"])
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPENDENCY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">
                Minimum client tenure (days, optional)
              </Label>
              <Input
                type="number"
                min={0}
                value={deps.minClientTenureDays ?? ""}
                onChange={(e) =>
                  onChange({
                    minClientTenureDays: e.target.value
                      ? parseInt(e.target.value) || undefined
                      : undefined,
                  })
                }
                placeholder="e.g. 30"
                className="h-8 w-40 text-xs"
              />
              <p className="text-muted-foreground text-[11px]">
                Must have been a client for at least this many days before
                booking.
              </p>
            </div>
          </div>
        )}

        <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 rounded-md border p-3">
          <input
            type="radio"
            name="depType"
            checked={!!deps.addonOnly}
            onChange={() =>
              onChange({
                addonOnly: true,
                addonFor: ["grooming", "boarding"],
                requiresServices: [],
              })
            }
            className="accent-primary"
          />
          <div>
            <p className="text-sm font-medium">Add-on only</p>
            <p className="text-muted-foreground text-xs">
              Only available as an add-on to another booking
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
