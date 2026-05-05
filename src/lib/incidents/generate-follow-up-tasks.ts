import type {
  FollowUpProtocol,
  FollowUpProtocolStep,
  FollowUpTask,
} from "@/types/incidents";

interface GenerateOptions {
  incidentId: string;
  incidentDate: string;
  reporter: string;
  managerOnDuty?: string;
  shiftLead?: string;
  ownerContact?: string;
}

/**
 * Resolve the assignee for a protocol step based on its role.
 * Falls back gracefully if a specific role isn't filled.
 */
function resolveAssignee(
  step: FollowUpProtocolStep,
  ctx: GenerateOptions,
): string {
  switch (step.assigneeRole) {
    case "reporter":
      return ctx.reporter;
    case "manager":
      return ctx.managerOnDuty ?? ctx.reporter;
    case "owner_contact":
      return ctx.ownerContact ?? ctx.managerOnDuty ?? ctx.reporter;
    case "shift_lead":
      return ctx.shiftLead ?? ctx.reporter;
    case "specific":
      return step.assigneeName ?? ctx.reporter;
    case "any_staff":
      return "Any Available Staff";
    default:
      return ctx.reporter;
  }
}

function addOffset(
  baseIso: string,
  days: number,
  hours: number,
): string {
  const date = new Date(baseIso);
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

/**
 * Materialize a protocol into a list of FollowUpTask instances scheduled
 * relative to an incident. Each task is tagged for surfacing on the
 * assignee's daily task list on the day it is due.
 */
export function generateFollowUpTasks(
  protocol: FollowUpProtocol,
  options: GenerateOptions,
): FollowUpTask[] {
  return protocol.steps.map((step) => {
    const dueDate = addOffset(
      options.incidentDate,
      step.daysAfterIncident,
      step.hoursAfterIncident,
    );

    const task: FollowUpTask = {
      id: `task-${options.incidentId}-${step.id}`,
      incidentId: options.incidentId,
      title: step.title,
      description: step.description,
      assignedTo: resolveAssignee(step, options),
      dueDate,
      status: "pending",

      protocolId: protocol.id,
      protocolStepId: step.id,
      protocolName: protocol.name,
      stepOrder: step.order,

      contactMethod: step.contactMethod,
      instructions: step.instructions,
      questionsToAsk: step.questionsToAsk,
      requiresPhoto: step.requiresPhoto,
      requiresClientResponse: step.requiresClientResponse,

      conversationLog: [],
      attemptCount: 0,
      escalated: false,
      escalateAfterAttempts: step.escalateAfterAttempts,

      scheduledFor: dueDate,
      surfacedToDailyTasks: true,
    };

    return task;
  });
}
