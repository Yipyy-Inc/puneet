import { facilityConfig } from "@/data/facility-config";

// Feeding & medication option lists shown when staff log care tasks. Editable
// per category in Settings → Care Tasks; wrapped by the care-tasks query layer.

export interface ScheduleItem {
  id?: string;
  label: string;
  time: string;
}

export interface FeedingOptions {
  schedules: ScheduleItem[];
  units: string[];
  foodTypes: string[];
  sources: string[];
  destinations: string[];
  frequencies: string[];
  allowedProteins: string[];
  instructions: string[];
  allergyPresets: string[];
}

export interface MedicationOptions {
  methods: string[];
  frequencies: string[];
  quickTimes: ScheduleItem[];
}

export interface CareTasksConfig {
  feeding: FeedingOptions;
  medication: MedicationOptions;
}

export function getCareTasksConfig(): CareTasksConfig {
  const cfg = facilityConfig as {
    feedingOptions: FeedingOptions;
    medicationOptions: MedicationOptions;
  };
  return { feeding: cfg.feedingOptions, medication: cfg.medicationOptions };
}

export function saveCareTasksConfig(config: CareTasksConfig): CareTasksConfig {
  const cfg = facilityConfig as unknown as {
    feedingOptions: FeedingOptions;
    medicationOptions: MedicationOptions;
  };
  cfg.feedingOptions = config.feeding;
  cfg.medicationOptions = config.medication;
  return config;
}
