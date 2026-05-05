"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sun } from "lucide-react";
import { DenominationInput } from "./DenominationInput";
import type {
  Currency,
  Denomination,
  DenominationCount,
  OpeningCount,
} from "@/data/cash-drawer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  denominations: Denomination[];
  currency: Currency;
  staffName: string;
  /** Last counted closing balance — shown as a hint, not pre-filled. */
  priorClosingTotal?: number;
  onSubmit: (opening: OpeningCount) => void;
}

export function OpenDayDialog({
  open,
  onOpenChange,
  denominations,
  currency,
  staffName,
  priorClosingTotal,
  onSubmit,
}: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const symbol = currency === "CAD" ? "CA$" : "$";

  const floatTotal = useMemo(
    () =>
      denominations.reduce((s, d) => s + d.value * (counts[d.id] ?? 0), 0),
    [denominations, counts],
  );

  const reset = () => {
    setCounts({});
    setNote("");
  };

  const handleSubmit = () => {
    if (floatTotal <= 0) return;
    const denominationCounts: DenominationCount[] = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([denominationId, count]) => ({ denominationId, count }));
    onSubmit({
      countedAt: new Date().toISOString(),
      countedBy: staffName,
      denominationCounts,
      floatTotal,
      note: note.trim(),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sun className="size-5 text-amber-500" />
            Open Today&apos;s Register
          </DialogTitle>
          <DialogDescription>
            Count every coin and bill in the drawer before serving the first
            customer. The total below becomes today&apos;s opening float.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {priorClosingTotal !== undefined && (
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Yesterday&apos;s drawer ended at{" "}
              </span>
              <span className="font-semibold tabular-nums">
                {symbol}
                {priorClosingTotal.toFixed(2)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                — start fresh, don&apos;t copy that number blindly.
              </span>
            </div>
          )}

          <DenominationInput
            denominations={denominations}
            counts={counts}
            onChange={(id, c) => setCounts((p) => ({ ...p, [id]: c }))}
            currencySymbol={symbol}
          />

          <div className="flex items-center justify-between rounded-md border bg-amber-50/60 px-3 py-2.5">
            <span className="text-sm font-medium">Opening float</span>
            <span className="text-lg font-bold tabular-nums text-amber-700">
              {symbol}
              {floatTotal.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="open-note" className="text-xs">
              Note (optional)
            </Label>
            <Textarea
              id="open-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth flagging at open — e.g. low on quarters."
              className="min-h-[60px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={floatTotal <= 0}>
            Start day · {symbol}
            {floatTotal.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
