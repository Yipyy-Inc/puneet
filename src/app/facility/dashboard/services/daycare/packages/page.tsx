import { GroomingPrepaidPackages } from "@/components/facility/grooming/grooming-prepaid-packages";

// The facility's own daycare packages — prepaid_packages rows whose passes
// are spent on daycare. This page copied `daycarePackages` from @/data/daycare
// into state, so a package created here was gone on reload and never offered
// to a client.
export default function DaycarePackagesPage() {
  return <GroomingPrepaidPackages module="daycare" />;
}
