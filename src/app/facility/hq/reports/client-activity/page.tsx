import { ClientActivityClient } from "@/components/hq/reports/ClientActivityClient";
import { crossLocationClients } from "@/data/hq-analytics";
import { getLocationsByFacility } from "@/data/locations";

export default function ClientActivityPage() {
  return (
    <ClientActivityClient
      clients={crossLocationClients}
      locations={getLocationsByFacility(11)}
    />
  );
}
