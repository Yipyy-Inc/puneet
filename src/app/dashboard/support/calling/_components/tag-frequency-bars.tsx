import { cn } from "@/lib/utils";
import type { TagFrequency } from "@/lib/support-call-analytics";

// CSS horizontal bar chart for call-tag frequency (mirrors the facility
// TagFrequencyChart — no recharts).

export function TagFrequencyBars({ tags }: { tags: TagFrequency[] }) {
  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
        No call tags applied in this period.
      </p>
    );
  }

  const max = Math.max(...tags.map((t) => t.count), 1);

  return (
    <div className="space-y-3">
      {tags.map((t) => (
        <div key={t.id}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium">{t.name}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {t.count}
            </span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className={cn("h-2 rounded-full transition-all", t.solid)}
              style={{ width: `${(t.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
