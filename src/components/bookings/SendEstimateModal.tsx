"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Mail, Smartphone, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SendEstimateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  depositRequired?: number;
  onApplyDiscount: (amount: number, reason: string) => void;
}

export function SendEstimateModal({
  open,
  onOpenChange,
  clientName,
  clientEmail,
  clientPhone,
  subtotal,
  discount,
  taxAmount,
  total,
  depositRequired,
  onApplyDiscount,
}: SendEstimateModalProps) {
  // What to show on the estimate
  const [showServices, setShowServices] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [showTax, setShowTax] = useState(true);
  const [showDeposit, setShowDeposit] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");

  // Discount
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">(
    "percent",
  );
  const [discountReason, setDiscountReason] = useState("");

  const currentDiscount = discount;
  const effectiveTotal = total - currentDiscount;

  const handleApplyDiscount = () => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return;
    const amount =
      discountType === "percent"
        ? Math.round(subtotal * (val / 100) * 100) / 100
        : val;
    onApplyDiscount(
      amount,
      discountReason ||
        `${val}${discountType === "percent" ? "%" : "$"} discount`,
    );
    setDiscountOpen(false);
    setDiscountValue("");
    setDiscountReason("");
    toast.success(`Discount of $${amount.toFixed(2)} applied`);
  };

  const handleSendEmail = () => {
    toast.success(`Estimate sent to ${clientEmail}`);
    onOpenChange(false);
  };

  const handleSendSMS = () => {
    toast.success(`Estimate link sent via SMS to ${clientPhone}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Estimate to {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* What to include */}
          <div>
            <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-wider uppercase">
              Include on Estimate
            </p>
            <div className="space-y-2">
              <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2">
                <Checkbox
                  checked={showServices}
                  onCheckedChange={(v) => setShowServices(!!v)}
                />
                <span className="text-sm">Service details & line items</span>
              </label>
              <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2">
                <Checkbox
                  checked={showPrices}
                  onCheckedChange={(v) => setShowPrices(!!v)}
                />
                <span className="text-sm">Prices & subtotal</span>
              </label>
              <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2">
                <Checkbox
                  checked={showTax}
                  onCheckedChange={(v) => setShowTax(!!v)}
                />
                <span className="text-sm">Tax breakdown</span>
              </label>
              <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2">
                <Checkbox
                  checked={showDeposit}
                  onCheckedChange={(v) => setShowDeposit(!!v)}
                />
                <span className="text-sm">
                  Deposit info
                  {depositRequired && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      (${depositRequired.toFixed(2)} required)
                    </span>
                  )}
                </span>
              </label>
              <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2">
                <Checkbox
                  checked={showNotes}
                  onCheckedChange={(v) => setShowNotes(!!v)}
                />
                <span className="text-sm">Custom note</span>
              </label>
              {showNotes && (
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for the client..."
                  className="ml-7 text-xs"
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Estimate preview */}
          <div className="bg-muted/20 rounded-lg border p-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Preview
            </p>
            <div className="space-y-1.5 text-sm">
              {showPrices && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-[tabular-nums]">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              )}
              {currentDiscount > 0 && showPrices && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-[tabular-nums]">
                    -${currentDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              {showTax && taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-[tabular-nums]">
                    ${taxAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-[tabular-nums]">
                  ${effectiveTotal.toFixed(2)}
                </span>
              </div>
              {showDeposit && depositRequired && (
                <div className="flex justify-between text-xs text-amber-600">
                  <span>Deposit required</span>
                  <span className="font-[tabular-nums]">
                    ${depositRequired.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Apply Discount */}
          <Popover open={discountOpen} onOpenChange={setDiscountOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs"
              >
                <Percent className="size-3.5" />
                Apply Discount
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <p className="mb-2 text-xs font-medium">Add Discount</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiscountType("percent")}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                      discountType === "percent"
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    Percentage (%)
                  </button>
                  <button
                    onClick={() => setDiscountType("fixed")}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                      discountType === "fixed"
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    Fixed ($)
                  </button>
                </div>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "10" : "25.00"}
                  className="h-8 text-xs"
                  min={0}
                />
                <Input
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Reason (e.g., Loyalty, Promo)"
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={handleApplyDiscount}
                  disabled={!discountValue}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSendSMS}
            disabled={!clientPhone}
            className="gap-1.5"
          >
            <Smartphone className="size-3.5" />
            SMS
          </Button>
          <Button onClick={handleSendEmail} className="gap-1.5">
            <Mail className="size-3.5" />
            Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
