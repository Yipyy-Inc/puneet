"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { applyCredit } from "@/lib/credits-store";
import { FacilityPicker } from "./facility-picker";
import { CREDIT_REASONS, formatMoney } from "./credit-utils";

export function ApplyCreditModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const amountNum = Number(amount);
  const valid = facilityId !== null && amountNum > 0 && reason !== "";

  const reset = () => {
    setFacilityId(null);
    setFacilityName("");
    setAmount("");
    setReason("");
    setNote("");
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = () => {
    if (!valid || facilityId === null) return;
    applyCredit({ facilityId, facilityName, amount: amountNum, reason, note });
    toast.success(
      `${formatMoney(amountNum)} credit applied to ${facilityName}`,
    );
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Credit</DialogTitle>
          <DialogDescription>
            Grant an account credit to a facility. This increases Yipyy&apos;s
            outstanding credit liability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Facility</Label>
            <FacilityPicker
              value={facilityId}
              onChange={(id, name) => {
                setFacilityId(id);
                setFacilityName(name);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="credit-amount">Amount (USD)</Label>
            <Input
              id="credit-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="credit-note">Internal note (optional)</Label>
            <Textarea
              id="credit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context for the audit trail…"
              rows={3}
            />
          </div>

          {valid && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              Applying{" "}
              <span className="font-semibold">{formatMoney(amountNum)}</span>{" "}
              credit to <span className="font-semibold">{facilityName}</span>.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!valid}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Apply Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
