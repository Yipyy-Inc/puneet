import { serviceNeedsEvaluation } from "@/lib/bookings/wizard/service-eligibility";
import type { FacilityBookingFlowConfig, ModuleConfig } from "@/types/facility";

// ============================================================================
// "Services that need an evaluation first" — one rule (the client's setup
// page, 2026-10-02).
//
// Until then three settings could each demand an evaluation, and the wizard
// obeyed whichever said yes: `booking_flow.servicesRequiringEvaluation`,
// `booking_flow.evaluationRequired` (read as "every service"), and each
// module's own "Enable Evaluation" switch (enabled and not optional). A
// facility could switch the requirement off in one place and stay locked by
// another, with nothing on screen to say which.
//
// The setup page's chips start from what is enforced TODAY — so opening it
// and saving changes nothing — and saving makes the other two agree with the
// chips, so the chips are the whole rule from then on.
// ============================================================================

/** The modules that carry their own "Enable Evaluation" switch. */
export const EVALUATED_MODULES = [
  "daycare",
  "boarding",
  "grooming",
  "training",
] as const;
export type EvaluatedModule = (typeof EVALUATED_MODULES)[number];

export function isEvaluatedModule(service: string): service is EvaluatedModule {
  return (EVALUATED_MODULES as readonly string[]).includes(service);
}

/** The services an evaluation is required for now, from every place that can say so. */
export function requiredServicesNow(input: {
  services: readonly string[];
  flow: FacilityBookingFlowConfig;
  moduleOf: (service: string) => ModuleConfig | undefined;
}): string[] {
  return input.services.filter((service) =>
    serviceNeedsEvaluation(service, input.moduleOf(service), input.flow),
  );
}

/**
 * What saving the chips writes: the booking flow's list IS the chips, the
 * every-service switch is off, and a module still demanding an evaluation its
 * chip no longer asks for stops demanding it. Modules that already agree are
 * not written.
 */
export function requirementWrites(input: {
  chips: readonly string[];
  flow: FacilityBookingFlowConfig;
  modules: Partial<Record<EvaluatedModule, ModuleConfig>>;
}): {
  flow: FacilityBookingFlowConfig;
  modules: Array<{ service: EvaluatedModule; config: ModuleConfig }>;
} {
  const chips = [...new Set(input.chips)];
  const flow: FacilityBookingFlowConfig = {
    ...input.flow,
    evaluationRequired: false,
    servicesRequiringEvaluation: chips,
  };
  const modules: Array<{ service: EvaluatedModule; config: ModuleConfig }> = [];
  for (const service of EVALUATED_MODULES) {
    const config = input.modules[service];
    if (!config) continue;
    const own = config.settings.evaluation;
    const demands = own.enabled && !own.optional;
    if (demands && !chips.includes(service)) {
      modules.push({
        service,
        config: {
          ...config,
          settings: {
            ...config.settings,
            evaluation: { ...own, enabled: false },
          },
        },
      });
    }
  }
  return { flow, modules };
}

/** Whether the chips differ from what is enforced now (the page is dirty). */
export function sameServices(
  a: readonly string[],
  b: readonly string[],
): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((s) => right.has(s));
}
