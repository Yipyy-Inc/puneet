import { getLocationsByFacility } from "@/data/locations";
import { LocationsHubClient } from "@/components/hq/LocationsHubClient";

export default function HQLocationsPage() {
  const locations = getLocationsByFacility(11);
  return <LocationsHubClient locations={locations} />;
}
