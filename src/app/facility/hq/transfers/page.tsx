import { getAllTransfers } from "@/data/location-transfers";
import { getLocationsByFacility } from "@/data/locations";
import { TransfersHistoryClient } from "@/components/hq/TransfersHistoryClient";

export default function HQTransfersPage() {
  const transfers = getAllTransfers();
  const locations = getLocationsByFacility(11);
  return <TransfersHistoryClient transfers={transfers} locations={locations} />;
}
