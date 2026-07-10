import { locationComparisonData } from "@/data/hq-analytics";
import { PerformanceClient } from "@/components/hq/PerformanceClient";

export default function HQPerformancePage() {
  return <PerformanceClient data={locationComparisonData} />;
}
