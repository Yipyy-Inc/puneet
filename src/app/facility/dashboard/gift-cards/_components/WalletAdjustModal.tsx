"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import type { CustomerWallet } from "@/types/payments";
import { clients } from "@/data/clients";

// Acting staff member (mock — no auth context yet).
const CURRENT_STAFF = "Sarah Johnson";

const REASONS = [
  "Customer Service Credit",
  "Error Correction",
  "Promotional Credit",
  "Cancellation Refund",
  "Other",
];

const NOTES_MAX = 200;

export interface WalletAdjustment {
  walletId: string;
  newBalance: number;
  delta: number;
  reason: string;
  notes: string;
  staff: string;
}

interface WalletAdjustModalProps {
  wallet: CustomerWallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Effective starting balance (reflects prior session adjustments). */
  currentBalance?: number;
  /** Apply the confirmed adjustment (session override + history entry). */
  onApply?: (adjustment: WalletAdjustment) => void;
}

export function WalletAdjustModal({
  wallet,
  open,
  onOpenChange,
  currentBalance,
  onApply,
}: WalletAdjustModalProps) {
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const close = () => {
    setDirection("add");
    setAmount("");
    setReason("");
    setNotes("");
    onOpenChange(false);
  };

  if (!wallet) return null;

  const client = clients.find((c) => c.id === wallet.clientId);
  const startBalance = currentBalance ?? wallet.balance;
  const value = parseFloat(amount) || 0;
  const signed = direction === "add" ? value : -value;
  const newBalance = startBalance + signed;
  const valid = value > 0 && newBalance >= 0 && reason !== "";

  const handleSave = () => {
    if (!valid) return;
    onApply?.({
      walletId: wallet.id,
      newBalance,
      delta: signed,
      reason,
      notes: notes.trim(),
      staff: CURRENT_STAFF,
    });
    const sign = signed >= 0 ? "+" : "−";
    alert(
      `${client?.name ?? "Customer"}'s wallet adjusted ${sign}$${Math.abs(
        signed,
      ).toFixed(2)} (${reason}). New balance: $${newBalance.toFixed(2)}.`,
    );
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Wallet Balance</DialogTitle>
          <DialogDescription>
            Manually credit or deduct from this customer&apos;s wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          {/* Read-only context */}
          <div className="bg-muted/40 space-y-1 rounded-lg border px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{client?.name ?? "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Current balance</span>
              <span className="price-value font-semibold text-green-600">
                ${startBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Adjusted by</span>
              <span className="font-medium">{CURRENT_STAFF}</span>
            </div>
          </div>

          {/* Add Credit / Deduct */}
          <div className="space-y-1.5">
            <Label>Adjustment type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setDirection("add")}
              >
                Add Credit
              </Button>
              <Button
                type="button"
                variant={direction === "subtract" ? "default" : "outline"}
                size="sm"
                onClick={() => setDirection("subtract")}
              >
                Deduct
              </Button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="wallet-amount">Amount</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="wallet-amount"
                type="number"
                min="0"
                step="0.01"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {value > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">
                  New balance will be:{" "}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    newBalance < 0 ? "text-red-600" : "text-green-600",
                  )}
                >
                  ${newBalance.toFixed(2)}
                </span>
                {newBalance < 0 && (
                  <span className="text-red-600"> — cannot go below $0</span>
                )}
              </p>
            )}
          </div>

          {/* Reason (required) */}
          <div className="space-y-1.5">
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="wallet-notes">Notes (optional)</Label>
            <Textarea
              id="wallet-notes"
              rows={2}
              maxLength={NOTES_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context…"
            />
            <p className="text-muted-foreground text-right text-[11px]">
              {notes.length}/{NOTES_MAX}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            Save Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
