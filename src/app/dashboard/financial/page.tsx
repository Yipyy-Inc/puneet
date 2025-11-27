import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueOverview } from "@/components/financial/RevenueOverview";
import { FacilityRevenueTable } from "@/components/financial/FacilityRevenueTable";
import { CommissionTrackingTable } from "@/components/financial/CommissionTrackingTable";
import { TransactionsTable } from "@/components/financial/TransactionsTable";
import { PaymentProvidersTable } from "@/components/financial/PaymentProvidersTable";
import { PaymentAnalytics } from "@/components/financial/PaymentAnalytics";
import { FinancialReports } from "@/components/financial/FinancialReports";

export default function FinancialManagementPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Financial Management
          </h1>
          <p className="text-muted-foreground">
            Comprehensive revenue tracking, payment integration, and financial
            reporting
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Tracking</TabsTrigger>
            <TabsTrigger value="payments">Payment Integration</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <RevenueOverview />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <FacilityRevenueTable />
            <CommissionTrackingTable />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentAnalytics />
            <TransactionsTable />
            <PaymentProvidersTable />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <FinancialReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
