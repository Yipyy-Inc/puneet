"use client";

import { CareTaskSettings } from "@/components/facility/CareTaskSettings";
import { FeedingMedicationConfig } from "@/components/facility/FeedingMedicationConfig";

export function CareTasksSection() {
  return (
    <div className="space-y-6">
      <FeedingMedicationConfig />
      <CareTaskSettings />
    </div>
  );
}
