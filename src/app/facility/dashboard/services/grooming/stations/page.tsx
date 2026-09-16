import { GroomingStationsClient } from "@/components/rooms/GroomingStationsClient";

// The stations are the SESSION's facility's — `/api/grooming/stations` scopes
// them with `activeFacilityIdForStaff()` — so this page has no facility to
// name. It used to pass `facilityId={11}` into a client-side filter, which
// meant the route had to report 11 on every real row for the page to render
// anything at all.
export default function GroomingStationsPage() {
  return <GroomingStationsClient />;
}
