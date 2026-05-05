import { StaffPerformanceClient } from "@/components/hq/reports/StaffPerformanceClient";
import { staffCrossLocationPerformance } from "@/data/hq-analytics";
import { getLocationsByFacility } from "@/data/locations";

export default function StaffPerformancePage() {
  return (
    <StaffPerformanceClient
      staff={staffCrossLocationPerformance}
      locations={getLocationsByFacility(11)}
    />
  );
}
