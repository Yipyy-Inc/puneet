"use client";

import { CareTaskSettings } from "@/components/facility/CareTaskSettings";
import { FeedingMedicationConfig } from "@/components/facility/FeedingMedicationConfig";
import { SettingsCardGrid } from "../_components/settings-card-grid";

export function CareTasksSection() {
  return (
    <SettingsCardGrid>
      <FeedingMedicationConfig />
      <CareTaskSettings />
    </SettingsCardGrid>
  );
}
