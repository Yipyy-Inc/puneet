import type { StandaloneTask } from "@/data/work-tasks";
import type { ReputationRequest } from "@/types/reputation";

/**
 * Build a manager follow-up task for a negative review that was intercepted and
 * routed to the internal escalation ledger (Step 3B). Deterministic id keyed by
 * the reputation request, so it dedupes against re-generation.
 */
export function buildReputationEscalationTask(
  req: ReputationRequest,
  assignee: { id: string; name: string } = {
    id: "staff-006",
    name: "Manager One",
  },
): StandaloneTask {
  const now = new Date();
  const rating = req.rating ?? 0;
  return {
    id: `task-rep-${req.id}-${assignee.id}`,
    title: `Service recovery: ${req.clientName} — ${req.petName} (${rating}★)`,
    description: req.feedbackText
      ? `Negative ${req.serviceLabel} review intercepted. Client said: “${req.feedbackText}”. Follow up to make it right.`
      : `Negative ${rating}★ review for ${req.petName}'s ${req.serviceLabel.toLowerCase()} visit — follow up with the client to make it right.`,
    category: "customer-service",
    priority: rating <= 2 ? "urgent" : "high",
    status: "pending",
    assignedToId: assignee.id,
    assignedToName: assignee.name,
    dueDate: now.toISOString().slice(0, 10),
    dueTime: "09:00",
    estimatedMinutes: 20,
    requiresPhoto: false,
    requiresSignoff: false,
    createdAt: now.toISOString(),
    metadata: { reputationRequestId: req.id },
  };
}
