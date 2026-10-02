"use client";

import {
  CalendarFold,
  CalendarRange,
  Infinity as AnyTime,
  Rows3,
  type LucideIcon,
} from "lucide-react";

import { offerModeOf, type OfferMode } from "@/lib/evaluations/schedule";
import type { EvaluationConfig } from "@/types/facility";

import { RadioCards } from "@/components/evaluations/radio-cards";
import { StepCard } from "./step-card";
import type { EvaluationSetup } from "./use-evaluation-setup";

// ============================================================================
// STEP 1 — "How do you offer evaluations?" (the client's mock): four cards,
// each a glyph, a name, its radio mark at the end and a line under it.
// ============================================================================

export const MODE_GLYPHS: Record<OfferMode, LucideIcon> = {
  any: AnyTime,
  window: CalendarRange,
  days: CalendarFold,
  slots: Rows3,
};

const ORDER: OfferMode[] = ["any", "window", "days", "slots"];

export function OfferModeStep({
  setup,
  t,
}: {
  setup: EvaluationSetup;
  t: (key: string) => string;
}) {
  const mode = offerModeOf(setup.draft.config);

  return (
    <StepCard id="ev-mode" step={t("step1")} title={t("modeTitle")}>
      <RadioCards
        labelledBy="ev-mode-title"
        value={mode}
        options={ORDER.map((value) => ({
          value,
          title: t(`mode_${value}`),
          help: t(`mode_${value}_help`),
          glyph: MODE_GLYPHS[value],
        }))}
        onChange={(next) =>
          setup.setSchedule((schedule) =>
            modeDefaults(schedule, next, {
              morning: t("windowMorning"),
              afternoon: t("windowAfternoon"),
            }),
          )
        }
      />
    </StepCard>
  );
}

/**
 * Switching mode keeps what the facility already set, and fills what the
 * new mode needs but has never been given — a mode with nothing to offer
 * would save an empty wizard.
 */
function modeDefaults(
  schedule: EvaluationConfig["schedule"],
  mode: OfferMode,
  names: { morning: string; afternoon: string },
): Partial<EvaluationConfig["schedule"]> {
  const patch: Partial<EvaluationConfig["schedule"]> = { offerMode: mode };
  // The stored slotMode keeps step with the two modes it can describe.
  if (mode === "slots") patch.slotMode = "fixed";
  if (mode === "window") patch.slotMode = "window";
  if (mode === "slots" && schedule.fixedStartTimes.length === 0) {
    patch.fixedStartTimes = ["09:00", "11:00", "13:00", "15:00"];
  }
  if (mode === "window" && schedule.timeWindows.length === 0) {
    patch.timeWindows = [
      {
        id: "morning",
        label: names.morning,
        startTime: "09:00",
        endTime: "12:00",
      },
      {
        id: "afternoon",
        label: names.afternoon,
        startTime: "13:00",
        endTime: "16:00",
      },
    ];
  }
  if ((mode === "any" || mode === "days") && !schedule.openRange) {
    patch.openRange =
      mode === "days"
        ? { start: "08:00", end: "10:30" }
        : { start: "08:00", end: "18:00" };
  }
  if (mode !== "any" && (schedule.allowedDays ?? []).length === 0) {
    patch.allowedDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
  }
  return patch;
}
