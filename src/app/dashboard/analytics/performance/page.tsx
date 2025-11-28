import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacilityPerformanceMetrics } from "@/components/analytics/FacilityPerformanceMetrics";
import { SystemPerformanceMetrics } from "@/components/analytics/SystemPerformanceMetrics";

export default function PerformanceMetricsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Performance Metrics
          </h1>
          <p className="text-muted-foreground">
            Facility and system performance monitoring
          </p>
        </div>

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
