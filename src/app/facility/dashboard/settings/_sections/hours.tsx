"use client";

import { BusinessHoursCard } from "../_components/business-hours-card";
import { DropOffPickUpOverrideCard } from "../_components/drop-off-pick-up-override-card";
import { OneDayScheduleOverrideCard } from "../_components/one-day-schedule-override-card";
import { ServiceDayBlockingCard } from "../_components/service-day-blocking-card";

export function HoursSection() {
  return (
    <div className="space-y-6">
      <BusinessHoursCard />
      <ServiceDayBlockingCard />
      <OneDayScheduleOverrideCard />
      <DropOffPickUpOverrideCard />
    </div>
  );
}
