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
import { useSettingsText } from "@/lib/settings/use-settings-text";

type BuiltInService = "Boarding" | "Daycare" | "Grooming" | "Training";

interface ServiceColorCardProps {
  service: BuiltInService;
}

export function ServiceColorCard({ service }: ServiceColorCardProps) {
  const t = useSettingsText().section("service-modules");
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
            <CardTitle>{t("calendarColour")}</CardTitle>
            <CardDescription>{t("calendarColourHelp")}</CardDescription>
          </div>
          {hasOverride && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ ...config, color: defaultColor })}
              className="text-ink-tertiary hover:text-ink-secondary gap-1.5 rounded-lg text-[13.5px]"
            >
              <RotateCcw className="size-3" />
              {t("reset")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <RateColorPicker
          value={currentColor}
          onChange={(hex) => update({ ...config, color: hex })}
          // Was `${service} Color` — a service name concatenated with an
          // English word. The card's own title already says which service this
          // is, so the field only has to name itself.
          label={t("colour")}
        />
      </CardContent>
    </Card>
  );
}
