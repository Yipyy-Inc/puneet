import type { CustomServiceModule } from "@/types/facility";
import { getModuleWorkflowQuestionnaire } from "@/data/custom-services";

export interface ValidationItem {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  /** Critical items must pass before the module can be saved. */
  critical: boolean;
}

/**
 * Pre-publish checklist for a custom service module. Critical items block Save;
 * warnings are advisory (e.g. the facility can configure rates later).
 */
export function validateCustomServiceModule(
  module: CustomServiceModule,
): ValidationItem[] {
  const items: ValidationItem[] = [];

  items.push({
    id: "name",
    label: "Service name is set",
    status: module.name.trim().length > 0 ? "pass" : "fail",
    critical: true,
  });

  items.push({
    id: "slug",
    label: "URL slug is set",
    status: module.slug.trim().length > 0 ? "pass" : "fail",
    critical: true,
  });

  const facilityIds = module.facilityIds ?? [];
  items.push({
    id: "facility",
    label: "Assigned to at least one facility",
    status:
      facilityIds.length > 0 && facilityIds.every((id) => id > 0)
        ? "pass"
        : "fail",
    critical: true,
  });

  items.push({
    id: "questionnaire",
    label: "Required questionnaire answered",
    status: getModuleWorkflowQuestionnaire(module).questionnaireCompleted
      ? "pass"
      : "fail",
    critical: true,
  });

  const isAddon = module.pricing.model === "addon_only";
  const pricingConfigured =
    !!module.pricing.model &&
    (isAddon ||
      (module.pricing.basePrice ?? 0) > 0 ||
      (module.pricing.durationTiers ?? []).some((t) => t.price > 0) ||
      (module.pricing.variants ?? []).some((v) => v.price > 0));
  items.push({
    id: "pricing",
    label: "Pricing is configured",
    status: pricingConfigured ? "pass" : "fail",
    critical: true,
  });

  // Warnings — don't block Save.
  const hasVariants =
    (module.pricing.variants?.length ?? 0) > 0 ||
    (module.pricing.durationTiers?.length ?? 0) > 0;
  items.push({
    id: "variants",
    label: "At least one rate variant defined (or set later by the facility)",
    status: hasVariants ? "pass" : "warn",
    critical: false,
  });

  items.push({
    id: "description",
    label: "Public description provided",
    status: module.description.trim().length > 0 ? "pass" : "warn",
    critical: false,
  });

  return items;
}

/** True when any critical check fails — Save must be blocked. */
export function hasBlockingIssues(items: ValidationItem[]): boolean {
  return items.some((i) => i.critical && i.status === "fail");
}
