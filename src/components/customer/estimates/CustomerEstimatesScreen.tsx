"use client";

import { CustomerEstimatesClient } from "@/components/customer/estimates/CustomerEstimatesClient";
import { EstimatesHeader } from "@/components/customer/estimates/EstimatesHeader";
import { useCustomerFacility } from "@/lib/api/customer-facility";
import { useMyEstimates } from "@/lib/api/estimates";

// The signed-in customer's estimates, from Postgres — their own, once sent
// (RLS). This page filtered `@/data/estimates` by a hardcoded CUSTOMER_ID of
// 15, so every pet owner was shown Alice Johnson's quotes, headed with the
// fixture's "Example Pet Care Facility".
export function CustomerEstimatesScreen() {
  const { estimates, pending } = useMyEstimates();
  const facility = useCustomerFacility();
  const facilityName = facility?.name ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <EstimatesHeader facilityName={facilityName} />
      {pending ? (
        <div className="bg-muted h-40 animate-pulse rounded-3xl" />
      ) : (
        <CustomerEstimatesClient
          estimates={estimates}
          facilityName={facilityName}
          facilityLogo={facility?.logoUrl ?? undefined}
        />
      )}
    </div>
  );
}
