import { HQAnalyticsPanel } from "@/components/hq/HQAnalyticsPanel";
import { PageHeader } from "@/components/ui/page-header";

export default function HQReportsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <PageHeader
        title="HQ Analytics"
        description="Consolidated &amp; per-location performance · use the location filter to scope every chart"
      />
      <HQAnalyticsPanel />
    </div>
  );
}
