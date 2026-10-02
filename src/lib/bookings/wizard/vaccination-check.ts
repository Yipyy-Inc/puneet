import type { VaccinationRule } from "@/types/facility";
import type { Pet, VaccinationRecord } from "@/types/pet";
import { isCover, recordMatchesRule } from "@/lib/vaccinations";

// ============================================================================
// "Vaccinations" on the booking wizard's Confirm (the client's mock,
// 2026-10-01): one line per pet, for the vaccines this facility requires for
// this service and this species.
//
//   ok        "Rabies, DHPP and Bordetella up to date"
//   expiring  "Bordetella expires Oct 3, 2026 — during the stay": covered on
//             the first day, lapsed before the last
//   missing   no cover on the first day — none on file, expired or rejected
//
// A pet the facility asks nothing of for this service gets no line, and the
// section is hidden when nobody has one.
// ============================================================================

export type VaccinationLineState = "ok" | "expiring" | "missing";

export interface PetVaccinationLine {
  petId: number;
  petName: string;
  state: VaccinationLineState;
  /** ok: every required vaccine; expiring: the ones lapsing; missing: the ones not covered. */
  vaccines: string[];
  /** expiring: the earliest day one of them lapses, YYYY-MM-DD. */
  expiresOn?: string;
}

export function vaccinationLines(input: {
  pets: readonly Pet[];
  records: readonly VaccinationRecord[];
  rules: readonly VaccinationRule[];
  service: string;
  /** The booking's first day, YYYY-MM-DD. */
  firstDay: string;
  /** Its last day, YYYY-MM-DD; the same as the first for a single day. */
  lastDay: string;
}): PetVaccinationLine[] {
  const service = input.service.toLowerCase();
  const lines: PetVaccinationLine[] = [];
  for (const pet of input.pets) {
    const rules = input.rules.filter(
      (rule) =>
        rule.required &&
        rule.species.toLowerCase() === (pet.type ?? "").toLowerCase() &&
        (rule.applicableServices.length === 0 ||
          rule.applicableServices.some((s) => s.toLowerCase() === service)),
    );
    if (rules.length === 0) continue;
    const own = input.records.filter((record) => record.petId === pet.id);

    const missing: string[] = [];
    const expiring: Array<{ name: string; on: string }> = [];
    for (const rule of rules) {
      const covers = own.filter(
        (record) =>
          recordMatchesRule(record, rule.vaccineName) &&
          isCover(record, input.firstDay),
      );
      if (covers.length === 0) {
        missing.push(rule.vaccineName);
        continue;
      }
      // The cover that lasts longest; a record with no expiry never lapses.
      const lasting = covers.some((record) => !record.expiryDate)
        ? null
        : covers
            .map((record) => record.expiryDate.slice(0, 10))
            .sort()
            .at(-1)!;
      if (lasting && lasting < input.lastDay) {
        expiring.push({ name: rule.vaccineName, on: lasting });
      }
    }

    if (missing.length > 0) {
      lines.push({
        petId: pet.id,
        petName: pet.name,
        state: "missing",
        vaccines: missing,
      });
    } else if (expiring.length > 0) {
      expiring.sort((a, b) => a.on.localeCompare(b.on));
      lines.push({
        petId: pet.id,
        petName: pet.name,
        state: "expiring",
        vaccines: expiring.map((e) => e.name),
        expiresOn: expiring[0]!.on,
      });
    } else {
      lines.push({
        petId: pet.id,
        petName: pet.name,
        state: "ok",
        vaccines: rules.map((rule) => rule.vaccineName),
      });
    }
  }
  return lines;
}
