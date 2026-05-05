"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADJUSTMENT_REASON_LABELS,
  type AdjustmentReason,
  type CashMovement,
  type Currency,
} from "@/data/cash-drawer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffName: string;
  currency: Currency;
  onSubmit: (movement: CashMovement) => void;
}

export function CashMovementDialog({
  open,
  onOpenChange,
  staffName,
  currency,
  onSubmit,
}: Props) {
  const symbol = currency === "CAD" ? "CA$" : "$";
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("petty_cash_out");
  const [note, setNote] = useState("");

  const reset = () => {
    setDirection("out");
    setAmount("");
    setReason("petty_cash_out");
    setNote("");
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    onSubmit({
      id: `mv-${Date.now()}`,
      direction,
      amount: amt,
      reason,
      note: note.trim(),
      occurredAt: new Date().toISOString(),
      staffName,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record cash movement</DialogTitle>
          <DialogDescription>
            Anything that adds or removes physical cash from the drawer outside
            of a sale — tip-outs, safe drops, petty cash, corrections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Direction first — segmented control */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Direction
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("out")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
                  direction === "out"
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "hover:bg-muted/40",
                )}
              >
                <ArrowUpFromLine className="size-4" />
                Out (drawer down)
              </button>
              <button
                type="button"
                onClick={() => setDirection("in")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
                  direction === "in"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "hover:bg-muted/40",
                )}
              >
                <ArrowDownToLine className="size-4" />
                In (drawer up)
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="mv-amount" className="text-xs">
              Amount
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {symbol}
              </span>
              <Input
                id="mv-amount"
                type="number"
                min={0}
                step={0.01}
                value={amount}
                placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 tabular-nums"
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Reason</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as AdjustmentReason)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ADJUSTMENT_REASON_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="mv-note" className="text-xs">
              Note
            </Label>
            <Textarea
              id="mv-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why did this cash move? Who got it?"
              className="mt-1 min-h-[60px] resize-none"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Recorded by <span className="font-medium">{staffName}</span> at{" "}
            {new Date().toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
