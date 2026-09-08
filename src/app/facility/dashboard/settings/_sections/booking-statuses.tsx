"use client";

import { BookingStatusSettings } from "@/components/facility/BookingStatusSettings";

import { StatusColorSettings } from "@/components/facility/StatusColorSettings";
import { SettingsCardGrid } from "@/components/ui/settings-card-grid";

export function BookingStatusesSection() {
  return (
    // Measured 2564 vs 727 — the status list against the badge preview.
    // Stretching the shorter card would add 1,837px of white to it.
    <SettingsCardGrid className="items-start">
      <BookingStatusSettings />
      <StatusColorSettings />
    </SettingsCardGrid>
  );
}
