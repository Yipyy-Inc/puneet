import type { Metadata } from "next";

import { TransactionsTab } from "@/components/facility/yipyy-pay/dashboard/TransactionsTab";
import { PageHeader } from "@/components/ui/page-header";

// ============================================================================
// Payments — every payment, whichever channel took it.
//
// ── WHY THIS PAGE EXISTS ──────────────────────────────────────────────────
//
// A Yipyy payment is ONE object. A boarding deposit paid online, a grooming
// bill tapped on a Clover reader and a counter sale in the shop are all rows in
// `public.payments`, written by one RPC, refunded by one engine, and reconciled
// by one sweep. The list that shows them was finished — and filed under
// Settings → Yipyy Pay → Transactions, which is where you go to CONFIGURE a
// payment processor, not where you go to look at your takings.
//
// So this is the same list, given an address somebody would think to visit. It
// is in the Financial section of the shared nav, behind `financial_view_amounts`.
//
// ── IT RENDERS THE SETTINGS TAB, IT DOES NOT COPY IT ──────────────────────
//
// `TransactionsTab` takes no props and owns its own range, filter and paging.
// Rendering it here rather than forking it is the whole point: two screens
// listing the same money is how they come to disagree about it. If this page
// ever needs something the settings tab does not, the component gains a prop —
// it does not gain a twin.
// ============================================================================

export const metadata: Metadata = {
  title: "Payments",
};

export default function PaymentsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payments"
        description="Everything taken, in person and online."
      />

      <TransactionsTab />
    </div>
  );
}
