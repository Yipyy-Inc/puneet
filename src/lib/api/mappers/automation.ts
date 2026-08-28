import { templateVariableKeys } from "@/lib/messaging/render";
import {
  DELIVERABLE_TRIGGERS,
  type AutomationChannel,
  type MessageSendRow,
  type RealAutomationRule,
  type RealMessageTemplate,
  type SendStatus,
} from "@/types/automations";
import type { Tables } from "@/types/database";

// ============================================================================
// Postgres rows -> the shapes the screens read.
//
// The only interesting thing here is what is COMPUTED rather than read:
// `variables` off the body, and `totalSent` / `lastTriggeredAt` off the outbox.
// Neither is a column, deliberately — see the migration header.
// ============================================================================

export const TEMPLATE_SELECT =
  "id, key, name, channel, category, subject, body, is_active, is_system";

export const RULE_SELECT =
  "id, name, trigger, enabled, email_template_id, sms_template_id, service_types, location_ids, min_amount, offset_minutes, cooldown_days, is_transactional, created_at, updated_at";

export function toTemplate(
  row: Tables<"message_templates">,
): RealMessageTemplate {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    channel: row.channel as AutomationChannel,
    category: row.category as RealMessageTemplate["category"],
    subject: row.subject,
    body: row.body,
    isActive: row.is_active,
    isSystem: row.is_system,
    variables: templateVariableKeys(row.subject, row.body),
  };
}

export interface RuleUsage {
  totalSent: number;
  lastTriggeredAt: string | null;
}

export function toRule(
  row: Tables<"automation_rules">,
  usage?: RuleUsage,
): RealAutomationRule {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger as RealAutomationRule["trigger"],
    enabled: row.enabled,
    emailTemplateId: row.email_template_id,
    smsTemplateId: row.sms_template_id,
    serviceTypes: row.service_types ?? [],
    locationIds: row.location_ids ?? [],
    // PostgREST returns `numeric` as a string. Number(null) is 0, which would
    // turn "no minimum" into "at least $0" — a different rule.
    minAmount: row.min_amount === null ? null : Number(row.min_amount),
    offsetMinutes: row.offset_minutes,
    cooldownDays: row.cooldown_days,
    isTransactional: row.is_transactional,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalSent: usage?.totalSent ?? 0,
    lastTriggeredAt: usage?.lastTriggeredAt ?? null,
    deliverable: DELIVERABLE_TRIGGERS.has(row.trigger),
  };
}

export function toSend(row: Tables<"message_sends">): MessageSendRow {
  return {
    id: row.id,
    channel: row.channel as AutomationChannel,
    toAddress: row.to_address,
    sourceKind: row.source_kind as MessageSendRow["sourceKind"],
    sourceId: row.source_id,
    status: row.status as SendStatus,
    skipReason: row.skip_reason,
    subject: row.subject_rendered,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    lastError: row.last_error,
    clientId: row.client_id,
    createdAt: row.created_at,
  };
}

/**
 * Fold the outbox into per-rule counts.
 *
 * Counting in the app rather than with a PostgREST aggregate for the same
 * reason the chore list counts its group usage here: a rule that has sent
 * NOTHING has to come back as 0, and any join that would let it be absent
 * instead is a rule that silently vanishes from the list.
 *
 * Only `sent` counts toward `totalSent`. A queued or skipped row is not a
 * message the customer received, and this number replaces one that claimed
 * 1,392 sends for a system that had never sent anything — so it is worth being
 * exact about.
 */
export function foldUsage(
  rows: { source_id: string | null; status: string; sent_at: string | null }[],
): Map<string, RuleUsage> {
  const usage = new Map<string, RuleUsage>();
  for (const row of rows) {
    if (!row.source_id) continue;
    const current = usage.get(row.source_id) ?? {
      totalSent: 0,
      lastTriggeredAt: null,
    };
    if (row.status === "sent") {
      current.totalSent += 1;
      if (
        row.sent_at &&
        (!current.lastTriggeredAt || row.sent_at > current.lastTriggeredAt)
      ) {
        current.lastTriggeredAt = row.sent_at;
      }
    }
    usage.set(row.source_id, current);
  }
  return usage;
}
