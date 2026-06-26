import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TaxRow } from "@/lib/api/financial-report";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function TaxSummaryTable({
  rows,
  total,
}: {
  rows: TaxRow[];
  total: number;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Tax Summary</CardTitle>
          <CardDescription>Taxes collected by jurisdiction</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Total collected</p>
          <p className="text-lg font-bold">{money(total)}</p>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="px-2 py-2 text-left font-medium">Jurisdiction</th>
              <th className="px-2 py-2 text-left font-medium">Tax</th>
              <th className="px-2 py-2 text-right font-medium">Rate</th>
              <th className="px-2 py-2 text-right font-medium">Facilities</th>
              <th className="px-2 py-2 text-right font-medium">Taxable Base</th>
              <th className="px-2 py-2 text-right font-medium">Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.jurisdiction}>
                <td className="px-2 py-2 font-medium whitespace-nowrap">
                  {r.jurisdiction}
                </td>
                <td className="text-muted-foreground px-2 py-2 whitespace-nowrap">
                  {r.taxName}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {r.ratePercent}%
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {r.facilities}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {money(r.taxableBase)}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
                  {money(r.taxCollected)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="px-2 py-2" colSpan={5}>
                Total
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {money(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
