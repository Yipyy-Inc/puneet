"use client";

import dynamic from "next/dynamic";
import { facilities } from "@/data/facilities";

const WeatherWidget = dynamic(
  () =>
    import("@/components/facility/WeatherWidget").then((m) => m.WeatherWidget),
  { ssr: false },
);

import { CheckInOutSection } from "@/components/facility/CheckInOutSection";
import { GroomingSection } from "@/components/facility/GroomingSection";
import { TrainingSection } from "@/components/facility/TrainingSection";
import { CustomServiceDashboardSection } from "@/components/facility/CustomServiceDashboardSection";
import { useCustomServices } from "@/hooks/use-custom-services";

export default function FacilityDashboard() {
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const { activeModules } = useCustomServices();

  if (!facility) {
    return <div>Facility not found</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Weather Widget */}
      <WeatherWidget />

      {/* Daycare & Boarding Check-In/Out Section */}
      <CheckInOutSection facilityId={facilityId} />

      {/* Grooming Section */}
      <GroomingSection />

      {/* Training Section */}
      <TrainingSection />

      {/* Custom Service Modules */}
      {activeModules
        .filter((m) => m.checkInOut.enabled)
        .map((m) => (
          <CustomServiceDashboardSection key={m.id} module={m} />
        ))}
    </div>
  );
}
