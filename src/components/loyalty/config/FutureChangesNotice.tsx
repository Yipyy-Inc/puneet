import { Info } from "lucide-react";

/**
 * Warning shown on the earn-rule edit forms: edits never retroactively change
 * historical point totals — they only affect transactions going forward.
 */
export function FutureChangesNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="font-medium">
          Changes apply to future transactions only.
        </span>{" "}
        Editing a rule archives the old version and starts a new one — historical
        point totals are never recalculated.
      </span>
    </div>
  );
}
