import { WeatherWidget } from "@/components/facility/WeatherWidget";
import { DashboardShell } from "@/components/facility/dashboard/dashboard-shell";

export default function FacilityDashboard() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <WeatherWidget />
      <DashboardShell />
    </div>
  );
}
