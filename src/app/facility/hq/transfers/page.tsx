import { getAllTransfers } from "@/data/location-transfers";
import { getLocationsByFacility } from "@/data/locations";
import { TransferCenterClient } from "@/components/hq/TransferCenterClient";

export default function HQTransfersPage() {
  const transfers = getAllTransfers();
  const locations = getLocationsByFacility(11);
  return <TransferCenterClient transfers={transfers} locations={locations} />;
}
