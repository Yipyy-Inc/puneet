"use client";

import { BookingApprovalSettingsCard } from "../_components/booking-approval-settings-card";
import { BookingRulesCard } from "../_components/booking-rules-card";
import { FacilityBookingFlowCard } from "../_components/facility-booking-flow-card";
import { SettingsCardGrid } from "@/components/ui/settings-card-grid";

export function BookingRulesSection() {
  return (
    <SettingsCardGrid>
      <BookingRulesCard />
      <BookingApprovalSettingsCard />
      <FacilityBookingFlowCard />
    </SettingsCardGrid>
  );
}
