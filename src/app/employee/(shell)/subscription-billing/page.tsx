import FacilityBillingSettingsPage from "@/app/facility/settings/billing/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// "Subscription & Billing" — reuses the real facility subscription/billing
// settings page, gated on the same key the nav item uses (settings_billing).
export default function EmployeeSubscriptionBillingPage() {
  return (
    <RequirePermission permKey="settings_billing">
      <FacilityBillingSettingsPage />
    </RequirePermission>
  );
}
