"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useRooms } from "@/hooks/use-rooms";
import { useDaycareRates } from "@/hooks/use-daycare-rates";
import { groomingCatalogueQueries } from "@/lib/api/grooming-catalogue";
import { trainingQueries } from "@/lib/api/training";
import type { PackageModule } from "@/lib/api/prepaid-packages";
import { NO_ITEMS } from "@/lib/no-items";

// ============================================================================
// What a package of each module can hold — the facility's own services.
//
// The boarding and training Packages screens offered `services` from
// `@/data/services-pricing` (another facility's price list) and the daycare
// one `daycarePackages` from `@/data/daycare`. A package line is priced from
// the option it was built from, so the option has to be what the facility
// actually sells:
//
//   grooming  its grooming menu (grooming_services)
//   boarding  its boarding room categories, at their default nightly price
//   daycare   its own rate cards (daycare_rates), at their base price
//   training  each course it runs a series of, at the per-session price of
//             its cheapest running series
//
// `id` is what the line stores as `service_id`.
// ============================================================================

export interface PackageServiceOption {
  id: string;
  name: string;
  basePrice: number;
}

export function usePackageServiceOptions(
  module: PackageModule,
): PackageServiceOption[] {
  const { data: groomingServices } = useQuery({
    ...groomingCatalogueQueries.services(),
    enabled: module === "grooming",
  });
  const { data: series } = useQuery({
    ...trainingQueries.series(),
    enabled: module === "training",
  });
  const { categories } = useRooms();
  const { rates: daycareRates } = useDaycareRates();

  return useMemo(() => {
    if (module === "grooming") {
      return (groomingServices ?? NO_ITEMS)
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.id, name: s.name, basePrice: s.basePrice }));
    }
    if (module === "boarding") {
      return categories
        .filter((c) => c.service === "boarding")
        .map((c) => ({
          id: c.id,
          name: c.name,
          basePrice: c.defaultBasePrice ?? 0,
        }));
    }
    if (module === "daycare") {
      // The facility's own rate cards, the way boarding lists its classes and
      // grooming its menu. This was a single synthetic "full day" option
      // priced from `daycare_config.basePrice` — a fixture's 35 for any
      // facility that had not edited it — while the rate card it should have
      // been reading sat in `daycare_rates`.
      return daycareRates
        .filter((rate) => rate.isActive)
        .map((rate) => ({
          id: rate.id,
          name: rate.name,
          basePrice: rate.basePrice,
        }));
    }
    const byCourse = new Map<string, PackageServiceOption>();
    for (const s of series ?? NO_ITEMS) {
      if (s.status === "cancelled" || s.status === "completed") continue;
      const perSession =
        s.numberOfWeeks > 0
          ? Math.round(
              (s.enrollmentRules.fullPaymentAmount / s.numberOfWeeks) * 100,
            ) / 100
          : s.enrollmentRules.fullPaymentAmount;
      const known = byCourse.get(s.courseTypeId);
      if (!known || perSession < known.basePrice) {
        byCourse.set(s.courseTypeId, {
          id: s.courseTypeId,
          name: s.courseTypeName,
          basePrice: perSession,
        });
      }
    }
    return [...byCourse.values()];
  }, [module, groomingServices, series, categories, daycareRates]);
}
