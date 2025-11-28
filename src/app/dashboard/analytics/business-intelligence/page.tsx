import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerAcquisitionMetrics } from "@/components/analytics/CustomerAcquisitionMetrics";
import { ReservationAnalytics } from "@/components/analytics/ReservationAnalytics";
import { FacilityUtilizationMetrics } from "@/components/analytics/FacilityUtilizationMetrics";

export default function BusinessIntelligencePage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Business Intelligence
          </h1>
          <p className="text-muted-foreground">
            Customer acquisition, reservation analytics, and facility
            utilization metrics
          </p>
        </div>

        <Tabs defaultValue="acquisition" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="acquisition">Customer Acquisition</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="utilization">Facility Utilization</TabsTrigger>
          </TabsList>

          <TabsContent value="acquisition">
            <CustomerAcquisitionMetrics />
          </TabsContent>

          <TabsContent value="reservations">
            <ReservationAnalytics />
          </TabsContent>

          <TabsContent value="utilization">
            <FacilityUtilizationMetrics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
