"use client";

import { BusinessHoursCard } from "../_components/business-hours-card";
import { DropOffPickUpOverrideCard } from "../_components/drop-off-pick-up-override-card";
import { OneDayScheduleOverrideCard } from "../_components/one-day-schedule-override-card";
import { ServiceDayBlockingCard } from "../_components/service-day-blocking-card";
import { SettingsCardGrid } from "../_components/settings-card-grid";

export function HoursSection() {
  return (
    <SettingsCardGrid>
      <BusinessHoursCard />
      <ServiceDayBlockingCard />
      <OneDayScheduleOverrideCard />
      <DropOffPickUpOverrideCard />
    </SettingsCardGrid>
  );
}
