"use client";

import { CareTaskSettings } from "@/components/facility/CareTaskSettings";
import { SettingsCardGrid } from "@/components/ui/settings-card-grid";

import { CareInstructionsSettings } from "../_components/care-instructions-settings";

export function CareTasksSection() {
  return (
    // A tall column of instructions beside a short one of feedback options:
    // the ratio settings-card-grid names as the reason not to stretch.
    <SettingsCardGrid className="items-start">
      <CareInstructionsSettings />
      <CareTaskSettings />
    </SettingsCardGrid>
  );
}
