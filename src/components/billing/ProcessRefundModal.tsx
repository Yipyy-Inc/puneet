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
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, AlertCircle } from "lucide-react";

interface ProcessRefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
  onSuccess?: (refund: any) => void;
}

export function ProcessRefundModal({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: ProcessRefundModalProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState(payment?.totalAmount || 0);
  const [refundMethod, setRefundMethod] = useState<"original" | "credit">(
    "original",
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const maxRefundable = payment?.totalAmount || 0;

  const handleSubmit = () => {
    if (
      refundType === "partial" &&
      (refundAmount <= 0 || refundAmount > maxRefundable)
    ) {
      alert("Please enter a valid refund amount");
      return;
    }
    if (!reason.trim()) {
      alert("Please enter a refund reason");
      return;
    }

    const refund = {
      paymentId: payment.id,
      amount: refundType === "full" ? maxRefundable : refundAmount,
      method: refundMethod,
      reason,
      notes: notes || undefined,
      processedAt: new Date().toISOString(),
      processedBy: "Current User",
    };

    console.log("Refund processed:", refund);

    if (onSuccess) {
      onSuccess(refund);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Process Refund
          </DialogTitle>
          <DialogDescription>Refund payment #{payment?.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Original Payment
                  </p>
                  <p className="text-2xl font-bold">
                    ${maxRefundable.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="font-medium capitalize">
                    {payment?.paymentMethod?.replace("_", " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Refund Type</Label>
            <Select
              value={refundType}
              onValueChange={(v) => setRefundType(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Refund</SelectItem>
                <SelectItem value="partial">Partial Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {refundType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0"
                max={maxRefundable}
                step="0.01"
                value={refundAmount}
                onChange={(e) =>
                  setRefundAmount(parseFloat(e.target.value) || 0)
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Refund Method</Label>
            <Select
              value={refundMethod}
              onValueChange={(v) => setRefundMethod(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">
                  Original Payment Method
                </SelectItem>
                <SelectItem value="credit">Store Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer cancelled service"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Refund Processing</p>
              <p>
                {refundMethod === "original"
                  ? "Refund will be processed to the original payment method. It may take 5-10 business days to appear."
                  : "Customer will receive store credit that can be used for future purchases."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="destructive">
            <RefreshCw className="h-4 w-4 mr-2" />
            Process Refund $
            {(refundType === "full" ? maxRefundable : refundAmount).toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
