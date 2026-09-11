import { GroomingPrepaidPackages } from "@/components/facility/grooming/grooming-prepaid-packages";

// The facility's own boarding packages — prepaid_packages rows whose passes are
// spent on boarding. This rendered ModulePackagesPage over @/data/services-pricing,
// whose Save closed the dialog and whose Delete did nothing.
export default function BoardingPackagesPage() {
  return <GroomingPrepaidPackages module="boarding" />;
}
