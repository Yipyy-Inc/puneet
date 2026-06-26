import type { Metadata } from "next";

import { BillingSelfServiceView } from "./_components/billing-self-service-view";

export const metadata: Metadata = {
  title: "Subscription & Billing — Yipyy",
};

export default function FacilityBillingSettingsPage() {
  return <BillingSelfServiceView />;
}
