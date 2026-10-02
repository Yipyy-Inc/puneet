"use client";

import { useCustomServices } from "@/hooks/use-custom-services";
import { useServiceName } from "@/lib/staff/use-service-name";

// ============================================================================
// A service an evaluation unlocks, by name: the built-in ones in the viewer's
// language, a facility's own custom service by the name it was given — which
// no locale layer touches (§5q). Custom services are stored by their slug.
// ============================================================================

export function useEvaluationServiceName() {
  const serviceName = useServiceName();
  const { activeModules } = useCustomServices();
  return (service: string): string =>
    activeModules.find((module) => module.slug === service)?.name ??
    serviceName(service);
}
