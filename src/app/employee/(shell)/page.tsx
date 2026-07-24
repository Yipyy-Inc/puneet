import { cookies } from "next/headers";
import { facilityStaff } from "@/data/facility-staff";
import { EmployeeGreetingHeader } from "@/components/employee/EmployeeGreetingHeader";
import { WeatherWidget } from "@/components/facility/WeatherWidget";
import { DashboardShell } from "@/components/facility/dashboard/dashboard-shell";

// The employee's landing screen is the SAME operational dashboard the facility
// admin sees (spec 5A parity) — WeatherWidget + DashboardShell — with one
// employee-only touch on top: a personal greeting. The HR write-up banner lives
// in the shell layout, and the layout already supplies the full provider stack
// the shared dashboard components need.
export default async function EmployeePage() {
  const cookieStore = await cookies();
  const staffId = cookieStore.get("employee_staff_id")?.value ?? "";

  const staff = facilityStaff.find((s) => s.id === staffId) ?? facilityStaff[0];

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <EmployeeGreetingHeader staff={staff} />
      <WeatherWidget />
      <DashboardShell />
    </div>
  );
}
