import { estimates } from "@/data/estimates";
import { businessProfile } from "@/data/settings";
import { CustomerEstimatesClient } from "@/components/customer/estimates/CustomerEstimatesClient";
import { PageHeader } from "@/components/ui/page-header";

// Mock logged-in customer — TODO: derive from auth/session.
const CUSTOMER_ID = 15;

export default function CustomerEstimatesPage() {
  const myEstimates = estimates.filter(
    (e) => e.clientId === CUSTOMER_ID && e.status !== "draft",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Your estimates"
        description={`Review and respond to service estimates from ${businessProfile.businessName}.`}
      />

      <CustomerEstimatesClient
        estimates={myEstimates}
        facilityName={businessProfile.businessName}
        facilityLogo={businessProfile.logo}
      />
    </div>
  );
}
