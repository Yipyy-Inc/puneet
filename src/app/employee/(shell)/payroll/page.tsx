import PayrollPage from "@/app/facility/dashboard/payroll/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// The screen the ACCOUNTANT was missing. They hold `view_payroll` and are
// staff-level (ADR 0005), so every money surface in the admin-only /facility
// portal was out of reach — including the one their job is. This is the same
// page, rendered in the staff shell, gated on the permission they already have.
export default function EmployeePayrollPage() {
  return (
    <RequirePermission permKey="view_payroll">
      <PayrollPage />
    </RequirePermission>
  );
}
