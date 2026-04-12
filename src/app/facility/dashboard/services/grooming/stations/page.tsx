import { groomingStations } from "@/data/rooms";
import { GroomingStationsClient } from "@/components/rooms/GroomingStationsClient";

const FACILITY_ID = 11;

export default function GroomingStationsPage() {
  const stations = groomingStations.filter((s) => s.facilityId === FACILITY_ID);
  return <GroomingStationsClient initialStations={stations} facilityId={FACILITY_ID} />;
}
