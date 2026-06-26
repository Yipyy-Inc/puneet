import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CreditRow } from "@/lib/api/financial-report";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function CreditsLedger({
  rows,
  total,
}: {
  rows: CreditRow[];
  total: number;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Credits &amp; Discounts Ledger</CardTitle>
          <CardDescription>
            {rows.length} entries applied (last 12 months)
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Total cost to Yipyy</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {money(total)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-card sticky top-0">
              <tr className="text-muted-foreground border-b text-xs">
                <th className="px-2 py-2 text-left font-medium">Facility</th>
                <th className="px-2 py-2 text-left font-medium">Type</th>
                <th className="px-2 py-2 text-left font-medium">Reason</th>
                <th className="px-2 py-2 text-left font-medium">Date</th>
                <th className="px-2 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">
                    {r.facility}
                  </td>
                  <td className="px-2 py-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        r.type === "Credit"
                          ? "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
                      )}
                    >
                      {r.type}
                    </Badge>
                  </td>
                  <td className="px-2 py-2">{r.label}</td>
                  <td className="text-muted-foreground px-2 py-2 whitespace-nowrap">
                    {r.date}
                  </td>
                  <td className="px-2 py-2 text-right text-rose-600 tabular-nums dark:text-rose-400">
                    −{money(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
