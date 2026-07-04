import type { Metadata } from "next";

import { MySubscriptionView } from "./_components/my-subscription-view";

export const metadata: Metadata = {
  title: "My Subscription — Yipyy",
};

// Owner-only via ../layout.tsx (requireFacilityOwner → 403 for non-owners).
export default function MySubscriptionPage() {
  return <MySubscriptionView />;
}
