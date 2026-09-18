"use client";

import { useVaccinationRules } from "@/lib/api/facility-settings";
import { formatList } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { localToday, missingForService } from "@/lib/vaccinations";
import type { VaccinationRecord } from "@/types/pet";

// ============================================================================
// The vaccines a check-in is about to wave through.
//
// The calendar asked this of a fixture — `facilityConfig.vaccinationRequirements
// .mandatoryRecords`, true for every facility — and of the soonest-expiring
// certificate on the pet, required or not, for any service. The booking page
// did not ask at all. Both ask here now, of the facility's own rules for the
// booking's service, so a check-in from either warns the same way.
//
// It warns; it does not refuse. Nothing on the server checks vaccinations at
// arrival yet (debt map), and the person at the desk may be holding the paper.
// ============================================================================

export interface VaccineGap {
  petName: string;
  vaccines: string[];
}

/**
 * The gaps as one clause — "Rabies and Bordetella for Kofi; Rabies for Luna".
 * `pair` is the translated "{vaccines} for {pet}"; the vaccine names are the
 * facility's own and are never translated.
 */
export function describeVaccineGaps(
  gaps: readonly VaccineGap[],
  locale: AppLocale,
  pair: (vaccines: string, pet: string) => string,
): string {
  return gaps
    .map((gap) => pair(formatList(gap.vaccines, locale), gap.petName))
    .join("; ");
}

export function useVaccineGaps(records: readonly VaccinationRecord[]) {
  const { rules } = useVaccinationRules();

  return (
    service: string,
    pets: readonly { id: number; name: string; type?: string }[],
  ): VaccineGap[] => {
    const today = localToday();
    return pets.flatMap((pet) => {
      if (!pet.type) return [];
      const missing = missingForService(
        service,
        pet.type,
        records.filter((record) => record.petId === pet.id),
        rules,
        today,
      );
      return missing.length === 0
        ? []
        : [{ petName: pet.name, vaccines: missing.map((r) => r.vaccineName) }];
    });
  };
}
