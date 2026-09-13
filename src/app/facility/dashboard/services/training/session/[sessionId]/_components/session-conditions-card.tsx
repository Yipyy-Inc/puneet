"use client";

import {
  Cloud,
  CloudRain,
  Flame,
  Snowflake,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type {
  DistractionLevel,
  SessionConditions,
  WeatherCondition,
} from "@/lib/training-enrollment";

// ============================================================================
// What the dogs worked through — the weather, and how distracting it was.
//
// A 3 on recall in pouring rain beside a busy road is not a 3 on a still
// morning. The student's History tab draws these next to the ratings; nothing
// captured them. Saved with each dog who came (training_attendance.conditions,
// 20260913112156) — not for a dog marked absent or excused.
//
// Both are optional and both can be taken back: weather is any number of
// flags (hot AND windy), distraction is one level or none, and pressing the
// chosen level again clears it.
// ============================================================================

const WEATHER: { value: WeatherCondition; key: string; Icon: LucideIcon }[] = [
  { value: "sunny", key: "weatherSunny", Icon: Sun },
  { value: "cloudy", key: "weatherCloudy", Icon: Cloud },
  { value: "rain", key: "weatherRain", Icon: CloudRain },
  { value: "hot", key: "weatherHot", Icon: Flame },
  { value: "cold", key: "weatherCold", Icon: Snowflake },
  { value: "windy", key: "weatherWindy", Icon: Wind },
];

const DISTRACTION: { value: DistractionLevel; key: string }[] = [
  { value: "low", key: "distractionLow" },
  { value: "medium", key: "distractionMedium" },
  { value: "high", key: "distractionHigh" },
];

// §5 "Applied = solid #1668E3, white text"; at rest a white pill on the strong
// hairline. 40px, 48px below 1024 (§1, §6 rule 7). State is the fill and
// aria-pressed, never an edge.
const CHIP =
  "inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-[14.5px] font-semibold text-body-ink transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-white max-lg:min-h-12";

interface Props {
  conditions: SessionConditions;
  onChange: (next: SessionConditions) => void;
}

export function SessionConditionsCard({ conditions, onChange }: Props) {
  const { t } = useStaffText("trainingSession");

  function toggleWeather(value: WeatherCondition) {
    const on = conditions.weather.includes(value);
    onChange({
      ...conditions,
      weather: on
        ? conditions.weather.filter((w) => w !== value)
        : [...conditions.weather, value],
    });
  }

  function chooseDistraction(value: DistractionLevel) {
    onChange({
      ...conditions,
      distractionLevel:
        conditions.distractionLevel === value ? undefined : value,
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-line flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-5 py-3.5">
        <Cloud className="text-ink-secondary size-5 shrink-0" aria-hidden />
        <h3 className="text-heading min-w-0 text-[17px] font-bold">
          {t("conditionsTitle")}
        </h3>
        <span className="text-ink-tertiary ml-auto text-[13px]">
          {t("conditionsHelp")}
        </span>
      </div>
      <div className="flex flex-col gap-7 p-5">
        <fieldset className="min-w-0">
          <legend className="text-body-ink mb-1.5 text-[13.5px] font-semibold">
            {t("weatherLabel")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {WEATHER.map(({ value, key, Icon }) => {
              const on = conditions.weather.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  data-state={on ? "on" : "off"}
                  onClick={() => toggleWeather(value)}
                  className={CHIP}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {t(key)}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="text-body-ink mb-1.5 text-[13.5px] font-semibold">
            {t("distractionLabel")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {DISTRACTION.map(({ value, key }) => {
              const on = conditions.distractionLevel === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  data-state={on ? "on" : "off"}
                  onClick={() => chooseDistraction(value)}
                  className={CHIP}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Card>
  );
}
