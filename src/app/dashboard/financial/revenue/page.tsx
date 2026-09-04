import { RevenueOverview } from "@/components/financial/RevenueOverview";
import { FacilityRevenueTable } from "@/components/financial/FacilityRevenueTable";
import { PageHeader } from "@/components/ui/page-header";

export default function RevenueTrackingPage() {
  return (
    <div className="bg-gradient-mesh bg-background min-h-screen flex-1 p-6 lg:p-8">
      <div className="space-y-6">
        <PageHeader
          title="Revenue Tracking"
          description="Monitor revenue across all facilities, track commissions, and analyze performance"
        />

        <RevenueOverview />
        <FacilityRevenueTable />
      </div>
    </div>
  );
}
