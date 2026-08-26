import PaymentsPage from "@/app/facility/dashboard/payments/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Every payment, whichever channel took it. Gated on `financial_view_amounts`
// — the same permission the ledger itself is gated on, and the same one the
// shared nav entry carries, so what is reachable here and what is offered
// there cannot drift apart.
export default function EmployeePaymentsPage() {
  return (
    <RequirePermission permKey="financial_view_amounts">
      <PaymentsPage />
    </RequirePermission>
  );
}
