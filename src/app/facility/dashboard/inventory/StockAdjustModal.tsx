"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import type { OpsInventoryItem, StockAdjustType } from "@/types/ops-inventory";
import { ADD_REASONS, REMOVE_REASONS } from "@/types/ops-inventory";

type Props = {
  open: boolean;
  item: OpsInventoryItem | null;
  supplierName: string;
  onClose: () => void;
  onSave: (type: StockAdjustType, quantity: number, reason: string, notes: string) => void;
};

export function StockAdjustModal({ open, item, supplierName, onClose, onSave }: Props) {
  const [adjustType, setAdjustType] = useState<StockAdjustType>("add");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setAdjustType("add");
      setQuantity(1);
      setReason("");
      setNotes("");
    }
  }, [open]);

  if (!item) return null;

  const reasons = adjustType === "add" ? ADD_REASONS : REMOVE_REASONS;

  const daysRemaining =
    item.dailyUsage > 0 ? Math.floor(item.quantity / item.dailyUsage) : null;

  const newQty =
    adjustType === "add"
      ? item.quantity + quantity
      : Math.max(0, item.quantity - quantity);

  const handleSave = () => {
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }
    onSave(adjustType, quantity, reason, notes);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current stock summary */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3.5 text-center">
            <div>
              <p className="text-muted-foreground text-xs">Current Stock</p>
              <p className="text-lg font-bold">
                {item.quantity}
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  {item.unit}
                </span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Daily Usage</p>
              <p className="text-lg font-bold">
                {item.dailyUsage}
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  /day
                </span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Days Left</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  daysRemaining === null
                    ? ""
                    : daysRemaining < 3
                      ? "text-destructive"
                      : daysRemaining < 7
                        ? "text-warning"
                        : "text-emerald-600",
                )}
              >
                {daysRemaining === null ? "—" : `~${daysRemaining}`}
              </p>
            </div>
          </div>

          {/* Add / Remove toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAdjustType("add");
                setReason("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                adjustType === "add"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <ArrowUp className="size-4" />
              Add Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustType("remove");
                setReason("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                adjustType === "remove"
                  ? "border-destructive bg-red-50 text-destructive"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <ArrowDown className="size-4" />
              Remove Stock
            </button>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Quantity ({item.unit}) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details..."
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">New stock level</span>
              <span className="font-semibold">
                {newQty} {item.unit}
              </span>
            </div>
            {adjustType === "add" && reason === "purchase" && (
              <p className="text-muted-foreground mt-1 text-xs">
                Supplier: {supplierName}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant={adjustType === "remove" ? "destructive" : "default"}
          >
            {adjustType === "add" ? "Add Stock" : "Remove Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
