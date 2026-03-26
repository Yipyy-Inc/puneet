/**
 * 7.1 Form Requirements — check required forms before booking / approval / check-in.
 *
 * Uses the rich ServiceFormRequirementsConfig from settings.ts.
 * Returns structured results for UI: missing forms, enforcement mode, stage context.
 */

import {
  formRequirements,
  type ServiceFormRequirementsConfig,
  type ServiceFormRequirement,
  type FormRequirementGate,
} from "@/data/settings";
import { getSubmissionsByFacility } from "@/data/form-submissions";
import type {
  RequirementStage,
  MissingFormResult,
  FormRequirementsCheck,
} from "@/types/forms";

export type {
  RequirementStage,
  MissingFormResult,
  FormRequirementsCheck,
} from "@/types/forms";

/** Get the form requirements config for a given service type */
export function getServiceFormRequirements(
  serviceType: string,
): ServiceFormRequirementsConfig | undefined {
  return formRequirements.find((r) => r.serviceType === serviceType);
}

/** Get all enabled requirements for a service at a specific stage */
export function getRequirementsAtStage(
  serviceType: string,
  stage: RequirementStage,
): { requirement: ServiceFormRequirement; gate: FormRequirementGate }[] {
  const config = getServiceFormRequirements(serviceType);
  if (!config) return [];

  const results: {
    requirement: ServiceFormRequirement;
    gate: FormRequirementGate;
  }[] = [];
  for (const req of config.requirements) {
    if (!req.enabled) continue;
    for (const gate of req.gates) {
      if (gate.stage === stage) {
        results.push({ requirement: req, gate });
      }
    }
  }
  return results;
}

/**
 * Check form completion for a customer/pet at a specific booking stage.
 * Looks up all submissions by the customer for the facility and checks which required forms
 * have been submitted.
 */
export function checkFormRequirements(
  facilityId: number,
  serviceType: string,
  stage: RequirementStage,
  customerId?: number,
  _petId?: number,
): FormRequirementsCheck {
  const stageReqs = getRequirementsAtStage(serviceType, stage);
  if (stageReqs.length === 0) {
    return {
      complete: true,
      missing: [],
      hasBlocker: false,
      hasWarning: false,
      totalRequired: 0,
      totalCompleted: 0,
    };
  }

  // Get all submissions for this facility to check completion
  const allSubs = getSubmissionsByFacility(facilityId);
  const customerSubs = customerId
    ? allSubs.filter((s) => s.customerId === customerId)
    : allSubs;

  // Collect completed form IDs (any status counts as submitted)
  const completedFormIds = new Set(customerSubs.map((s) => s.formId));

  const missing: MissingFormResult[] = [];
  let completed = 0;

  for (const { requirement, gate } of stageReqs) {
    if (completedFormIds.has(requirement.formId)) {
      completed++;
    } else {
      missing.push({
        formId: requirement.formId,
        formName: requirement.formName,
        enforcement: gate.enforcement,
        stage,
      });
    }
  }

  return {
    complete: missing.length === 0,
    missing,
    hasBlocker: missing.some((m) => m.enforcement === "block"),
    hasWarning: missing.some((m) => m.enforcement === "warn"),
    totalRequired: stageReqs.length,
    totalCompleted: completed,
  };
}

/**
 * Quick check: should the booking step be blocked?
 * Returns true if any missing form at this stage has enforcement = "block".
 */
export function shouldBlockAtStage(
  facilityId: number,
  serviceType: string,
  stage: RequirementStage,
  customerId?: number,
): boolean {
  const check = checkFormRequirements(
    facilityId,
    serviceType,
    stage,
    customerId,
  );
  return check.hasBlocker;
}

/** Get human-readable stage label */
export function getStageLabel(stage: RequirementStage): string {
  switch (stage) {
    case "before_booking":
      return "Before booking";
    case "before_approval":
      return "Before approval";
    case "before_checkin":
      return "Before check-in";
  }
}

/** Get all service types that have form requirements configured */
export function getServicesWithFormRequirements(): ServiceFormRequirementsConfig[] {
  return formRequirements.filter((r) =>
    r.requirements.some((req) => req.enabled),
  );
}
