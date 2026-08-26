"use client";

import { ClientsHqClient } from "@/components/hq/clients/ClientsHqClient";
import { useHqClientNetworkValue } from "@/lib/api/hq-clients";
import { useFacilityLocations } from "@/lib/api/locations";

export default function HQClientsPage() {
  const { data, isPending: clientsPending } = useHqClientNetworkValue();
  const { data: locations = [], isPending: locationsPending } =
    useFacilityLocations();

  if (clientsPending || locationsPending) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Loading…
      </div>
    );
  }

  return (
    <ClientsHqClient
      clients={data?.clients ?? []}
      tiers={data?.tiers ?? []}
      locations={locations}
    />
  );
}
