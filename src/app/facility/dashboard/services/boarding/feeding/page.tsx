import { FeedingChecklist } from "@/components/facility/boarding/feeding-checklist";
import { facilityFeedingConfig } from "@/data/boarding";

export default function FeedingPage() {
  return <FeedingChecklist config={facilityFeedingConfig} />;
}
