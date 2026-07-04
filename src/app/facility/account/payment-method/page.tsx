import type { Metadata } from "next";

import { PaymentMethodView } from "./_components/payment-method-view";

export const metadata: Metadata = {
  title: "Payment Method — Yipyy",
};

// Owner-only via ../layout.tsx (requireFacilityOwner → 403 for non-owners).
export default function PaymentMethodPage() {
  return <PaymentMethodView />;
}
