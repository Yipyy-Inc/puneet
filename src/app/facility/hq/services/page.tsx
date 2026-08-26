"use client";

import { useMemo } from "react";
import { Boxes } from "lucide-react";
import { ServiceCatalogClient } from "@/components/hq/ServiceCatalogClient";
import { BoardingServiceCatalogClient } from "@/components/hq/BoardingServiceCatalogClient";
import { DaycareServiceCatalogClient } from "@/components/hq/DaycareServiceCatalogClient";
import {
  useHqGroomingServices,
  useDaycareLocationPrices,
} from "@/lib/api/hq-services";
import { useFacilityLocations } from "@/lib/api/locations";
import { useRooms } from "@/hooks/use-rooms";
import { useFacilitySettings } from "@/lib/api/facility-settings";

export default function HQServicesPage() {
  const { data: services = [], isPending: servicesPending } =
    useHqGroomingServices();
  const { data: locations = [], isPending: locationsPending } =
    useFacilityLocations();
  const { categories, isLoading: categoriesPending } = useRooms();
  const boardingCategories = useMemo(
    () => categories.filter((c) => c.service === "boarding"),
    [categories],
  );
  const { settings, isPending: settingsPending } = useFacilitySettings();
  const { data: daycareOverrides = [], isPending: daycarePending } =
    useDaycareLocationPrices();

  if (
    servicesPending ||
    locationsPending ||
    categoriesPending ||
    settingsPending ||
    daycarePending
  ) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Boxes className="size-6 text-sky-600" />
          Service Catalog
        </h1>
        <p className="text-muted-foreground text-sm">
          Pricing across every branch, by module.
        </p>
      </div>
      <ServiceCatalogClient services={services} locations={locations} />
      <BoardingServiceCatalogClient
        categories={boardingCategories}
        locations={locations}
      />
      <DaycareServiceCatalogClient
        facilityDefault={settings.daycare_config.value.basePrice}
        overrides={daycareOverrides}
        locations={locations}
      />
    </div>
  );
}
