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
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    customerName: string;
    amount: number;
    expiresAt?: string;
  }) => void;
}

export function AddCreditsDialog({ open, onOpenChange, onSubmit }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState("");

  const handleSubmit = () => {
    if (!customerName.trim() || amount <= 0) {
      toast.error("Missing details", {
        description: "Customer name and a positive amount are required.",
      });
      return;
    }
    onSubmit({
      customerName: customerName.trim(),
      amount,
      expiresAt: expiresAt || undefined,
    });
    toast.success("Credits added", {
      description: `$${amount.toFixed(2)} to ${customerName}`,
    });
    setCustomerName("");
    setAmount(0);
    setExpiresAt("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add prepaid credits</DialogTitle>
          <DialogDescription>
            Prepaid credits act as a store balance customers can spend on any
            service or add-on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Customer name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., Amanda Wilson"
            />
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
            <Label>Expiration (optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add credits</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
