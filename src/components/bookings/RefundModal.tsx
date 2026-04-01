"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RotateCcw,
  CreditCard,
  Banknote,
  Wallet,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceTotal: number;
  amountPaid: number;
  items: { name: string; price: number }[];
  onConfirm: (refund: {
    amount: number;
    method: string;
    reason: string;
    type: "full" | "partial" | "by_item";
  }) => void;
}

type RefundType = "full" | "partial" | "by_item";
type RefundMethod = "original" | "store_credit" | "cash";

export function RefundModal({
  open,
  onOpenChange,
  invoiceTotal,
  amountPaid,
  items,
  onConfirm,
}: RefundModalProps) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [refundType, setRefundType] = useState<RefundType>("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [method, setMethod] = useState<RefundMethod>("original");
  const [reason, setReason] = useState("");

  const refundAmount =
    refundType === "full"
      ? amountPaid
      : refundType === "partial"
        ? parseFloat(partialAmount) || 0
        : items
            .filter((_, i) => selectedItems.has(i))
            .reduce((s, item) => s + item.price, 0);

  const toggleItem = (idx: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirm = () => {
    if (step === "select") {
      setStep("confirm");
      return;
    }
    onConfirm({
      amount: refundAmount,
      method,
      reason,
      type: refundType,
    });

    // Auto-generate refund receipt in new window
    const w = window.open("", "_blank", "width=500,height=600");
    if (w) {
      const methodLabel =
        method === "original"
          ? "Original Payment Method"
          : method === "store_credit"
            ? "Store Credit"
            : "Cash";
      w.document.write(`<!DOCTYPE html><html><head><title>Refund Receipt</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:420px;margin:0 auto}
h1{font-size:18px;margin:0;color:#dc2626}h2{font-size:12px;color:#666;margin:4px 0 20px}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #eee}
.row.total{border-top:2px solid #dc2626;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px;color:#dc2626}
.row.sub{color:#666}.section{margin-top:14px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.footer{margin-top:24px;text-align:center;font-size:10px;color:#999}
.badge{background:#fef2f2;color:#dc2626;padding:6px 14px;border-radius:8px;text-align:center;margin-top:14px;font-weight:600;font-size:13px}
.note{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-top:14px;font-size:11px;color:#64748b}
</style></head><body>
<h1>Refund Receipt</h1>
<h2>Processed ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2>
<div class="section">Refund Details</div>
<div class="row"><span>Type</span><span>${refundType === "by_item" ? "By Item" : refundType === "partial" ? "Partial" : "Full"}</span></div>
<div class="row"><span>Method</span><span>${methodLabel}</span></div>
${reason ? `<div class="row"><span>Reason</span><span>${reason}</span></div>` : ""}
${
  refundType === "by_item"
    ? `<div class="section">Refunded Items</div>${items
        .filter((_, i) => selectedItems.has(i))
        .map(
          (item) =>
            `<div class="row"><span>${item.name}</span><span>$${item.price.toFixed(2)}</span></div>`,
        )
        .join("")}`
    : ""
}
<div class="row total"><span>Refund Amount</span><span>$${refundAmount.toFixed(2)}</span></div>
<div class="badge">REFUND PROCESSED</div>
<div class="note">The original invoice remains unchanged for audit purposes. This refund receipt is linked to the original transaction.</div>
<div class="footer">Refund processed by staff · ${new Date().toLocaleTimeString()}</div>
</body></html>`);
      w.document.close();
    }

    onOpenChange(false);
    setStep("select");
    setRefundType("full");
    setPartialAmount("");
    setSelectedItems(new Set());
    setReason("");
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("select");
    } else {
      onOpenChange(false);
    }
  };

  const METHODS = [
    {
      value: "original" as const,
      label: "Original Method",
      desc: "Refund to the card/method used",
      icon: CreditCard,
    },
    {
      value: "store_credit" as const,
      label: "Store Credit",
      desc: "Add to client's credit balance",
      icon: Wallet,
    },
    {
      value: "cash" as const,
      label: "Cash",
      desc: "Hand cash refund to client",
      icon: Banknote,
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setStep("select");
          setRefundType("full");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5" />
            Issue Refund
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="animate-in fade-in space-y-5 py-2 duration-200">
            {/* Refund type */}
            <div className="space-y-2">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Refund Type
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={() => setRefundType("full")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                    refundType === "full"
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                      : "hover:border-border hover:bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      refundType === "full"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <RotateCcw className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Full Refund</p>
                    <p className="text-muted-foreground text-xs">
                      Refund entire payment of{" "}
                      <span className="font-[tabular-nums] font-medium">
                        ${amountPaid.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setRefundType("partial")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                    refundType === "partial"
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                      : "hover:border-border hover:bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      refundType === "partial"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Banknote className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Partial Refund</p>
                    <p className="text-muted-foreground text-xs">
                      Specify a custom refund amount
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setRefundType("by_item")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                    refundType === "by_item"
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                      : "hover:border-border hover:bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      refundType === "by_item"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Check className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Refund by Item</p>
                    <p className="text-muted-foreground text-xs">
                      Select specific items to refund
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Partial amount input */}
            {refundType === "partial" && (
              <div className="animate-in fade-in duration-150">
                <p className="text-muted-foreground mb-1.5 text-xs">
                  Refund Amount (max ${amountPaid.toFixed(2)})
                </p>
                <Input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  max={amountPaid}
                  step={0.01}
                  className="h-12 text-center font-[tabular-nums] text-xl font-bold"
                  autoFocus
                />
              </div>
            )}

            {/* Item selection */}
            {refundType === "by_item" && (
              <div className="animate-in fade-in space-y-1.5 duration-150">
                <p className="text-muted-foreground text-xs">
                  Select items to refund
                </p>
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleItem(idx)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-all",
                      selectedItems.has(idx)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border-2 transition-all",
                          selectedItems.has(idx)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {selectedItems.has(idx) && <Check className="size-3" />}
                      </div>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-[tabular-nums] text-sm font-medium">
                      ${item.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Refund method */}
            <div>
              <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
                Refund To
              </p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMethod(m.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                        method === m.value
                          ? "border-primary bg-primary/5 text-primary ring-primary/20 ring-1"
                          : "hover:bg-muted/30",
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="text-[11px] font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs">
                Reason for refund
              </p>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Service not rendered, client complaint..."
                className="text-sm"
              />
            </div>
          </div>
        ) : (
          /* Confirmation step */
          <div className="animate-in fade-in slide-in-from-right-2 space-y-5 py-2 duration-200">
            {/* Warning */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Confirm Refund
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  This action cannot be undone. The refund will be processed
                  immediately. The original invoice stays unchanged for audit
                  purposes — a separate refund receipt will be generated.
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/20 rounded-xl border p-4">
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refund Type</span>
                  <span className="font-medium capitalize">
                    {refundType === "by_item"
                      ? "By Item"
                      : refundType === "partial"
                        ? "Partial"
                        : "Full"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refund Method</span>
                  <span className="font-medium">
                    {METHODS.find((m) => m.value === method)?.label}
                  </span>
                </div>
                {reason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason</span>
                    <span className="max-w-[200px] text-right text-sm italic">
                      {reason}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">Refund Amount</span>
                  <span className="font-[tabular-nums] text-2xl font-bold text-red-600">
                    ${refundAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleBack}>
            {step === "confirm" ? "Go Back" : "Cancel"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={refundAmount <= 0 || refundAmount > amountPaid}
            className={cn(
              "gap-1.5",
              step === "confirm" && "bg-red-600 text-white hover:bg-red-700",
            )}
          >
            <RotateCcw className="size-4" />
            {step === "confirm"
              ? `Confirm Refund $${refundAmount.toFixed(2)}`
              : `Continue — $${refundAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
