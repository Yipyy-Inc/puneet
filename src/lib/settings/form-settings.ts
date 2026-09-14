import { z } from "zod";

// ============================================================================
// What a facility says about its forms: which are required for which service,
// who hears about a submission, and which answers are a red flag.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// Three settings screens over three fixtures. Form requirements listed six
// invented form ids ("form-intake-demo") and saved by splicing an in-memory
// array; form notifications seeded from `facilityConfig` and saved nothing at
// all behind a "Saved" toast; the red-flag rules wrote a module-level object.
// All three were back on reload, identical at every facility.
//
// ── WHAT IS STILL NOT READ ────────────────────────────────────────────────
//
// These are now the facility's own values, stored. Nothing yet ENFORCES a
// requirement at booking or check-in, sends a form notification, or flags an
// answer on submission — the readers of the old values were fixture code in
// the browser. Recorded in docs/quality/debt-map.md (2026-09-14).
// ============================================================================

export const FORM_REQUIREMENT_SERVICES = [
  "daycare",
  "boarding",
  "grooming",
  "training",
] as const;

export const formRequirementGateSchema = z.object({
  stage: z.enum(["before_booking", "before_approval", "before_checkin"]),
  enforcement: z.enum(["block", "warn"]),
});

export const serviceFormRequirementSchema = z.object({
  formId: z.string().min(1),
  formName: z.string(),
  gates: z.array(formRequirementGateSchema).min(1).max(3),
  petTypes: z.array(z.string()).optional(),
  enabled: z.boolean(),
});

export const serviceFormRequirementsSchema = z.object({
  serviceType: z.string().min(1),
  serviceLabel: z.string(),
  requirements: z.array(serviceFormRequirementSchema).max(50),
});

export const formRequirementsSchema = z.object({
  services: z.array(serviceFormRequirementsSchema).max(20),
});

export type FormRequirementGate = z.infer<typeof formRequirementGateSchema>;
export type ServiceFormRequirement = z.infer<
  typeof serviceFormRequirementSchema
>;
export type ServiceFormRequirementsConfig = z.infer<
  typeof serviceFormRequirementsSchema
>;
export type FormRequirements = z.infer<typeof formRequirementsSchema>;

/** No form is required anywhere until a facility says so. */
export const NO_FORM_REQUIREMENTS: FormRequirements = { services: [] };

/**
 * One row per service for the editor: every standard service, in order, with
 * whatever the facility stored for it, then any other service it stored.
 */
export function requirementsForEditor(
  stored: FormRequirements,
): ServiceFormRequirementsConfig[] {
  const byType = new Map(stored.services.map((s) => [s.serviceType, s]));
  const standard = FORM_REQUIREMENT_SERVICES.map(
    (serviceType) =>
      byType.get(serviceType) ?? {
        serviceType,
        serviceLabel: serviceType,
        requirements: [],
      },
  );
  const others = stored.services.filter(
    (s) =>
      !(FORM_REQUIREMENT_SERVICES as readonly string[]).includes(s.serviceType),
  );
  return [...standard, ...others];
}

export const formNotificationsSchema = z.object({
  staff: z.object({
    newSubmission: z.boolean(),
    redFlagAnswers: z.boolean(),
    hasFileUpload: z.boolean(),
  }),
  customer: z.object({
    submissionConfirmed: z.boolean(),
    missingRequiredFormsReminder: z.boolean(),
    formRejectedNeedsCorrection: z.boolean(),
  }),
  reminder: z.object({
    value: z.number().int().min(1).max(720),
    unit: z.enum(["hours", "days"]),
    anchor: z.enum(["appointment", "check_in"]),
  }),
});

export type FormNotifications = z.infer<typeof formNotificationsSchema>;

/** The defaults the screen always showed: everything on, 48 hours ahead. */
export const DEFAULT_FORM_NOTIFICATIONS: FormNotifications = {
  staff: { newSubmission: true, redFlagAnswers: true, hasFileUpload: true },
  customer: {
    submissionConfirmed: true,
    missingRequiredFormsReminder: true,
    formRejectedNeedsCorrection: true,
  },
  reminder: { value: 48, unit: "hours", anchor: "check_in" },
};

export const formRedFlagRuleSchema = z.object({
  id: z.string().min(1),
  formId: z.string().min(1),
  formName: z.string(),
  questionId: z.string().min(1),
  questionLabel: z.string(),
  operator: z.enum(["equals", "contains"]),
  value: z.string().min(1).max(200),
});

export const formRedFlagsSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(80)).max(100),
  rules: z.array(formRedFlagRuleSchema).max(100),
});

export type FormRedFlags = z.infer<typeof formRedFlagsSchema>;

export const NO_FORM_RED_FLAGS: FormRedFlags = { keywords: [], rules: [] };
