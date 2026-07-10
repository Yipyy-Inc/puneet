import { ClientsHqClient } from "@/components/hq/clients/ClientsHqClient";
import { crossLocationClients } from "@/data/hq-analytics";
import { getLocationsByFacility } from "@/data/locations";

export default function HQClientsPage() {
  return (
    <ClientsHqClient
      clients={crossLocationClients}
      locations={getLocationsByFacility(11)}
    />
  );
}
