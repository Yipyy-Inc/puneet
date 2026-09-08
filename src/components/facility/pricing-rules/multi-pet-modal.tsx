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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MultiPetDiscountRule } from "@/types/boarding";
import {
  makeId,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";

// ── Multi-Pet Discount Modal ─────────────────────────────────────────

export function MultiPetModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MultiPetDiscountRule | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: MultiPetDiscountRule) => void;
}) {
  const { t } = usePricingLabels();
  const [form, setForm] = useState({
    name: "",
    discountType: "additional_pet" as "per_pet" | "additional_pet",
    discountValueType: "flat" as "flat" | "percentage",
    sameLodging: false,
    tiers: [{ petCount: 2, discountAmount: 5 }],
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
        discountType: editing.discountType,
        discountValueType: editing.discountValueType ?? "flat",
        sameLodging: editing.sameLodging,
        tiers: editing.tiers.map((t) => ({ ...t })),
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
        isActive: editing.isActive,
      });
    } else {
      setForm({
        name: "",
        discountType: "additional_pet",
        discountValueType: "flat",
        sameLodging: false,
        tiers: [{ petCount: 2, discountAmount: 5 }],
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
        isActive: true,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("mpEdit") : t("mpAdd")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("mpName")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("mpNamePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("mpAppliesTo")}</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    discountType: v as "per_pet" | "additional_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">{t("mpPerPet")}</SelectItem>
                  <SelectItem value="additional_pet">
                    {t("mpAdditionalOnly")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("mpValueType")}</Label>
              <Select
                value={form.discountValueType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    discountValueType: v as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">{t("flat")}</SelectItem>
                  <SelectItem value="percentage">{t("percent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.sameLodging}
                  onCheckedChange={(c) =>
                    setForm((p) => ({ ...p, sameLodging: c === true }))
                  }
                />
                <span className="text-sm">{t("mpSameLodging")}</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("mpTiers")}</Label>
            <div className="space-y-2">
              {form.tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={2}
                    value={tier.petCount}
                    onChange={(e) => {
                      const next = [...form.tiers];
                      next[i] = {
                        ...tier,
                        petCount: parseInt(e.target.value) || 2,
                      };
                      setForm((p) => ({ ...p, tiers: next }));
                    }}
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-sm">
                    + pets →{" "}
                    {form.discountValueType === "percentage" ? "%" : "$"}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={tier.discountAmount}
                    onChange={(e) => {
                      const next = [...form.tiers];
                      next[i] = {
                        ...tier,
                        discountAmount: parseFloat(e.target.value) || 0,
                      };
                      setForm((p) => ({ ...p, tiers: next }));
                    }}
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">
                    {t("mpTierOff").replace("{amount}", "")}
                  </span>
                  {form.tiers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          tiers: p.tiers.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    tiers: [
                      ...p.tiers,
                      {
                        petCount: (p.tiers.at(-1)?.petCount ?? 1) + 1,
                        discountAmount: 0,
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-3" />
                {t("mpAddTier")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("whereApplies")}</Label>
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
                <span className="text-sm font-medium">{t("allServices")}</span>
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
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error(t("nameRequired"));
                return;
              }
              onSave({
                id: editing?.id ?? makeId("mpd"),
                name: form.name,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: form.isActive,
                discountType: form.discountType,
                discountValueType: form.discountValueType,
                sameLodging: form.sameLodging,
                tiers: form.tiers,
              });
            }}
          >
            {editing ? t("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
