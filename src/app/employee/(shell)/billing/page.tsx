import BillingPage from "@/app/facility/dashboard/billing/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Client invoicing / accounts-receivable. Gated on invoice management; a role
// that can't manage invoices doesn't reach the billing screen.
export default function EmployeeBillingPage() {
  return (
    <RequirePermission permKey="financial_manage_invoices">
      <BillingPage />
    </RequirePermission>
  );
}
