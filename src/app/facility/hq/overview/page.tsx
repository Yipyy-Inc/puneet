import { hqOverviewMetrics } from "@/data/hq-analytics";
import { getLocationsByFacility } from "@/data/locations";
import { HQOverviewClient } from "@/components/hq/HQOverviewClient";

export default function HQOverviewPage() {
  const locations = getLocationsByFacility(11);
  return <HQOverviewClient metrics={hqOverviewMetrics} locations={locations} />;
}
