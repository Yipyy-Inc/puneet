"use client";

import { useSettingsText } from "@/lib/settings/use-settings-text";

import { FeedingInstructionsCard } from "./feeding-instructions-card";
import { MedicationInstructionsCard } from "./medication-instructions-card";

// ============================================================================
// Feeding and medication instructions: what the booking form's Feeding and
// Medications steps offer. Two cards, two settings domains, each saved on its
// own (SaveBar's per-card model) — the place the old "Feeding & medication
// options" stood, which saved nothing.
// ============================================================================

export function CareInstructionsSettings() {
  const t = useSettingsText().section("care-tasks");
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-section text-heading">{t("optionsTitle")}</h2>
        <p className="text-meta text-ink-tertiary mt-1">{t("optionsHelp")}</p>
      </div>
      <FeedingInstructionsCard />
      <MedicationInstructionsCard />
    </div>
  );
}
