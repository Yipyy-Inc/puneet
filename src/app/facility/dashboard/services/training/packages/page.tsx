import { GroomingPrepaidPackages } from "@/components/facility/grooming/grooming-prepaid-packages";

// The facility's own training packages — prepaid_packages rows whose passes are
// spent on training. This rendered ModulePackagesPage over @/data/services-pricing,
// whose Save closed the dialog and whose Delete did nothing.
export default function TrainingPackagesPage() {
  return <GroomingPrepaidPackages module="training" />;
}
