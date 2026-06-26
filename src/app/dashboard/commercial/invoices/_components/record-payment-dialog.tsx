"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoicePayment, PaymentMethod } from "@/types/platform-invoices";
import { formatMoney } from "./invoice-utils";

const METHODS: PaymentMethod[] = ["Bank Transfer", "Cash", "Check", "Other"];

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  onConfirm: (payment: Omit<InvoicePayment, "id">) => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  amount,
  currency,
  onConfirm,
}: RecordPaymentDialogProps) {
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [reference, setReference] = useState("");

  function submit() {
    if (!date) return;
    onConfirm({
      date,
      amount,
      method,
      reference: reference.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record manual payment</DialogTitle>
          <DialogDescription>
            Mark this invoice as paid by recording an off-platform payment of{" "}
            {formatMoney(amount, currency)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payment-date">Payment date</Label>
            <DatePicker
              id="payment-date"
              value={date}
              onValueChange={(next) => setDate(next)}
              placeholder="Select payment date"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-method">Method</Label>
            <Select
              value={method}
              onValueChange={(value) => setMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-reference">Reference number</Label>
            <Input
              id="payment-reference"
              value={reference}
              placeholder="e.g. check #1042 or transfer ID"
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!date}
            onClick={submit}
          >
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
