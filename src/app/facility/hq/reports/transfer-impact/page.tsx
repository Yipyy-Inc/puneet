import { TransferImpactClient } from "@/components/hq/reports/TransferImpactClient";
import { bookingTransfers } from "@/data/location-transfers";
import { getLocationsByFacility } from "@/data/locations";

export default function TransferImpactPage() {
  return (
    <TransferImpactClient
      transfers={bookingTransfers}
      locations={getLocationsByFacility(11)}
    />
  );
}
