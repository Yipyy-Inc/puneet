"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  calculateTipSplit,
  type TipSplitEntry,
} from "@/lib/invoice-lifecycle";

interface TipSplitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalTip: number;
  staffServices: { staffName: string; serviceValue: number }[];
  onSave: (entries: TipSplitEntry[]) => void;
}

type SplitMethod = "by_service" | "equal" | "custom_percent" | "custom_amount";

const METHODS: { value: SplitMethod; label: string }[] = [
  { value: "by_service", label: "By service price" },
  { value: "equal", label: "Split equally" },
  { value: "custom_percent", label: "Custom (%)" },
  { value: "custom_amount", label: "Custom ($)" },
];

export function TipSplitModal({
  open,
  onOpenChange,
  totalTip,
  staffServices,
  onSave,
}: TipSplitModalProps) {
  const [method, setMethod] = useState<SplitMethod>("by_service");
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  const entries = calculateTipSplit(
    method,
    totalTip,
    staffServices,
    customValues,
  );

  const totalAllocated = entries.reduce((s, e) => s + e.tipAmount, 0);
  const isBalanced = Math.abs(totalAllocated - totalTip) < 0.02;

  const handleSave = () => {
    onSave(entries);
    onOpenChange(false);
    toast.success("Tip split saved");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split Tips</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-muted-foreground text-xs">Total Tip</p>
            <p className="font-[tabular-nums] text-2xl font-bold">
              ${totalTip.toFixed(2)}
            </p>
          </div>

          {/* Split method */}
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  setMethod(m.value);
                  setCustomValues({});
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                  method === m.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-muted/50",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <Separator />

          {/* Staff breakdown */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              <span className="col-span-1">Staff</span>
              <span className="text-right">Service</span>
              <span className="text-right">Tip</span>
              <span className="text-right">%</span>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.staffName}
                className="grid grid-cols-4 items-center gap-2"
              >
                <span className="truncate text-sm font-medium">
                  {entry.staffName}
                </span>
                <span className="text-muted-foreground text-right text-sm font-[tabular-nums]">
                  ${entry.serviceValue.toFixed(2)}
                </span>
                {method === "custom_amount" || method === "custom_percent" ? (
                  <Input
                    type="number"
                    value={customValues[entry.staffName] ?? ""}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [entry.staffName]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-7 text-right text-xs font-[tabular-nums]"
                    min={0}
                    step={0.01}
                    placeholder={
                      method === "custom_percent" ? "%" : "$"
                    }
                  />
                ) : (
                  <span className="text-right text-sm font-semibold font-[tabular-nums]">
                    ${entry.tipAmount.toFixed(2)}
                  </span>
                )}
                <span className="text-muted-foreground text-right text-xs font-[tabular-nums]">
                  {entry.percentage}%
                </span>
              </div>
            ))}
            <Separator />
            <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
              <span>Total</span>
              <span />
              <span
                className={cn(
                  "text-right font-[tabular-nums]",
                  !isBalanced && "text-destructive",
                )}
              >
                ${totalAllocated.toFixed(2)}
              </span>
              <span className="text-right font-[tabular-nums]">100%</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isBalanced}>
            Save Tip Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
