import { sharedStaffPool } from "@/data/hq-analytics";
import { getLocationsByFacility } from "@/data/locations";
import { StaffPoolClient } from "@/components/hq/StaffPoolClient";

export default function HQStaffPage() {
  const locations = getLocationsByFacility(11);
  return <StaffPoolClient staff={sharedStaffPool} locations={locations} />;
}
