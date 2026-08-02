import { EmployeeGreetingHeader } from "@/components/employee/EmployeeGreetingHeader";
import { WeatherWidget } from "@/components/facility/WeatherWidget";
import { DashboardShell } from "@/components/facility/dashboard/dashboard-shell";

// The employee's landing screen is the SAME operational dashboard the facility
// admin sees (spec 5A parity) — WeatherWidget + DashboardShell — with one
// employee-only touch on top: a personal greeting. The HR write-up banner lives
// in the shell layout, and the layout already supplies the full provider stack
// the shared dashboard components need.
export default function EmployeePage() {
  return (
    <div className="flex-1 p-4 pt-6 md:p-8">
      {/* One-time welcome — owns its own bottom margin so it collapses cleanly
          away after login without leaving a gap above the dashboard.
          It names the acting viewer itself, from the shell's RBAC boundary.
          This page used to resolve that from the `employee_staff_id` cookie and
          fall back to `facilityStaff[0]`, which greeted a signed-in employee as
          somebody else entirely. */}
      <EmployeeGreetingHeader />
      <div className="space-y-6">
        <WeatherWidget />
        <DashboardShell />
      </div>
    </div>
  );
}
