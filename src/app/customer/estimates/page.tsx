import { estimates } from "@/data/estimates";
import { businessProfile } from "@/data/settings";
import { CustomerEstimatesClient } from "@/components/customer/estimates/CustomerEstimatesClient";
import { EstimatesHeader } from "@/components/customer/estimates/EstimatesHeader";

// Mock logged-in customer — TODO: derive from auth/session.
const CUSTOMER_ID = 15;

export default function CustomerEstimatesPage() {
  const myEstimates = estimates.filter(
    (e) => e.clientId === CUSTOMER_ID && e.status !== "draft",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <EstimatesHeader facilityName={businessProfile.businessName} />

      <CustomerEstimatesClient
        estimates={myEstimates}
        facilityName={businessProfile.businessName}
        facilityLogo={businessProfile.logo}
      />
    </div>
  );
}
