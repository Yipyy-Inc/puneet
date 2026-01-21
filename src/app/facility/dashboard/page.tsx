"use client";

import { facilities } from "@/data/facilities";

import { CheckInOutSection } from "@/components/facility/CheckInOutSection";
import { BookingRequestsPanel } from "@/components/facility/BookingRequestsPanel";
import { GroomingSection } from "@/components/facility/GroomingSection";
import { TrainingSection } from "@/components/facility/TrainingSection";

export default function FacilityDashboard() {
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Booking Requests (fast actions) */}
      <BookingRequestsPanel />

      {/* Daycare & Boarding Check-In/Out Section */}
      <CheckInOutSection />

      {/* Grooming Section */}
      <GroomingSection />

      {/* Training Section */}
      <TrainingSection />
    </div>
  );
}
