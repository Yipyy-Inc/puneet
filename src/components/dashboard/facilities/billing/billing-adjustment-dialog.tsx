"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingCredit } from "@/types/facility-billing";

export function BillingAdjustmentDialog({
  mode,
  currency,
  onConfirm,
  onClose,
}: {
  mode: "credit" | "discount";
  currency: string;
  onConfirm: (adjustment: Omit<BillingCredit, "id">) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  const isCredit = mode === "credit";
  const numeric = Number(value);
  const valid =
    value.trim() !== "" &&
    !Number.isNaN(numeric) &&
    numeric > 0 &&
    (isCredit || numeric <= 100);

  const submit = () => {
    if (!valid) return;
    const detail = isCredit
      ? numeric.toLocaleString("en-US", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        })
      : `${numeric}% off`;
    onConfirm({
      kind: mode,
      label: label.trim() || (isCredit ? "Account credit" : "Discount"),
      detail,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCredit ? "Apply credit" : "Apply discount"}
          </DialogTitle>
          <DialogDescription>
            {isCredit
              ? "Add a one-time account credit toward future invoices."
              : "Apply a recurring discount to this subscription."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="adj-value">
              {isCredit ? "Credit amount" : "Discount percentage"}
            </Label>
            <div className="relative">
              {isCredit && (
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
              )}
              <Input
                id="adj-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                placeholder={isCredit ? "50.00" : "10"}
                className={isCredit ? "pl-7" : "pr-8"}
              />
              {!isCredit && (
                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                  %
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-label">Label (optional)</Label>
            <Input
              id="adj-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isCredit ? "Goodwill credit" : "Loyalty discount"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={submit}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
