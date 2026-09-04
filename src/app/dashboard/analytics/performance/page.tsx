import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacilityPerformanceMetrics } from "@/components/analytics/FacilityPerformanceMetrics";
import { SystemPerformanceMetrics } from "@/components/analytics/SystemPerformanceMetrics";
import { PageHeader } from "@/components/ui/page-header";

export default function PerformanceMetricsPage() {
  return (
    <div className="bg-gradient-mesh bg-background min-h-screen flex-1 p-6 lg:p-8">
      <div className="space-y-6">
        <PageHeader
          title="Performance Metrics"
          description="Facility and system performance monitoring"
        />

        <Tabs defaultValue="facility" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="facility">Facility Performance</TabsTrigger>
            <TabsTrigger value="system">System Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="facility">
            <FacilityPerformanceMetrics />
          </TabsContent>

          <TabsContent value="system">
            <SystemPerformanceMetrics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
