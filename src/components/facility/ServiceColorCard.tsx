"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
import type { ModuleConfig } from "@/types/facility";
import { BUILTIN_SERVICE_COLORS } from "@/lib/operations-calendar";
import { RateColorPicker } from "@/components/facility/RateColorPicker";

type BuiltInService = "Boarding" | "Daycare" | "Grooming" | "Training";

interface ServiceColorCardProps {
  service: BuiltInService;
}

export function ServiceColorCard({ service }: ServiceColorCardProps) {
  const {
    daycare,
    boarding,
    grooming,
    training,
    updateDaycare,
    updateBoarding,
    updateGrooming,
    updateTraining,
  } = useSettings();

  const configs: Record<BuiltInService, ModuleConfig> = {
    Daycare: daycare,
    Boarding: boarding,
    Grooming: grooming,
    Training: training,
  };
  const updaters: Record<BuiltInService, (c: ModuleConfig) => void> = {
    Daycare: updateDaycare,
    Boarding: updateBoarding,
    Grooming: updateGrooming,
    Training: updateTraining,
  };

  const config = configs[service];
  const update = updaters[service];
  const defaultColor = BUILTIN_SERVICE_COLORS[service] ?? "#64748b";
  const currentColor = config.color ?? defaultColor;
  const hasOverride = Boolean(config.color) && config.color !== defaultColor;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calendar Color</CardTitle>
            <CardDescription>
              Used on the operations calendar and badges when color mode is set
              to &ldquo;Service Type&rdquo;.
            </CardDescription>
          </div>
          {hasOverride && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ ...config, color: defaultColor })}
              className="gap-1.5 h-8 rounded-lg text-xs text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <RateColorPicker
          value={currentColor}
          onChange={(hex) => update({ ...config, color: hex })}
          label={`${service} Color`}
        />
      </CardContent>
    </Card>
  );
}
