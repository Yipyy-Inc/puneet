import { facilities } from "@/data/facilities";

// Express check-in requirements config. Sections have a facility-wide default
// (`sections` / custom `type`), which `serviceOverrides` can override per
// service — e.g. Feeding required for Boarding but disabled for Daycare.

export type CheckinRequirement = "required" | "optional" | "disabled";

export interface CheckinCustomSection {
  id: string;
  name: string;
  type: CheckinRequirement;
}

export interface ExpressCheckinConfig {
  /** Facility-wide default requirement per built-in section. */
  sections: Record<string, CheckinRequirement>;
  customSections: CheckinCustomSection[];
  sendBefore: number;
  reminderHours: number;
  /** service key → (section key → requirement) overrides of the defaults. */
  serviceOverrides: Record<string, Record<string, CheckinRequirement>>;
}

const DEFAULT_FACILITY_ID = 11;

const FALLBACK: ExpressCheckinConfig = {
  sections: {
    feeding: "required",
    medication: "required",
    belongings: "optional",
    additionalContacts: "required",
    vaccination: "required",
    waiver: "required",
  },
  customSections: [],
  sendBefore: 48,
  reminderHours: 24,
  serviceOverrides: {},
};

export function getCheckinConfig(): ExpressCheckinConfig {
  const facility = facilities.find((f) => f.id === DEFAULT_FACILITY_ID) as
    | Record<string, unknown>
    | undefined;
  const cfg = facility?.expressCheckinConfig as
    | Partial<ExpressCheckinConfig>
    | undefined;
  if (!cfg) return FALLBACK;
  return {
    ...FALLBACK,
    ...cfg,
    sections: { ...FALLBACK.sections, ...cfg.sections },
    serviceOverrides: cfg.serviceOverrides ?? {},
  };
}

export function saveCheckinConfig(
  config: ExpressCheckinConfig,
): ExpressCheckinConfig {
  const facility = facilities.find((f) => f.id === DEFAULT_FACILITY_ID) as
    | Record<string, unknown>
    | undefined;
  if (facility) {
    facility.expressCheckinConfig = config;
  }
  return config;
}

/**
 * The effective requirement for a section under a specific service: a
 * per-service override wins over the facility-wide default (built-in section or
 * custom section `type`).
 */
export function resolveSectionRequirement(
  config: ExpressCheckinConfig,
  service: string,
  sectionKey: string,
): CheckinRequirement {
  const override = config.serviceOverrides[service]?.[sectionKey];
  if (override) return override;
  if (config.sections[sectionKey]) return config.sections[sectionKey];
  const custom = config.customSections.find((c) => c.id === sectionKey);
  return custom?.type ?? "optional";
}

/** Whether a section should appear at all for a service (disabled = hidden). */
export function isSectionEnabledForService(
  config: ExpressCheckinConfig,
  service: string,
  sectionKey: string,
): boolean {
  return resolveSectionRequirement(config, service, sectionKey) !== "disabled";
}
