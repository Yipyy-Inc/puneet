import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CohortRow } from "@/lib/api/churn";

function cellClass(v: number): string {
  if (v >= 80)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (v >= 65) return "bg-lime-500/15 text-lime-700 dark:text-lime-300";
  if (v >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
}

export function CohortRetentionTable({
  columns,
  cohorts,
}: {
  columns: number[];
  cohorts: CohortRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cohort Retention</CardTitle>
        <CardDescription>
          % of each joining cohort still active N months after joining
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs">
              <th className="px-2 py-1 text-left font-medium">Cohort</th>
              <th className="px-2 py-1 text-right font-medium">Size</th>
              {columns.map((m) => (
                <th key={m} className="px-2 py-1 text-center font-medium">
                  Month {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((row) => (
              <tr key={row.cohort}>
                <td className="px-2 py-1 font-medium whitespace-nowrap">
                  {row.cohort}
                </td>
                <td className="text-muted-foreground px-2 py-1 text-right tabular-nums">
                  {row.size}
                </td>
                {row.cells.map((v, i) => (
                  <td key={columns[i]} className="px-1 py-1 text-center">
                    {v === null ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : (
                      <span
                        className={cn(
                          "inline-block w-full rounded-md px-2 py-1 font-medium tabular-nums",
                          cellClass(v),
                        )}
                      >
                        {v}%
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
          <LegendDot className="bg-emerald-500/60" label="≥ 80%" />
          <LegendDot className="bg-lime-500/60" label="65–79%" />
          <LegendDot className="bg-amber-500/60" label="50–64%" />
          <LegendDot className="bg-rose-500/60" label="< 50%" />
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded", className)} />
      {label}
    </span>
  );
}
