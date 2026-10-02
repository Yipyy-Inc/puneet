import type { FacilityBookingFlowConfig } from "@/types/booking";
import type { ModuleConfig } from "@/types/facility";
import type { Pet } from "@/types/pet";

// ============================================================================
// Whether a service needs an evaluation, and whether a pet's evaluation lets
// it in — the rules behind the service cards' "Evaluation required" and the
// customer's "Locked — Mango needs an evaluation" (the client's mock,
// 2026-10-01). Moved out of the old ServiceStep unchanged.
// ============================================================================

type EvaluationLike = {
  evaluatedAt?: string;
  status?: string;
  isExpired?: boolean;
  approvedServices?: unknown;
  serviceApprovals?: unknown;
  approvals?: unknown;
};

/** The most recent evaluation, by date; null when there is none. */
function latestEvaluation(pet: Pet): EvaluationLike | null {
  const evaluations =
    (pet as unknown as { evaluations?: EvaluationLike[] }).evaluations ?? [];
  if (evaluations.length === 0) return null;
  return [...evaluations].sort((a, b) => {
    const da = a.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
    const db = b.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
    return db - da;
  })[0]!;
}

type ApprovalMap = {
  daycare?: boolean;
  boarding?: boolean;
  customApproved?: string[];
  custom?: string[];
};

function approves(evaluation: EvaluationLike, serviceId: string): boolean {
  const approvals =
    evaluation.approvedServices ??
    evaluation.serviceApprovals ??
    evaluation.approvals ??
    null;
  // A pass that names no services lets the pet into all of them.
  if (!approvals) return true;
  if (typeof approvals === "object" && !Array.isArray(approvals)) {
    const map = approvals as ApprovalMap;
    if (serviceId === "daycare" && typeof map.daycare === "boolean") {
      return map.daycare;
    }
    if (serviceId === "boarding" && typeof map.boarding === "boolean") {
      return map.boarding;
    }
    if (Array.isArray(map.customApproved)) {
      return map.customApproved.includes(serviceId);
    }
    if (Array.isArray(map.custom)) return map.custom.includes(serviceId);
  }
  if (Array.isArray(approvals)) return approvals.includes(serviceId);
  if (approvals === "both") {
    return serviceId === "daycare" || serviceId === "boarding";
  }
  if (approvals === "daycare") return serviceId === "daycare";
  if (approvals === "boarding") return serviceId === "boarding";
  return false;
}

/** The pet's latest evaluation passed, is current, and covers this service. */
export function petUnlockedForService(pet: Pet, serviceId: string): boolean {
  const latest = latestEvaluation(pet);
  if (!latest || latest.status !== "passed") return false;
  if (latest.isExpired === true) return false;
  return approves(latest, serviceId);
}

/** Every pet in the list is evaluated, for any service. */
export function petsAllEvaluated(pets: readonly Pet[]): boolean {
  return pets.every((pet) => {
    const latest = latestEvaluation(pet);
    return !!latest && latest.status === "passed" && latest.isExpired !== true;
  });
}

/** The facility asks for an evaluation before this service. */
export function serviceNeedsEvaluation(
  serviceId: string,
  config: ModuleConfig | undefined,
  flow: FacilityBookingFlowConfig,
): boolean {
  if (serviceId === "evaluation") return false;
  return (
    flow.evaluationRequired ||
    flow.servicesRequiringEvaluation.includes(serviceId) ||
    ((config?.settings.evaluation.enabled ?? false) &&
      !(config?.settings.evaluation.optional ?? false))
  );
}
