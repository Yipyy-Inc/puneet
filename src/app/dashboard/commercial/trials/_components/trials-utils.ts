import type { Trial } from "@/types/trials";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Days-remaining colour band: green > 7, amber 3–7, red < 3. */
export function daysBandClass(days: number): string {
  if (days >= 8)
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  if (days >= 3)
    return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300";
  return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300";
}

/** Resolve {{merge_tags}} in a template string from a trial. */
export function resolveTrialMergeTags(template: string, trial: Trial): string {
  const map: Record<string, string> = {
    facility_name: trial.facilityName,
    primary_admin_name: trial.adminName,
    plan_name: trial.plan,
    days_remaining: String(Math.max(0, trial.daysRemaining)),
    trial_end_date: formatDate(trial.trialEnd),
  };
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => map[key] ?? `{{${key}}}`,
  );
}
