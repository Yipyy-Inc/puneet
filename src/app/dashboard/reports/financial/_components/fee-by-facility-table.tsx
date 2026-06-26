import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FeeMatrix } from "@/lib/api/financial-report";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function FeeByFacilityTable({ matrix }: { matrix: FeeMatrix }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Transaction Fee Revenue</CardTitle>
          <CardDescription>
            Platform fee collected per facility per month (last 12 months)
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">12-month total</p>
          <p className="text-lg font-bold">{money(matrix.grandTotal)}</p>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="bg-card sticky left-0 px-2 py-2 text-left font-medium">
                Facility
              </th>
              <th className="px-2 py-2 text-right font-medium">Fee %</th>
              {matrix.months.map((m) => (
                <th key={m} className="px-2 py-2 text-right font-medium">
                  {m}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {matrix.rows.map((r) => (
              <tr key={r.facility}>
                <td className="bg-card sticky left-0 px-2 py-2">
                  <span className="font-medium">{r.facility}</span>
                  <span className="text-muted-foreground block text-xs">
                    {r.tier}
                  </span>
                </td>
                <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
                  {r.feePercent}%
                </td>
                {r.monthly.map((v, i) => (
                  <td
                    key={matrix.months[i]}
                    className="px-2 py-2 text-right tabular-nums"
                  >
                    {money(v)}
                  </td>
                ))}
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
                  {money(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="bg-card sticky left-0 px-2 py-2">
                All facilities
              </td>
              <td className="px-2 py-2" />
              {matrix.monthlyTotals.map((v, i) => (
                <td
                  key={matrix.months[i]}
                  className="px-2 py-2 text-right tabular-nums"
                >
                  {money(v)}
                </td>
              ))}
              <td className="px-2 py-2 text-right tabular-nums">
                {money(matrix.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
