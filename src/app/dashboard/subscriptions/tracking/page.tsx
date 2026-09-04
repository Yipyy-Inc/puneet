import { FacilitySubscriptionsTable } from "@/components/subscriptions/FacilitySubscriptionsTable";
import { SubscriptionAnalytics } from "@/components/subscriptions/SubscriptionAnalytics";
import { PageHeader } from "@/components/ui/page-header";

export default function TrackingPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Subscription Tracking & Analytics"
        description="Monitor facility subscriptions, usage, and identify opportunities"
      />

      <SubscriptionAnalytics />

      <div className="pt-6">
        <FacilitySubscriptionsTable />
      </div>
    </div>
  );
}
