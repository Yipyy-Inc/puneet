import { RevenueOverview } from "@/components/financial/RevenueOverview";
import { FacilityRevenueTable } from "@/components/financial/FacilityRevenueTable";
import { CommissionTrackingTable } from "@/components/financial/CommissionTrackingTable";

export default function RevenueTrackingPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Revenue Tracking
          </h1>
          <p className="text-muted-foreground">
            Monitor revenue across all facilities, track commissions, and
            analyze performance
          </p>
        </div>

        <RevenueOverview />
        <FacilityRevenueTable />
        <CommissionTrackingTable />
      </div>
    </div>
  );
}
