import { locationComparisonData } from "@/data/hq-analytics";
import { LocationComparisonClient } from "@/components/hq/LocationComparisonClient";

export default function HQComparisonPage() {
  return <LocationComparisonClient data={locationComparisonData} />;
}
