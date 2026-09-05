"use client";

import { BookingApprovalSettingsCard } from "../_components/booking-approval-settings-card";
import { BookingRulesCard } from "../_components/booking-rules-card";
import { FacilityBookingFlowCard } from "../_components/facility-booking-flow-card";

export function BookingRulesSection() {
  return (
    <div className="space-y-6">
      <BookingRulesCard />
      <BookingApprovalSettingsCard />
      <FacilityBookingFlowCard />
    </div>
  );
}
