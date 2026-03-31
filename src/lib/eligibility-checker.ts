/**
 * Eligibility checker for custom module bookings.
 * Validates that a pet/client meets all conditions before allowing a booking.
 */

import type {
  CustomServiceModule,
  EligibilityCondition,
} from "@/types/facility";
import type { Pet } from "@/types/pet";
import type { Client } from "@/types/client";
import type { Booking } from "@/types/booking";
import { vaccinationRecords } from "@/data/pet-data";
import { getTagsForEntity } from "@/data/tags-notes";

export interface EligibilityResult {
  eligible: boolean;
  failedConditions: {
    condition: EligibilityCondition;
    reason: string;
  }[];
  passedConditions: EligibilityCondition[];
  deniedMessage?: string;
}

function checkCondition(
  condition: EligibilityCondition,
  pet: Pet,
  client: Client,
  existingBookings: Booking[],
): { passed: boolean; reason: string } {
  switch (condition.type) {
    case "pet_type": {
      const val = String(condition.value).toLowerCase();
      const petType = pet.type.toLowerCase();
      const passed =
        condition.operator === "equals"
          ? petType === val
          : condition.operator === "not_equals"
            ? petType !== val
            : condition.operator === "in_list" && Array.isArray(condition.value)
              ? condition.value.map((v) => v.toLowerCase()).includes(petType)
              : false;
      return {
        passed,
        reason: passed
          ? `Pet is a ${pet.type}`
          : `Pet must be a ${condition.value} (is ${pet.type})`,
      };
    }

    case "evaluation": {
      const hasEval = pet.evaluations?.some(
        (e) => e.status === "passed" && !e.isExpired,
      );
      const passed =
        condition.operator === "has" ? !!hasEval : !hasEval;
      return {
        passed,
        reason: passed
          ? "Evaluation passed"
          : "Pet has not passed required evaluation",
      };
    }

    case "membership": {
      const membership = client.membership;
      const hasMembership =
        membership?.status === "active";
      if (condition.operator === "has") {
        if (typeof condition.value === "string" && condition.value) {
          const planMatch =
            membership?.plan?.toLowerCase() ===
            condition.value.toLowerCase();
          return {
            passed: hasMembership && planMatch,
            reason:
              hasMembership && planMatch
                ? `${membership.plan} membership active`
                : `Requires ${condition.value} membership`,
          };
        }
        return {
          passed: !!hasMembership,
          reason: hasMembership
            ? "Active membership"
            : "Requires active membership",
        };
      }
      return { passed: true, reason: "" };
    }

    case "service_booked": {
      const requiredService = String(condition.value).toLowerCase();
      const hasBooking = existingBookings.some(
        (b) =>
          b.service?.toLowerCase() === requiredService &&
          b.clientId === client.id &&
          (b.status === "confirmed" || b.status === "pending"),
      );
      const passed =
        condition.operator === "has" ? hasBooking : !hasBooking;
      return {
        passed,
        reason: passed
          ? `Has ${condition.value} booking`
          : `Requires active ${condition.value} reservation`,
      };
    }

    case "tag": {
      const tags = getTagsForEntity("pet", pet.id);
      const tagName = String(condition.value).toLowerCase();
      const hasTag = tags.some(
        (t) => t.name.toLowerCase().includes(tagName),
      );
      const passed = condition.operator === "has" ? hasTag : !hasTag;
      return {
        passed,
        reason: passed
          ? `Has "${condition.value}" tag`
          : `Pet needs "${condition.value}" tag`,
      };
    }

    case "vaccination": {
      const records = vaccinationRecords.filter(
        (v) => v.petId === pet.id,
      );
      const vacName = String(condition.value).toLowerCase();
      const hasVac = records.some((v) => {
        const current =
          new Date(v.expiryDate).getTime() > Date.now();
        return (
          v.vaccineName.toLowerCase().includes(vacName) && current
        );
      });
      const passed = condition.operator === "has" ? hasVac : !hasVac;
      return {
        passed,
        reason: passed
          ? `${condition.value} vaccination current`
          : `${condition.value} vaccination required or expired`,
      };
    }

    case "age": {
      const age = pet.age;
      const threshold = Number(condition.value);
      const passed =
        condition.operator === "greater_than"
          ? age > threshold
          : condition.operator === "less_than"
            ? age < threshold
            : age === threshold;
      return {
        passed,
        reason: passed
          ? `Pet age (${age}) meets requirement`
          : `Pet must be ${condition.operator === "greater_than" ? "over" : "under"} ${threshold} years`,
      };
    }

    case "weight": {
      const weight = pet.weight;
      const threshold = Number(condition.value);
      const passed =
        condition.operator === "greater_than"
          ? weight > threshold
          : condition.operator === "less_than"
            ? weight < threshold
            : weight === threshold;
      return {
        passed,
        reason: passed
          ? `Pet weight (${weight} lbs) meets requirement`
          : `Pet must be ${condition.operator === "greater_than" ? "over" : "under"} ${threshold} lbs`,
      };
    }

    case "waiver":
    case "custom":
    default:
      // For now, assume these pass (would check actual form/waiver data)
      return { passed: true, reason: condition.label };
  }
}

export function checkEligibility(
  svcModule: CustomServiceModule,
  pet: Pet,
  client: Client,
  existingBookings: Booking[],
): EligibilityResult {
  const rules = svcModule.eligibilityRules;
  if (!rules?.enabled || rules.conditions.length === 0) {
    return { eligible: true, failedConditions: [], passedConditions: [] };
  }

  const failed: EligibilityResult["failedConditions"] = [];
  const passed: EligibilityCondition[] = [];

  for (const condition of rules.conditions) {
    const result = checkCondition(condition, pet, client, existingBookings);
    if (result.passed) {
      passed.push(condition);
    } else {
      failed.push({ condition, reason: result.reason });
    }
  }

  const eligible =
    rules.operator === "all"
      ? failed.length === 0
      : passed.length > 0;

  return {
    eligible,
    failedConditions: failed,
    passedConditions: passed,
    deniedMessage: !eligible ? rules.deniedMessage : undefined,
  };
}

/**
 * Check service dependencies for a booking.
 */
export function checkDependencies(
  svcModule: CustomServiceModule,
  client: Client,
  pet: Pet,
  existingBookings: Booking[],
  requestedDate: string,
): { met: boolean; missing: string[] } {
  const deps = svcModule.serviceDependencies;
  if (!deps?.requiresServices?.length) return { met: true, missing: [] };

  const missing: string[] = [];
  const petId = pet.id;

  for (const req of deps.requiresServices) {
    const clientBookings = existingBookings.filter(
      (b) =>
        b.clientId === client.id &&
        (Array.isArray(b.petId) ? b.petId.includes(petId) : b.petId === petId) &&
        b.service?.toLowerCase() === req.moduleId.toLowerCase() &&
        (b.status === "confirmed" || b.status === "pending"),
    );

    let found = false;
    switch (req.type) {
      case "concurrent":
        found = clientBookings.some(
          (b) => b.startDate <= requestedDate && b.endDate >= requestedDate,
        );
        break;
      case "same_day":
        found = clientBookings.some((b) => b.startDate === requestedDate);
        break;
      case "any_active":
        found = clientBookings.length > 0;
        break;
    }

    if (!found) missing.push(req.moduleName);
  }

  return { met: missing.length === 0, missing };
}
