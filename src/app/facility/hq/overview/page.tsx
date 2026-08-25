import { HQOverviewClient } from "@/components/hq/HQOverviewClient";

// Real branches, real revenue, real headcount -- it used to be
// `hqOverviewMetrics` + `getLocationsByFacility(11)`, a fixture anchored to
// April 2026.
export default function HQOverviewPage() {
  return <HQOverviewClient />;
}
