"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientQueries } from "@/lib/api/client";

// ============================================================================
// Issuing credit to a customer who exists.
//
// ── WHAT THIS TOOK BEFORE ─────────────────────────────────────────────────
//
// A TYPED-IN NAME. The caller then invented an id to hang it on
// (`cust-${Date.now()}`), so $200 of credit could be issued to "Amanda Wilon"
// and neither Amanda nor the till would ever hear about it. It picks a real
// client now, and the amount lands on that client's ledger.
//
// ── AND THERE IS NO EXPIRY FIELD ANY MORE ─────────────────────────────────
//
// `store_credit_entries` has no expiry column, and that is the better model:
// `expired` is one of its reasons, so expiry is recorded as a negative entry on
// the day it happens. A date typed in here would have been a promise with
// nothing to keep it — no job reads it, so the credit would simply stay
// spendable past the date the screen displayed.
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rejects — the ledger refuses a caller without `process_refund`. */
  onSubmit: (data: {
    clientRef: number;
    amount: number;
    note: string;
  }) => Promise<void>;
}

export function AddCreditsDialog({ open, onOpenChange, onSubmit }: Props) {
  const { data: clients } = useQuery({ ...clientQueries.all(), enabled: open });
  const [clientRef, setClientRef] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => (clients ?? []).map((c) => ({ ref: String(c.id), name: c.name })),
    [clients],
  );

  const handleSubmit = async () => {
    setError(null);
    if (!clientRef || amount <= 0) {
      setError("Pick a customer and enter a positive amount.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ clientRef: Number(clientRef), amount, note });
      setClientRef("");
      setAmount(0);
      setNote("");
      onOpenChange(false);
    } catch (err) {
      // Stays open. It used to toast "Credits added" before the caller had
      // done anything at all.
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add prepaid credits</DialogTitle>
          <DialogDescription>
            Credit is a store balance the customer can spend on any service or
            add-on. It goes on their account immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={clientRef} onValueChange={setClientRef}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.ref} value={o.ref}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount ($)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., goodwill after a late pickup"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Adding…" : "Add credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
