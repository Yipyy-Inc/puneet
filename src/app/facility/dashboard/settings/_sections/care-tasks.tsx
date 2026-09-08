"use client";

import { CareTaskSettings } from "@/components/facility/CareTaskSettings";
import { FeedingMedicationConfig } from "@/components/facility/FeedingMedicationConfig";
import { SettingsCardGrid } from "@/components/ui/settings-card-grid";

export function CareTasksSection() {
  return (
    <SettingsCardGrid>
      <FeedingMedicationConfig />
      <CareTaskSettings />
    </SettingsCardGrid>
  );
}
