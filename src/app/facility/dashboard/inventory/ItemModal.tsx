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
import { toast } from "sonner";
import type { OpsInventoryItem, OpsSupplier } from "@/types/ops-inventory";
import { OPS_CATEGORIES, OPS_UNITS } from "@/types/ops-inventory";

type Props = {
  open: boolean;
  item: OpsInventoryItem | null;
  suppliers: OpsSupplier[];
  facilityId: number;
  onClose: () => void;
  onSave: (data: Omit<OpsInventoryItem, "id">) => void;
};

const EMPTY_FORM = (facilityId: number): Omit<OpsInventoryItem, "id"> => ({
  name: "",
  category: "Cleaning Supplies",
  quantity: 0,
  unit: "pieces",
  supplierId: "",
  facilityId,
  dailyUsage: 0,
  reorderPoint: 0,
  lastRestocked: new Date().toISOString().split("T")[0],
  costPerUnit: 0,
  notes: undefined,
});

export function ItemModal({ open, item, suppliers, facilityId, onClose, onSave }: Props) {
  const [form, setForm] = useState<Omit<OpsInventoryItem, "id">>(EMPTY_FORM(facilityId));

  useEffect(() => {
    if (open) {
      setForm(item ? { ...item } : EMPTY_FORM(facilityId));
    }
  }, [open, item, facilityId]);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!form.supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    onSave(form);
  };

  const activeSuppliers = suppliers.filter((s) => s.status !== "inactive");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Update item details and usage settings."
              : "Add a new item to your operational inventory."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto py-1 pr-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Item Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Poop Bags, Floor Disinfectant Concentrate"
            />
          </div>

          {/* Category + Supplier */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Supplier <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.supplierId}
                onValueChange={(v) => setForm({ ...form, supplierId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Quantity</Label>
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm({ ...form, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPS_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Daily Usage + Reorder Point */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Usage & Reorder
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Avg Daily Usage ({form.unit}/day)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.dailyUsage}
                  onChange={(e) =>
                    setForm({ ...form, dailyUsage: parseFloat(e.target.value) || 0 })
                  }
                />
                {form.dailyUsage > 0 && form.quantity > 0 && (
                  <p className="text-muted-foreground text-xs">
                    ~{Math.floor(form.quantity / form.dailyUsage)} days of stock remaining
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reorder Alert Threshold ({form.unit})</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.reorderPoint}
                  onChange={(e) =>
                    setForm({ ...form, reorderPoint: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Alert when stock falls below this level
                </p>
              </div>
            </div>
          </div>

          {/* Cost + Last Restocked */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cost per Unit ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.costPerUnit}
                onChange={(e) =>
                  setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last Restocked</Label>
              <Input
                type="date"
                value={form.lastRestocked}
                onChange={(e) => setForm({ ...form, lastRestocked: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value || undefined })
              }
              placeholder="Storage instructions, dilution ratios, ordering notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{item ? "Save Changes" : "Add Item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
