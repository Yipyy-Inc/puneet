import { matchedFlagKeyword } from "@/lib/calling/flag-call";
import { defaultCallingSettings } from "@/data/calling";
import type { SupportRecording } from "@/types/support-call";

/** Colour for a QA score badge (0–5). */
export function qaScoreClass(score: number): string {
  if (score >= 4)
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  if (score >= 3)
    return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300";
  return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300";
}

/** Human reason a recording is in "Needs Review". */
export function flagReasonText(rec: SupportRecording): string {
  if (rec.flagReason === "low_sentiment") {
    return `Low AI sentiment (${rec.sentimentScore.toFixed(1)}/10)`;
  }
  const keyword = matchedFlagKeyword(rec.transcript) ?? "complaint";
  return `Mentions “${keyword}”`;
}

const RETENTION_LABEL: Record<string, string> = {
  "30_days": "30-day retention",
  "90_days": "90-day retention",
  unlimited: "unlimited retention",
};

/** "AES-256 encrypted · 90-day retention" derived from calling settings. */
export const STORAGE_NOTE = `AES-256 encrypted · ${
  RETENTION_LABEL[defaultCallingSettings.recordingStorage] ?? "retained"
}`;

export const RECORDING_ENABLED = defaultCallingSettings.autoRecord;
export const COMPLIANCE_NOTICE = defaultCallingSettings.complianceNotice;

export const QA_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "QA Scored" },
  { value: "scored", label: "Scored" },
  { value: "unscored", label: "Not scored" },
];
