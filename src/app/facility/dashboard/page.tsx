"use client";

import { facilities } from "@/data/facilities";

import { CheckInOutSection } from "@/components/facility/CheckInOutSection";
import { GroomingSection } from "@/components/facility/GroomingSection";
import { TrainingSection } from "@/components/facility/TrainingSection";
import { YipyyGoPendingWidget } from "@/components/yipyygo/YipyyGoPendingWidget";

export default function FacilityDashboard() {
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* YipyyGo Pending (when facility has pending forms) */}
      <YipyyGoPendingWidget facilityId={facilityId} maxItems={5} />

      {/* Daycare & Boarding Check-In/Out Section */}
      <CheckInOutSection facilityId={facilityId} />

      {/* Grooming Section */}
      <GroomingSection />

      {/* Training Section */}
      <TrainingSection />
    </div>
  );
}
