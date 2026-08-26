"use client";

import { ServiceCatalogClient } from "@/components/hq/ServiceCatalogClient";
import { useHqGroomingServices } from "@/lib/api/hq-services";
import { useFacilityLocations } from "@/lib/api/locations";

export default function HQServicesPage() {
  const { data: services = [], isPending: servicesPending } =
    useHqGroomingServices();
  const { data: locations = [], isPending: locationsPending } =
    useFacilityLocations();

  if (servicesPending || locationsPending) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Loading…
      </div>
    );
  }

  return <ServiceCatalogClient services={services} locations={locations} />;
}
