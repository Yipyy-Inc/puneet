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
import { CreditCard, Banknote, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DepositChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleAmount: number;
  ruleLabel: string;
  onCharge: (amount: number, method: string) => void;
}

export function DepositChargeModal({
  open,
  onOpenChange,
  ruleAmount,
  ruleLabel,
  onCharge,
}: DepositChargeModalProps) {
  const [useRule, setUseRule] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState("card");

  const amount = useRule ? ruleAmount : parseFloat(customAmount) || 0;

  const methods = [
    { value: "card", label: "Card on File", icon: CreditCard },
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "terminal", label: "Terminal", icon: Smartphone },
  ];

  const handleCharge = () => {
    if (amount <= 0) return;
    onCharge(amount, method);
    onOpenChange(false);
    toast.success(`Deposit of $${amount.toFixed(2)} charged`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Charge Deposit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-muted-foreground text-sm">
            Deposit Rule: {ruleLabel}
          </p>

          {/* Amount selection */}
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 hover:bg-muted/30">
              <input
                type="radio"
                checked={useRule}
                onChange={() => setUseRule(true)}
                className="accent-primary"
              />
              <span className="text-sm">
                Use rule amount:{" "}
                <strong className="font-[tabular-nums]">
                  ${ruleAmount.toFixed(2)}
                </strong>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 hover:bg-muted/30">
              <input
                type="radio"
                checked={!useRule}
                onChange={() => setUseRule(false)}
                className="accent-primary"
              />
              <span className="text-sm">Custom amount:</span>
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setUseRule(false);
                }}
                className="ml-auto h-8 w-24 text-right font-[tabular-nums]"
                min={0}
                step={0.01}
                placeholder="0.00"
              />
            </label>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-all",
                      method === m.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Icon className="size-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCharge} disabled={amount <= 0}>
            Charge Deposit ${amount.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
