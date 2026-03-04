/**
 * 7.1 Helpers for required forms before booking / approve / check-in.
 * Use with facilityConfig.formRequirements and getSubmissionsForPet to block or show banner.
 */

import { facilityConfig } from "@/data/facility-config";
import { getSubmissionsForPet } from "@/data/form-submissions";
import { getFormById } from "@/data/forms";

export type ServiceKey = "boarding" | "daycare" | "grooming" | "training";

/** Get form IDs required before check-in for a service. Use to block or show "incomplete requirements" at check-in. */
export function getRequiredFormIdsBeforeCheckIn(service: ServiceKey): string[] {
  const req = facilityConfig.formRequirements[service];
  return req?.beforeCheckIn ?? [];
}

/** Get form IDs required before staff can approve a booking. */
export function getRequiredFormIdsBeforeApprove(service: ServiceKey): string[] {
  const req = facilityConfig.formRequirements[service];
  return req?.beforeApprove ?? [];
}

/** Check if pet has completed all required forms for check-in. Returns { complete, missing: { formId, formName }[] }. */
export function getPetFormCompletionForCheckIn(
  facilityId: number,
  service: ServiceKey,
  petId: number
): { complete: boolean; missing: { formId: string; formName: string }[] } {
  const requiredIds = getRequiredFormIdsBeforeCheckIn(service);
  if (requiredIds.length === 0) return { complete: true, missing: [] };
  const submissions = getSubmissionsForPet(facilityId, petId);
  const completedIds = new Set(submissions.map((s) => s.formId));
  const missing = requiredIds
    .filter((id) => !completedIds.has(id))
    .map((formId) => ({ formId, formName: getFormById(formId)?.name ?? formId }));
  return { complete: missing.length === 0, missing };
}

/** Behavior when forms are missing: "block" = block step; "banner" = allow but show incomplete requirements banner. */
export function getFormRequirementsIfMissing(service: ServiceKey): "block" | "banner" {
  return facilityConfig.formRequirements[service]?.ifMissing ?? "banner";
}
