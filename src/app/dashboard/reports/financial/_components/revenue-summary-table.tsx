import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RevenueMonth } from "@/lib/api/financial-report";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function RevenueSummaryTable({
  rows,
  totals,
}: {
  rows: RevenueMonth[];
  totals: RevenueMonth;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Summary</CardTitle>
        <CardDescription>
          Month-by-month platform revenue by source
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="px-2 py-2 text-left font-medium">Month</th>
              <th className="px-2 py-2 text-right font-medium">Subscription</th>
              <th className="px-2 py-2 text-right font-medium">
                Transaction Fees
              </th>
              <th className="px-2 py-2 text-right font-medium">One-Off</th>
              <th className="px-2 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.month}>
                <td className="px-2 py-2 font-medium whitespace-nowrap">
                  {r.month}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {money(r.subscription)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {money(r.transactionFees)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {money(r.oneOff)}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
                  {money(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="px-2 py-2">{totals.month}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {money(totals.subscription)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {money(totals.transactionFees)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {money(totals.oneOff)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {money(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
