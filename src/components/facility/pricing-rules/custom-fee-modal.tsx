"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { CustomFee } from "@/types/boarding";
import {
  makeId,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";

// ── Custom Fee Modal ─────────────────────────────────────────────────

export function CustomFeeModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  addOnOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CustomFee | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  addOnOptions: Array<{ id: string; name: string }>;
  onSave: (fee: CustomFee) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: 0,
    feeType: "flat" as "flat" | "percentage",
    adjustmentKind: "fee" as "fee" | "discount",
    taxRate: undefined as number | undefined,
    scope: "per_pet" as "per_booking" | "per_pet",
    autoApply: "none" as
      | "none"
      | "at_checkout"
      | "by_care_type"
      | "new_customer"
      | "new_pet"
      | "customer_segment"
      | "addon_purchase",
    autoApplyCareTypes: [] as string[],
    customerStatuses: [] as string[],
    membershipPlans: [] as string[],
    requireMembershipActive: false,
    requirePrepaidBalance: false,
    triggerAddOnIds: [] as string[],
    waivedAddOnIds: [] as string[],
    waivePercentage: 100,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        amount: editing.amount,
        feeType: editing.feeType,
        adjustmentKind: editing.adjustmentKind ?? "fee",
        taxRate: editing.taxRate,
        scope: editing.scope,
        autoApply: editing.autoApply,
        autoApplyCareTypes: editing.autoApplyCareTypes ?? [],
        customerStatuses: editing.customerStatuses ?? [],
        membershipPlans: editing.membershipPlans ?? [],
        requireMembershipActive: editing.requireMembershipActive ?? false,
        requirePrepaidBalance: editing.requirePrepaidBalance ?? false,
        triggerAddOnIds: editing.triggerAddOnIds ?? [],
        waivedAddOnIds: editing.waivedAddOnIds ?? [],
        waivePercentage: editing.waivePercentage ?? 100,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        description: "",
        amount: 0,
        feeType: "flat",
        adjustmentKind: "fee",
        taxRate: undefined,
        scope: "per_pet",
        autoApply: "none",
        autoApplyCareTypes: [],
        customerStatuses: [],
        membershipPlans: [],
        requireMembershipActive: false,
        requirePrepaidBalance: false,
        triggerAddOnIds: [],
        waivedAddOnIds: [],
        waivePercentage: 100,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Custom Fee" : "Add Custom Fee"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fee Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Medication Administration"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="When does this fee apply?"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.feeType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    feeType: v as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat ($)</SelectItem>
                  <SelectItem value="percentage">Percent (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Effect</Label>
              <Select
                value={form.adjustmentKind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentKind: value as "fee" | "discount",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fee">Add fee</SelectItem>
                  <SelectItem value="discount">Apply discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    scope: v as "per_booking" | "per_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">Per pet</SelectItem>
                  <SelectItem value="per_booking">Per booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.taxRate ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  taxRate: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
              placeholder="Uses facility default"
            />
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
          <div className="space-y-2">
            <Label>When to apply automatically</Label>
            <div className="space-y-1.5">
              {(
                [
                  {
                    value: "none",
                    label: "Add manually at checkout",
                    desc: "Staff chooses when to add this fee",
                  },
                  {
                    value: "at_checkout",
                    label: "Always add at checkout",
                    desc: "Fee is automatically added every time",
                  },
                  {
                    value: "by_care_type",
                    label: "Add only for selected services",
                    desc: "Fee is added only when selected services are booked",
                  },
                  {
                    value: "new_customer",
                    label: "Add only for new customers",
                    desc: "Fee is added on the first booking for a customer",
                  },
                  {
                    value: "new_pet",
                    label: "Add for each new pet",
                    desc: "Fee is added for pets making their first booking",
                  },
                  {
                    value: "customer_segment",
                    label: "Apply for customer segments",
                    desc: "Trigger by customer status, membership plan, or prepaid balance",
                  },
                  {
                    value: "addon_purchase",
                    label: "Apply from add-on purchase",
                    desc: "Trigger when selected add-ons are in cart and optionally waive add-on fees",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, autoApply: opt.value }))
                  }
                  className={`w-full rounded-lg border p-2.5 text-left transition-all ${
                    form.autoApply === opt.value
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
            {form.autoApply === "by_care_type" && (
              <div className="space-y-1.5 rounded-lg border p-3">
                <Label className="text-xs">Select services</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceOptions.map((service) => (
                    <label
                      key={service.value}
                      className="flex items-center gap-1.5"
                    >
                      <Checkbox
                        checked={form.autoApplyCareTypes.includes(
                          service.value,
                        )}
                        onCheckedChange={(checked) =>
                          setForm((p) => ({
                            ...p,
                            autoApplyCareTypes:
                              checked === true
                                ? p.autoApplyCareTypes.includes(service.value)
                                  ? p.autoApplyCareTypes
                                  : [...p.autoApplyCareTypes, service.value]
                                : p.autoApplyCareTypes.filter(
                                    (type) => type !== service.value,
                                  ),
                          }))
                        }
                      />
                      <span className="text-xs">{service.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {form.autoApply === "customer_segment" && (
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-xs">Customer segment filters</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Customer statuses (comma separated)
                    </Label>
                    <Input
                      value={form.customerStatuses.join(", ")}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customerStatuses: e.target.value
                            .split(",")
                            .map((value) => value.trim().toLowerCase())
                            .filter((value) => value.length > 0),
                        }))
                      }
                      placeholder="vip, military, active"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Membership plans (comma separated)
                    </Label>
                    <Input
                      value={form.membershipPlans.join(", ")}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: e.target.value
                            .split(",")
                            .map((value) => value.trim().toLowerCase())
                            .filter((value) => value.length > 0),
                        }))
                      }
                      placeholder="gold, vip, platinum"
                    />
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.requireMembershipActive}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          requireMembershipActive: checked === true,
                        }))
                      }
                    />
                    <span className="text-xs">Require active membership</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.requirePrepaidBalance}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          requirePrepaidBalance: checked === true,
                        }))
                      }
                    />
                    <span className="text-xs">
                      Require prepaid balance/package
                    </span>
                  </label>
                </div>
              </div>
            )}
            {form.autoApply === "addon_purchase" && (
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-xs">Add-on purchase trigger</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Trigger add-ons</Label>
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                      {addOnOptions.map((addOn) => (
                        <label
                          key={addOn.id}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={form.triggerAddOnIds.includes(addOn.id)}
                            onCheckedChange={(checked) =>
                              setForm((prev) => ({
                                ...prev,
                                triggerAddOnIds:
                                  checked === true
                                    ? prev.triggerAddOnIds.includes(addOn.id)
                                      ? prev.triggerAddOnIds
                                      : [...prev.triggerAddOnIds, addOn.id]
                                    : prev.triggerAddOnIds.filter(
                                        (value) => value !== addOn.id,
                                      ),
                              }))
                            }
                          />
                          <span className="text-xs">{addOn.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Waive these add-ons</Label>
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                      {addOnOptions.map((addOn) => (
                        <label
                          key={`${addOn.id}-waive`}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={form.waivedAddOnIds.includes(addOn.id)}
                            onCheckedChange={(checked) =>
                              setForm((prev) => ({
                                ...prev,
                                waivedAddOnIds:
                                  checked === true
                                    ? prev.waivedAddOnIds.includes(addOn.id)
                                      ? prev.waivedAddOnIds
                                      : [...prev.waivedAddOnIds, addOn.id]
                                    : prev.waivedAddOnIds.filter(
                                        (value) => value !== addOn.id,
                                      ),
                              }))
                            }
                          />
                          <span className="text-xs">{addOn.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Waive percentage</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.waivePercentage}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        waivePercentage: Math.min(
                          100,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <p className="text-muted-foreground rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px]/relaxed">
            Rules can add fees or apply discounts. Add-on trigger rules can
            waive selected add-on charges automatically.
          </p>
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

              if (
                form.autoApply === "customer_segment" &&
                form.customerStatuses.length === 0 &&
                form.membershipPlans.length === 0 &&
                !form.requireMembershipActive &&
                !form.requirePrepaidBalance
              ) {
                toast.error("Add at least one customer segment filter");
                return;
              }

              if (
                form.autoApply === "addon_purchase" &&
                form.triggerAddOnIds.length === 0
              ) {
                toast.error("Select at least one trigger add-on");
                return;
              }

              onSave({
                id: editing?.id ?? makeId("cf"),
                name: form.name,
                description: form.description || undefined,
                amount: form.amount,
                feeType: form.feeType,
                adjustmentKind: form.adjustmentKind,
                taxRate: form.taxRate,
                scope: form.scope,
                autoApply: form.autoApply,
                autoApplyCareTypes:
                  form.autoApply === "by_care_type"
                    ? form.autoApplyCareTypes
                    : undefined,
                customerStatuses:
                  form.autoApply === "customer_segment"
                    ? form.customerStatuses
                    : undefined,
                membershipPlans:
                  form.autoApply === "customer_segment"
                    ? form.membershipPlans
                    : undefined,
                requireMembershipActive:
                  form.autoApply === "customer_segment"
                    ? form.requireMembershipActive
                    : undefined,
                requirePrepaidBalance:
                  form.autoApply === "customer_segment"
                    ? form.requirePrepaidBalance
                    : undefined,
                triggerAddOnIds:
                  form.autoApply === "addon_purchase"
                    ? form.triggerAddOnIds
                    : undefined,
                waivedAddOnIds:
                  form.autoApply === "addon_purchase"
                    ? form.waivedAddOnIds
                    : undefined,
                waivePercentage:
                  form.autoApply === "addon_purchase"
                    ? form.waivePercentage
                    : undefined,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: editing?.isActive ?? true,
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
