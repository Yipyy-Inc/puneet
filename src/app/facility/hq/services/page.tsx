"use client";

import { useMemo } from "react";
import { ServiceCatalogClient } from "@/components/hq/ServiceCatalogClient";
import { BoardingServiceCatalogClient } from "@/components/hq/BoardingServiceCatalogClient";
import { DaycareServiceCatalogClient } from "@/components/hq/DaycareServiceCatalogClient";
import { TrainingServiceCatalogClient } from "@/components/hq/TrainingServiceCatalogClient";
import {
  useHqGroomingServices,
  useDaycareLocationPrices,
} from "@/lib/api/hq-services";
import { useFacilityLocations } from "@/lib/api/locations";
import { useRooms } from "@/hooks/use-rooms";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { useTrainingSeriesList } from "@/lib/api/training-series";
import { PageHeader } from "@/components/ui/page-header";

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
  const { data: trainingSeries = [], isPending: trainingPending } =
    useTrainingSeriesList();

  if (
    servicesPending ||
    locationsPending ||
    categoriesPending ||
    settingsPending ||
    daycarePending ||
    trainingPending
  ) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      {/* The glyph went with the hand-rolled title. §5b1: an icon never
          introduces a colour — this one was `text-sky-600`, off-palette — and
          a page title does not need a decorative glyph to be found. */}
      <PageHeader
        title="Service catalog"
        description="Pricing across every branch, by module."
      />
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
      <TrainingServiceCatalogClient series={trainingSeries} />
    </div>
  );
}
