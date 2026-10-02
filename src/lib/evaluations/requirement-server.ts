import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EVALUATED_MODULES,
  isEvaluatedModule,
  requiredServicesNow,
} from "@/lib/evaluations/requirement";
import { settingsFromRows } from "@/lib/settings/from-rows";
import type { FacilityBookingFlowConfig, ModuleConfig } from "@/types/facility";

// ============================================================================
// "Services that need an evaluation first", as the facility enforces it now —
// the same rule the setup page's chips start from (requirement.ts), read on
// the server: what an evaluation unlocks when its booking does not say.
// ============================================================================

const DOMAINS = [
  "booking_flow",
  ...EVALUATED_MODULES.map((service) => `${service}_config`),
];

export async function evaluationServicesRequired(
  client: SupabaseClient,
  facilityId: string,
): Promise<string[]> {
  const { data } = await client
    .from("facility_settings")
    .select("domain, value")
    .eq("facility_id", facilityId)
    .in("domain", DOMAINS);
  const settings = settingsFromRows(
    (data ?? []) as Array<{ domain: string; value: unknown }>,
  );
  // Parsed against each domain's schema by settingsFromRows; typed here.
  const flow = settings.booking_flow.value as FacilityBookingFlowConfig;
  const modules: Record<string, ModuleConfig> = {
    daycare: settings.daycare_config.value as ModuleConfig,
    boarding: settings.boarding_config.value as ModuleConfig,
    grooming: settings.grooming_config.value as ModuleConfig,
    training: settings.training_config.value as ModuleConfig,
  };
  const services = [
    ...EVALUATED_MODULES.filter(
      (service) => modules[service]?.status?.disabled !== true,
    ),
    // A custom service on the list is offered under its own id.
    ...flow.servicesRequiringEvaluation.filter(
      (service) => !isEvaluatedModule(service),
    ),
  ];
  return requiredServicesNow({
    services,
    flow,
    moduleOf: (service) =>
      isEvaluatedModule(service) ? modules[service] : undefined,
  });
}
