import { getLocationsByFacility } from "@/data/locations";
import { HQAnalyticsPanel } from "@/components/hq/HQAnalyticsPanel";

export default function HQReportsPage() {
  const locations = getLocationsByFacility(11);
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HQ Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Consolidated &amp; per-location performance · use the location filter
          to scope every chart
        </p>
      </div>
      <HQAnalyticsPanel locations={locations} />
    </div>
  );
}
