"use client";

import { PottyLogModal } from "../PottyLogModal";
import { FeedingLogModal } from "../FeedingLogModal";
import { MedicationLogModal } from "../MedicationLogModal";
// The kennel-cleaning modal (the mapping's "CleaningLogModal").
import { KennelCleanLogModal } from "../KennelCleanLogModal";
import { WaterRefillLogModal } from "../WaterRefillLogModal";
import { AddOnLogModal } from "../AddOnLogModal";
import { EnrichmentLogModal } from "../EnrichmentLogModal";
import { CustomLogModal } from "../CustomLogModal";
import { TaskLogModal } from "../TaskLogModal";
import type {
  ScheduledTask,
  TaskExecution,
  HealthObservation,
  CleaningDetail,
  AddonLogDetail,
  EnrichmentDetail,
} from "@/types/care-log";

/**
 * The superset log entry — matches the daily-care hosts' submit handler, so the
 * router can forward it to any dedicated modal (each accepts a subset of these
 * fields). Kept backward-compatible with the original TaskLogModal onSubmit.
 */
export type LogSubmitEntry = {
  outcome: string;
  notes?: string;
  staffName?: string;
  staffInitials: string;
  executedAt?: string;
  servedAt?: string;
  photoUrls?: string[];
  healthObservation?: HealthObservation;
  cleaning?: CleaningDetail;
  waterVolume?: string;
  missedReason?: string;
  notifyOwner?: boolean;
  addon?: AddonLogDetail;
  enrichment?: EnrichmentDetail;
};

/** The medication step-through logs one task at a time. */
export type MedLogSubmitEntry = {
  outcome: string;
  notes?: string;
  staffName?: string;
  staffInitials: string;
  executedAt?: string;
  photoUrls?: string[];
};

// Care subtypes with their own modal (water/kennel) or the generic fallback
// (bedding). Every other "care" task is a custom / enrichment step.
const NON_CUSTOM_CARE_SUBTYPES = new Set([
  "water_refill",
  "kennel_clean",
  "bedding_change",
]);

type Props = {
  open: boolean;
  task: ScheduledTask | null;
  existing?: TaskExecution;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: LogSubmitEntry) => void;
  /** Medication step-through queue (same pet + time). Defaults to [task]. */
  medicationQueue?: ScheduledTask[];
  /** Logs one specific medication for step-through; falls back to onSubmit. */
  onLogMedication?: (task: ScheduledTask, entry: MedLogSubmitEntry) => void;
  /** Reload medication data from the booking (rule c). */
  onReloadMedication?: () => void;
};

/**
 * Renders the correct dedicated log modal for a task's type (and subtype),
 * falling back to the generic TaskLogModal for anything unmapped. This is a
 * drop-in for the original <TaskLogModal> — the extra medication props are
 * optional and only needed to preserve the med step-through.
 */
export function LogModalRouter({
  open,
  task,
  existing,
  onOpenChange,
  onSubmit,
  medicationQueue,
  onLogMedication,
  onReloadMedication,
}: Props) {
  const shared = { open, task, existing, onOpenChange, onSubmit };
  const type = task?.taskType;
  const subType = task?.subType;

  if (type === "potty") return <PottyLogModal {...shared} />;
  if (type === "feeding") return <FeedingLogModal {...shared} />;
  if (type === "addon") return <AddOnLogModal {...shared} />;

  if (type === "medication") {
    return (
      <MedicationLogModal
        open={open}
        tasks={medicationQueue ?? (task ? [task] : [])}
        existing={existing}
        onOpenChange={onOpenChange}
        onLogOne={
          onLogMedication ??
          ((_t: ScheduledTask, entry: MedLogSubmitEntry) => onSubmit(entry))
        }
        onReload={onReloadMedication ?? (() => onOpenChange(false))}
      />
    );
  }

  if (type === "care" && subType === "water_refill") {
    return <WaterRefillLogModal {...shared} />;
  }
  if (type === "care" && subType === "kennel_clean") {
    return <KennelCleanLogModal {...shared} />;
  }

  // Custom care steps (subType = step id): a declared Log Type (A7.5) routes to
  // the Custom modal; otherwise the Enrichment modal handles it.
  if (
    type === "care" &&
    subType != null &&
    !NON_CUSTOM_CARE_SUBTYPES.has(subType)
  ) {
    if (task?.customLogType) {
      return <CustomLogModal {...shared} logType={task.customLogType} />;
    }
    return <EnrichmentLogModal {...shared} />;
  }

  // Fallback: bedding_change and anything unmapped.
  return <TaskLogModal {...shared} />;
}
