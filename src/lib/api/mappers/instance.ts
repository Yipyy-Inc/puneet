import type {
  EmployeeOnboardingTaskType,
  OnboardingChangeRequest,
  OnboardingInstance,
  OnboardingSection,
  SectionStatus,
} from "@/data/staff-onboarding";
import type { Tables } from "@/types/database";

// ============================================================================
// Instance rows -> the OnboardingInstance the app already expects.
//
// ONE FIELD DOES NOT MAP, DELIBERATELY: `token`.
//
// OnboardingInstance.token is a string in the TypeScript because the mock store
// kept the token in the object it handed around. There is nothing to put there
// now — the database holds a hash — so the mapped object omits it, and the type
// below says `Omit<OnboardingInstance, "token">` rather than filling the field
// with a lie like "" or the hash. A caller that needs the token gets it from
// the response of the endpoint that minted it, once.
// ============================================================================

// Built from the columns INSTANCE_SELECT actually asks for, not from
// Tables<"onboarding_instances">. That is not a workaround for a type error —
// it is the same decision as the select, stated twice on purpose: `token_hash`
// is absent here, so a future edit that tries to read it does not compile.
type InstanceRow = Pick<
  Tables<"onboarding_instances">,
  | "id"
  | "staff_id"
  | "facility_id"
  | "template_id"
  | "token_expires_at"
  | "invited_at"
  | "account_password_set_at"
  | "submitted_at"
  | "reviewed_at"
  | "last_deadline_reminder"
  | "expiry_notified_at"
> & {
  staff?: { legacy_id: string | null } | null;
  onboarding_templates?: { legacy_id: string | null } | null;
  onboarding_sections?: Tables<"onboarding_sections">[] | null;
  onboarding_change_requests?: Tables<"onboarding_change_requests">[] | null;
};

/** The instance as the app models it, minus the field the database will not
 *  hand back. See the header. */
export type StoredOnboardingInstance = Omit<OnboardingInstance, "token">;

export function rowToInstance(row: InstanceRow): StoredOnboardingInstance {
  return {
    staffId: row.staff?.legacy_id ?? row.staff_id,
    templateId: row.onboarding_templates?.legacy_id ?? row.template_id ?? "",
    tokenExpiresAt: row.token_expires_at,
    invitedAt: row.invited_at,
    submittedAt: row.submitted_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    account: row.account_password_set_at
      ? { passwordSetAt: row.account_password_set_at }
      : undefined,
    lastDeadlineReminder: row.last_deadline_reminder ?? undefined,
    expiryNotifiedAt: row.expiry_notified_at ?? undefined,
    sections: (row.onboarding_sections ?? []).map(
      (s): OnboardingSection => ({
        taskId: s.task_key,
        type: s.section_type as EmployeeOnboardingTaskType,
        status: s.status as SectionStatus,
        data: (s.data ?? {}) as Record<string, unknown>,
        completedAt: s.completed_at ?? undefined,
      }),
    ),
    changeRequests: (row.onboarding_change_requests ?? []).map(
      (c): OnboardingChangeRequest => ({
        taskId: c.task_key ?? undefined,
        sectionType: c.section_type as EmployeeOnboardingTaskType,
        note: c.note,
        resolvedAt: c.resolved_at ?? undefined,
      }),
    ),
  };
}

/** `token_hash` is deliberately absent from the select. It is not a field the
 *  API has any business returning, and leaving it out of the query is a
 *  stronger guarantee than remembering to strip it from the response. */
export const INSTANCE_SELECT = `
  id, staff_id, facility_id, template_id, token_expires_at, invited_at,
  account_password_set_at, submitted_at, reviewed_at,
  last_deadline_reminder, expiry_notified_at,
  staff ( legacy_id ),
  onboarding_templates ( legacy_id ),
  onboarding_sections ( * ),
  onboarding_change_requests ( * )
` as const;
