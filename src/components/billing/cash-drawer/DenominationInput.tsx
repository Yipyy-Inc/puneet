"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Denomination } from "@/data/cash-drawer";

interface Props {
  denominations: Denomination[];
  counts: Record<string, number>;
  onChange: (id: string, count: number) => void;
  currencySymbol: string;
}

export function DenominationInput({ denominations, counts, onChange, currencySymbol }: Props) {
  const coins = denominations.filter((d) => d.type === "coin");
  const bills = denominations.filter((d) => d.type === "bill");

  const sectionTotal = (items: Denomination[]) =>
    items.reduce((sum, d) => sum + d.value * (counts[d.id] ?? 0), 0);

  const renderGroup = (items: Denomination[], title: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
        <Badge variant="secondary" className="tabular-nums text-xs">
          {currencySymbol}{sectionTotal(items).toFixed(2)}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {items.map((d) => {
          const count = counts[d.id] ?? 0;
          const subtotal = d.value * count;
          return (
            <div key={d.id} className="flex items-center gap-2">
              <div className="w-20 shrink-0">
                <p className="text-sm font-medium">{d.label}</p>
                {count > 0 && (
                  <p className="text-muted-foreground text-xs tabular-nums">
                    = {currencySymbol}{subtotal.toFixed(2)}
                  </p>
                )}
              </div>
              <Input
                type="number"
                min={0}
                value={count === 0 ? "" : count}
                placeholder="0"
                className="h-8 w-20 text-center tabular-nums"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange(d.id, isNaN(val) || val < 0 ? 0 : val);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {renderGroup(coins, "Coins")}
      {renderGroup(bills, "Bills")}
    </div>
  );
}
