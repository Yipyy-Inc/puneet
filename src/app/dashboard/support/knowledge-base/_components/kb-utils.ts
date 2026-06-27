import type { KbArticle, KbArticleStatus } from "@/types/knowledge-base";

export const STATUS_BADGE: Record<KbArticleStatus, string> = {
  Draft:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Published:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Archived: "border-muted bg-muted text-muted-foreground",
};

export const STATUS_TABS: (KbArticleStatus | "all")[] = [
  "all",
  "Published",
  "Draft",
  "Archived",
];

/** Helpfulness score as a 0–100 % (null when there are no votes yet). */
export function helpfulnessScore(a: KbArticle): number | null {
  const total = a.helpfulYes + a.helpfulNo;
  if (total === 0) return null;
  return Math.round((a.helpfulYes / total) * 100);
}

export function helpfulnessTone(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** Strip HTML to a short plain-text preview for table rows. */
export function bodyPreview(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
