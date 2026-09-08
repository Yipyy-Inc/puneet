"use client";

import { BookingStatusSettings } from "@/components/facility/BookingStatusSettings";

import { StatusColorSettings } from "@/components/facility/StatusColorSettings";
import { SettingsCardGrid } from "../_components/settings-card-grid";

export function BookingStatusesSection() {
  return (
    <SettingsCardGrid>
      <BookingStatusSettings />
      <StatusColorSettings />
    </SettingsCardGrid>
  );
}
