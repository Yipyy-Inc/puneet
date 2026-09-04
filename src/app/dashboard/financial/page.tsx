import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueOverview } from "@/components/financial/RevenueOverview";
import { FacilityRevenueTable } from "@/components/financial/FacilityRevenueTable";
import { FinancialReports } from "@/components/financial/FinancialReports";
import { PageHeader } from "@/components/ui/page-header";

export default function FinancialManagementPage() {
  return (
    <div className="bg-gradient-mesh bg-background min-h-screen flex-1 p-6 lg:p-8">
      <div className="space-y-6">
        <PageHeader
          title="Financial Management"
          description="Comprehensive revenue tracking, payment integration, and financial reporting"
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Tracking</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <RevenueOverview />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <FacilityRevenueTable />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <FinancialReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
