"use client";

import Link from "next/link";
import { facilities } from "@/data/facilities";
import { WeatherWidget } from "@/components/facility/WeatherWidget";
import { CheckInOutSection } from "@/components/facility/CheckInOutSection";
import { GroomingSection } from "@/components/facility/GroomingSection";
import { TrainingSection } from "@/components/facility/TrainingSection";
import { CustomServiceDashboardSection } from "@/components/facility/CustomServiceDashboardSection";
import { useCustomServices } from "@/hooks/use-custom-services";
import { Button } from "@/components/ui/button";

export default function FacilityDashboard() {
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const { activeModules } = useCustomServices();
  const todayDateParam = new Date().toISOString().split("T")[0];

  if (!facility) {
    return <div>Facility not found</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <section className="from-background to-muted/20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-linear-to-r p-4 shadow-xs">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-600">
            Jump into today&apos;s schedule to manage bookings, tasks, and service flow.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link
            href={`/facility/dashboard/calendar?view=day&date=${todayDateParam}&focus=now`}
          >
            Today in Calendar
          </Link>
        </Button>
      </section>

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
