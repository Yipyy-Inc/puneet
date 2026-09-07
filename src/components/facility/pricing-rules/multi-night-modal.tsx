"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "sonner";
import type { MultiNightDiscount } from "@/types/boarding";
import {
  makeId,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";

// ── Multi-Night Discount Modal ───────────────────────────────────────

export function MultiNightModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MultiNightDiscount | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: MultiNightDiscount) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    minNights: 3,
    maxNights: null as number | null,
    discountPercent: 10,
    discountMode: "percentage" as "percentage" | "flat" | "free_nights",
    discountAmount: 25,
    freeNights: 1,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
    isActive: true,
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        minNights: editing.minNights,
        maxNights: editing.maxNights,
        discountPercent: editing.discountPercent,
        discountMode: editing.discountMode ?? "percentage",
        discountAmount: editing.discountAmount ?? 25,
        freeNights: editing.freeNights ?? 1,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
        isActive: editing.isActive,
      });
    } else {
      setForm({
        name: "",
        minNights: 3,
        maxNights: null,
        discountPercent: 10,
        discountMode: "percentage",
        discountAmount: 25,
        freeNights: 1,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
        isActive: true,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Multi-Night Discount" : "Add Multi-Night Discount"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Extended Stay Discount"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min nights</Label>
              <Input
                type="number"
                min={2}
                value={form.minNights}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    minNights: parseInt(e.target.value) || 2,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max nights</Label>
              <Input
                type="number"
                min={form.minNights + 1}
                value={form.maxNights ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    maxNights: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder="No limit"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Discount mode</Label>
              <Select
                value={form.discountMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    discountMode: value as
                      | "percentage"
                      | "flat"
                      | "free_nights",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percent off</SelectItem>
                  <SelectItem value="flat">Flat amount off</SelectItem>
                  <SelectItem value="free_nights">Free nights</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {form.discountMode === "percentage"
                  ? "Discount (%)"
                  : form.discountMode === "flat"
                    ? "Amount off ($)"
                    : "Free nights"}
              </Label>
              <Input
                type="number"
                min={0}
                max={form.discountMode === "percentage" ? 100 : undefined}
                value={
                  form.discountMode === "percentage"
                    ? form.discountPercent
                    : form.discountMode === "flat"
                      ? form.discountAmount
                      : form.freeNights
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setForm((prev) =>
                    prev.discountMode === "percentage"
                      ? { ...prev, discountPercent: value }
                      : prev.discountMode === "flat"
                        ? { ...prev, discountAmount: value }
                        : {
                            ...prev,
                            freeNights: Math.max(0, Math.round(value)),
                          },
                  );
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              onSave({
                id: editing?.id ?? makeId("mnd"),
                name: form.name,
                minNights: form.minNights,
                maxNights: form.maxNights,
                discountPercent:
                  form.discountMode === "percentage" ? form.discountPercent : 0,
                discountMode: form.discountMode,
                discountAmount:
                  form.discountMode === "flat"
                    ? form.discountAmount
                    : undefined,
                freeNights:
                  form.discountMode === "free_nights"
                    ? Math.max(1, form.freeNights)
                    : undefined,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: form.isActive,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
