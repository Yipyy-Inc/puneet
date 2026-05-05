import type { CareTaskType } from "@/types/care-log";

type OutcomeOption = {
  value: string;
  label: string;
  /** Tailwind classes for the badge variant */
  tone: "success" | "warning" | "danger" | "neutral";
};

export const OUTCOME_OPTIONS: Record<CareTaskType, OutcomeOption[]> = {
  potty: [
    { value: "pee", label: "Peed", tone: "success" },
    { value: "poop", label: "Pooped", tone: "success" },
    { value: "both", label: "Both", tone: "success" },
    { value: "nothing", label: "Nothing", tone: "neutral" },
    { value: "soft_stool", label: "Soft stool", tone: "warning" },
    { value: "diarrhea", label: "Diarrhea", tone: "danger" },
    { value: "vomit_noticed", label: "Vomit noticed", tone: "danger" },
  ],
  feeding: [
    { value: "ate_all", label: "Ate all", tone: "success" },
    { value: "ate_half", label: "Ate some", tone: "warning" },
    { value: "refused", label: "Refused", tone: "danger" },
    { value: "vomited_after", label: "Vomited after", tone: "danger" },
    { value: "slow_eater", label: "Slow eater", tone: "neutral" },
  ],
  medication: [
    { value: "administered", label: "Administered", tone: "success" },
    { value: "delayed", label: "Delayed", tone: "warning" },
    { value: "refused", label: "Refused", tone: "danger" },
    { value: "spit_out", label: "Spit out", tone: "danger" },
    { value: "missed", label: "Missed", tone: "danger" },
  ],
  addon: [
    { value: "completed", label: "Completed", tone: "success" },
    { value: "partial", label: "Partial", tone: "warning" },
    { value: "skipped", label: "Skipped", tone: "neutral" },
    { value: "dog_refused", label: "Dog refused", tone: "warning" },
    { value: "rescheduled", label: "Rescheduled", tone: "neutral" },
  ],
  care: [
    { value: "completed", label: "Completed", tone: "success" },
    { value: "skipped", label: "Skipped", tone: "neutral" },
    { value: "issue_reported", label: "Issue reported", tone: "danger" },
  ],
};

export function outcomeBadgeClass(tone: OutcomeOption["tone"]): string {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "danger":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    case "neutral":
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getOutcomeOption(taskType: CareTaskType, value: string) {
  return OUTCOME_OPTIONS[taskType].find((o) => o.value === value);
}
