"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_CATEGORIES } from "@/components/bookings/modals/constants";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useSettings } from "@/hooks/use-settings";
import {
  useFacilitySettings,
  useVaccinationRules,
} from "@/lib/api/facility-settings";
import {
  isEvaluatedModule,
  requiredServicesNow,
  type EvaluatedModule,
} from "@/lib/evaluations/requirement";
import { getAllServiceCategories } from "@/lib/service-registry";
import { settingsPortalFor } from "@/lib/settings/nav";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import type { ModuleConfig } from "@/types/facility";

import { EvaluationSetupPage } from "../_components/evaluations/evaluation-setup-page";
import type { ServiceChip } from "../_components/evaluations/who-what-step";

// ============================================================================
// Settings › Services › Evaluations (2026-10-02): how clients book an
// evaluation — the client's setup page. The evaluation FORM and its REPORT
// CARD are set up beside the evaluations themselves, under Operations ›
// Evaluations › Setup, as the mock says at the foot of the page.
//
// Nothing renders until the settings have arrived: the page seeds its draft
// once, and a first Save against the fallback would write the defaults over
// the facility's own (check:settings-seeding — isPending).
// ============================================================================

const BUILTIN_LABEL: Record<EvaluatedModule, string> = {
  daycare: "svcDaycare",
  boarding: "svcBoarding",
  grooming: "svcGrooming",
  training: "svcTraining",
};

/** The mock's order: daycare first. */
const BUILTIN_ORDER: EvaluatedModule[] = [
  "daycare",
  "boarding",
  "grooming",
  "training",
];

export function EvaluationsSection() {
  const text = useSettingsText();
  const t = text.section("evaluations");
  const pathname = usePathname() ?? "";
  const { settings, isPending } = useFacilitySettings();
  const vaccination = useVaccinationRules();
  const { activeModules } = useCustomServices();
  const { hours, scheduleTimeOverrides, serviceDateBlocks, holidays } =
    useSettings();

  if (isPending || vaccination.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-2/3 rounded-full" />
        <div className="flex flex-wrap gap-[18px]">
          <Skeleton className="h-[520px] min-w-0 flex-[1_1_520px] rounded-3xl" />
          <Skeleton className="h-80 min-w-0 flex-[1_1_300px] rounded-3xl" />
        </div>
      </div>
    );
  }

  const modules: Partial<Record<EvaluatedModule, ModuleConfig>> = {
    daycare: settings.daycare_config.value,
    boarding: settings.boarding_config.value,
    grooming: settings.grooming_config.value,
    training: settings.training_config.value,
  };
  const moduleOf = (service: string) =>
    isEvaluatedModule(service) ? modules[service] : undefined;

  // The facility's own services: the four built in while their module is on,
  // then its custom services that take bookings.
  const services: ServiceChip[] = [
    ...BUILTIN_ORDER.filter(
      (service) => modules[service]?.status?.disabled !== true,
    ).map((service) => ({ id: service, label: t(BUILTIN_LABEL[service]) })),
    ...getAllServiceCategories(SERVICE_CATEGORIES, activeModules)
      .filter((category) => category.isCustom)
      .map((category) => ({ id: category.id, label: category.name })),
  ];

  const flow = settings.booking_flow.value;
  const requiredNow = requiredServicesNow({
    services: services.map((service) => service.id),
    flow,
    moduleOf,
  });

  const setupHref =
    settingsPortalFor(pathname) === "employee"
      ? "/employee/evaluations?tab=setup"
      : "/facility/dashboard/evaluations?tab=setup";

  return (
    <EvaluationSetupPage
      sources={{
        config: settings.evaluation_config.value,
        flow,
        approval: settings.booking_approval.value,
        deposits: settings.deposit_rules.value,
        modules,
        requiredNow,
      }}
      services={services}
      vaccineRules={vaccination.rules}
      calendar={{
        hours,
        overrides: scheduleTimeOverrides,
        blocks: serviceDateBlocks,
        holidays,
      }}
      setupHref={setupHref}
      t={t}
      locale={text.locale}
    />
  );
}
