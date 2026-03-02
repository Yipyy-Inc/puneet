/**
 * Booking wizard step configuration by service type.
 * Used by both facility and customer flows to keep portals consistent.
 *
 * Flow definitions:
 * - Daycare:   schedule → add-ons → (optional feeding/meds) → forms → tip → confirm
 * - Boarding:  schedule → room type → add-ons → feeding/meds → forms → tip → confirm
 * - Grooming:  package → date/time → add-ons → forms → tip → confirm
 * - Evaluation: date/time → forms → tip → confirm
 */

export type ServiceType = "daycare" | "boarding" | "grooming" | "evaluation" | "training";

/** Detail sub-step IDs (within the "details" step) */
export type DetailsSubStepId =
  | "schedule"
  | "roomType"
  | "addons"
  | "feedingMeds"
  | "package"
  | "dateTime";

/** Top-level step IDs */
export type MainStepId =
  | "pets"
  | "service"
  | "details"
  | "forms"
  | "tip"
  | "confirm";

export interface DetailStepDef {
  id: DetailsSubStepId;
  label: string;
  /** Optional short description for UI */
  description?: string;
}

/** Ordered detail sub-steps for each service type */
export const DETAIL_STEPS_BY_SERVICE: Record<
  ServiceType,
  DetailStepDef[]
> = {
  daycare: [
    { id: "schedule", label: "Schedule", description: "Select dates and times" },
    { id: "addons", label: "Add-ons", description: "Optional services" },
    // feeding/meds optional for daycare; can be included if facility supports
    // { id: "feedingMeds", label: "Feeding & Medication" },
  ],
  boarding: [
    { id: "schedule", label: "Schedule", description: "Check-in & check-out" },
    { id: "roomType", label: "Room Type", description: "Choose room" },
    { id: "addons", label: "Add-ons", description: "Optional services" },
    {
      id: "feedingMeds",
      label: "Feeding & Medication",
      description: "Care instructions",
    },
  ],
  grooming: [
    { id: "package", label: "Package", description: "Choose grooming package" },
    { id: "dateTime", label: "Date & Time", description: "Select appointment" },
    { id: "addons", label: "Add-ons", description: "Nail trim, etc." },
  ],
  evaluation: [
    { id: "dateTime", label: "Date & Time", description: "Select slot" },
  ],
  training: [
    { id: "dateTime", label: "Date & Time", description: "Select session" },
  ],
};

/** Main (top-level) steps for customer flow: pets → service → details → forms → tip → confirm */
export const CUSTOMER_MAIN_STEPS: MainStepId[] = [
  "pets",
  "service",
  "details",
  "forms",
  "tip",
  "confirm",
];

/** Main steps for facility flow (no pets step; client+pet selection is combined): service → client-pet → details → confirm */
export const FACILITY_MAIN_STEPS: MainStepId[] = [
  "service",
  "pets", // facility uses "client-pet"
  "details",
  "confirm",
];

/**
 * Get ordered detail sub-step indices for a service.
 * Returns array of step definitions; index in array = subStepIndex.
 */
export function getDetailStepsForService(
  service: ServiceType
): DetailStepDef[] {
  return DETAIL_STEPS_BY_SERVICE[service] ?? [];
}

/**
 * Get detail sub-step count for a service (for "Step X of Y").
 */
export function getDetailStepCount(service: ServiceType): number {
  return getDetailStepsForService(service).length;
}

/**
 * Resolve which detail sub-step ID is at a given index for a service.
 */
export function getDetailStepIdAt(
  service: ServiceType,
  index: number
): DetailsSubStepId | null {
  const steps = getDetailStepsForService(service);
  return steps[index]?.id ?? null;
}
