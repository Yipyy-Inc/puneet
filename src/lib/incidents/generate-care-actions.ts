import type { FollowUpProtocol, IncidentCareAction } from "@/types/incidents";

interface GenerateCareActionOptions {
  incidentId: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Materialize a protocol's In-Stay Care Action steps (2B) into incident care
 * action records (0.2), pre-populated from each step's configured values —
 * Flow A step 8. Owner-contact steps are ignored here (they become follow-up
 * tasks via generateFollowUpTasks). Staff can review/adjust the results in the
 * In-Stay Care tab rather than building them from scratch.
 */
export function generateCareActionsFromProtocol(
  protocol: FollowUpProtocol,
  options: GenerateCareActionOptions,
): IncidentCareAction[] {
  return protocol.steps
    .filter((step) => step.stepType === "in_stay_care")
    .map((step) => ({
      id: `care-${options.incidentId}-${step.id}`,
      incidentId: options.incidentId,
      name: step.careActionName ?? step.title,
      frequency: step.frequency ?? "once_daily",
      duration: step.duration ?? "until_checkout",
      starts: step.starts ?? "immediately",
      staffInstructions: step.staffInstructions ?? step.instructions ?? "",
      requiresPhoto: step.requiresPhoto,
      createdBy: options.createdBy,
      createdAt: options.createdAt,
      active: true,
    }));
}
