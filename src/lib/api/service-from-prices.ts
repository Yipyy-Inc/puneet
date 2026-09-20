"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useRooms } from "@/hooks/use-rooms";
import { useDaycareRates } from "@/hooks/use-daycare-rates";
import { groomingCatalogueQueries } from "@/lib/api/grooming-catalogue";
import { trainingQueries } from "@/lib/api/training";

// ============================================================================
// "From $X" — the cheapest thing the facility actually sells, per service.
//
// Two pickers showed one: the booking wizard's service cards and the estimate
// wizard's. Both read `<service>_config.basePrice` and then the static
// SERVICE_CATEGORIES fixture — daycare 35, boarding 45, grooming 40,
// training 85 — so a customer was offered "From $45" for boarding at a
// facility whose cheapest kennel was $38, and at one that had not priced
// boarding at all.
//
// Each number here comes from the catalogue the facility edits, and
// `undefined` means it has not priced that service yet. A caller shows
// nothing rather than a number from a file.
// ============================================================================

export type ServiceFromPrices = Record<string, number | undefined>;

function cheapest(values: number[]): number | undefined {
  return values.length > 0 ? Math.min(...values) : undefined;
}

export function useServiceFromPrices(): ServiceFromPrices {
  const { categories } = useRooms();
  const { rates: daycareRates } = useDaycareRates();
  const { data: groomingServices } = useQuery(
    groomingCatalogueQueries.services(),
  );
  const { data: trainingSeries } = useQuery(trainingQueries.series());

  return useMemo(() => {
    return {
      boarding: cheapest(
        categories
          .filter((c) => c.service === "boarding" && c.active !== false)
          .map((c) => c.defaultBasePrice)
          .filter((p): p is number => typeof p === "number"),
      ),
      daycare: cheapest(
        daycareRates.filter((r) => r.isActive).map((r) => r.basePrice),
      ),
      grooming: cheapest(
        (groomingServices ?? [])
          .filter((g) => g.isActive)
          .map((g) => g.basePrice),
      ),
      // A series that is over or cancelled is not something to quote from.
      training: cheapest(
        (trainingSeries ?? [])
          .filter((s) => s.status !== "cancelled" && s.status !== "completed")
          .map((s) => s.enrollmentRules.fullPaymentAmount)
          .filter((p): p is number => typeof p === "number" && p > 0),
      ),
    };
  }, [categories, daycareRates, groomingServices, trainingSeries]);
}
