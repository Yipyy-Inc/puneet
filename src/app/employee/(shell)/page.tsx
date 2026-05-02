import { cookies } from "next/headers";
import { facilityStaff } from "@/data/facility-staff";
import { EmployeeDashboard } from "@/components/employee/EmployeeDashboard";

export default async function EmployeePage() {
  const cookieStore = await cookies();
  const staffId = cookieStore.get("employee_staff_id")?.value ?? "";

  const staff = facilityStaff.find((s) => s.id === staffId) ?? facilityStaff[0];

  return <EmployeeDashboard staff={staff} />;
}
