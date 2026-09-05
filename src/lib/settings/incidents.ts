import { z } from "zod";

import { assigneeRoleEnum, incidentSeverityEnum } from "@/types/incidents";

// ============================================================================
// How this facility handles an incident: who is told, what is required, and
// whether the medication given is charged for.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// `localStorage`, under `settings-incident-reporting`. A facility policy about
// an animal getting hurt, stored per browser.
//
// Three of the four settings have real consequences when they differ machine to
// machine. `requirePhotoOnCritical` decides whether a critical incident can be
// filed with no evidence — set on the manager's laptop, absent at the front
// desk. `autoNotify` decides whether an owner and an emergency contact are told
// at all. And `chargeIncidentMedications` puts a fee on a bill, which makes
// this a money setting as well as a safety one.
//
// ── THE FALLBACK KEEPS THE DEFAULTS ───────────────────────────────────────
//
// Same reasoning as the vaccination list rather than the money domains: the
// shipped policy escalates by severity — nothing for low, the manager for
// medium, the owner too for high, the emergency contact for critical — and the
// charge is OFF. So the default notifies more and charges less, which is the
// safe direction on both axes. Emptying it would silently stop notifying an
// owner that their animal was hurt.
// ============================================================================

const incidentMedFeeModeEnum = z.enum(["per_admin", "one_time"]);

const notifyRuleSchema = z.object({
  notifyManager: z.boolean(),
  notifyOwner: z.boolean(),
  /** The pet-profile emergency contact, not the account holder. */
  notifyEmergencyContact: z.boolean(),
});

export const incidentReportingConfigSchema = z.object({
  chargeIncidentMedications: z.object({
    enabled: z.boolean(),
    feeMode: incidentMedFeeModeEnum,
    feeAmount: z.number(),
  }),
  defaultFollowUpAssigneeRole: assigneeRoleEnum,
  requirePhotoOnCritical: z.boolean(),
  autoNotify: z.record(incidentSeverityEnum, notifyRuleSchema),
});

export type IncidentReportingConfig = z.infer<
  typeof incidentReportingConfigSchema
>;

/** The shipped policy: notify by severity, charge nothing. */
export const DEFAULT_INCIDENT_REPORTING: IncidentReportingConfig = {
  chargeIncidentMedications: {
    enabled: false,
    feeMode: "per_admin",
    feeAmount: 5,
  },
  defaultFollowUpAssigneeRole: "reporter",
  requirePhotoOnCritical: false,
  autoNotify: {
    low: {
      notifyManager: false,
      notifyOwner: false,
      notifyEmergencyContact: false,
    },
    medium: {
      notifyManager: true,
      notifyOwner: false,
      notifyEmergencyContact: false,
    },
    high: {
      notifyManager: true,
      notifyOwner: true,
      notifyEmergencyContact: false,
    },
    critical: {
      notifyManager: true,
      notifyOwner: true,
      notifyEmergencyContact: true,
    },
  },
};
