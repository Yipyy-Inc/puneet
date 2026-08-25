import { LocationsHubClient } from "@/components/hq/LocationsHubClient";

// The list comes from Postgres through `useFacilityLocations`, scoped by RLS to
// the caller's own facility. It used to be `getLocationsByFacility(11)` — a
// fixture lookup that handed every business the same three Montreal branches.
export default function HQLocationsPage() {
  return <LocationsHubClient />;
}
