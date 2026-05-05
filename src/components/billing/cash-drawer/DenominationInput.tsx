"use client";

import { Input } from "@/components/ui/input";
import type { Denomination } from "@/data/cash-drawer";

interface Props {
  denominations: Denomination[];
  counts: Record<string, number>;
  onChange: (id: string, count: number) => void;
  currencySymbol: string;
}

/**
 * Single ordered list (smallest face value → largest). Deliberately not split
 * into Coins / Bills sub-sections to differentiate from the MoeGo layout.
 */
export function DenominationInput({
  denominations,
  counts,
  onChange,
  currencySymbol,
}: Props) {
  const sorted = [...denominations].sort((a, b) => a.value - b.value);

  return (
    <div className="rounded-md border bg-background">
      <div className="grid grid-cols-[1fr_5rem_5.5rem] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Denomination</span>
        <span className="text-center">Count</span>
        <span className="text-right">Subtotal</span>
      </div>
      <ul className="divide-y">
        {sorted.map((d) => {
          const count = counts[d.id] ?? 0;
          const subtotal = d.value * count;
          return (
            <li
              key={d.id}
              className="grid grid-cols-[1fr_5rem_5.5rem] items-center gap-2 px-3 py-1.5 text-sm"
              data-type={d.type}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold uppercase data-[t=coin]:bg-amber-50 data-[t=coin]:text-amber-700 data-[t=bill]:bg-emerald-50 data-[t=bill]:text-emerald-700"
                  data-t={d.type}
                >
                  {d.type === "coin" ? "C" : "B"}
                </span>
                <span className="font-medium">{d.label}</span>
              </div>
              <Input
                type="number"
                min={0}
                value={count === 0 ? "" : count}
                placeholder="0"
                className="h-8 text-center tabular-nums"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange(d.id, isNaN(val) || val < 0 ? 0 : val);
                }}
              />
              <span
                className={`text-right tabular-nums ${count > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
