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
import type { ServiceBundleRule } from "@/types/boarding";
import {
  makeId,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";

// ── Service Bundle Modal ────────────────────────────────────────────

export function ServiceBundleModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ServiceBundleRule | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: ServiceBundleRule) => void;
}) {
  const { t } = usePricingLabels();
  const [form, setForm] = useState({
    name: "",
    triggerService: serviceType === "all" ? "boarding" : serviceType,
    bundledService: "grooming",
    bundledServiceLabel: "Departure Bath",
    triggerUnit: "nights" as "nights" | "sessions" | "days",
    minUnits: 6,
    maxUnits: null as number | null,
    requireSamePet: true,
    requireSameRoom: true,
    bundleMode: "mandatory" as "mandatory" | "optional",
    pricingMode: "discount_percentage" as
      | "included"
      | "discount_flat"
      | "discount_percentage"
      | "fixed_price",
    pricingValue: 30,
    notes: "",
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["boarding", "grooming"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        triggerService: editing.triggerService,
        bundledService: editing.bundledService,
        bundledServiceLabel: editing.bundledServiceLabel,
        triggerUnit: editing.triggerUnit,
        minUnits: editing.minUnits,
        maxUnits: editing.maxUnits ?? null,
        requireSamePet: editing.requireSamePet,
        requireSameRoom: editing.requireSameRoom,
        bundleMode: editing.bundleMode,
        pricingMode: editing.pricingMode,
        pricingValue: editing.pricingValue ?? 0,
        notes: editing.notes ?? "",
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        triggerService: serviceType === "all" ? "boarding" : serviceType,
        bundledService: "grooming",
        bundledServiceLabel: "Departure Bath",
        triggerUnit: "nights",
        minUnits: 6,
        maxUnits: null,
        requireSamePet: true,
        requireSameRoom: true,
        bundleMode: "mandatory",
        pricingMode: "discount_percentage",
        pricingValue: 30,
        notes: "",
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["boarding", "grooming"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("sbEdit") : t("sbAdd")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("sbName")}</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("sbNamePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("sbTriggerService")}</Label>
              <Select
                value={form.triggerService}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, triggerService: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("sbBundledService")}</Label>
              <Select
                value={form.bundledService}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, bundledService: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("sbBundledLabel")}</Label>
            <Input
              value={form.bundledServiceLabel}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  bundledServiceLabel: e.target.value,
                }))
              }
              placeholder={t("sbBundledLabelPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{t("sbMin")}</Label>
              <Input
                type="number"
                min={1}
                value={form.minUnits}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    minUnits: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("sbMax")}</Label>
              <Input
                type="number"
                min={form.minUnits}
                value={form.maxUnits ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maxUnits: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder={t("noCap")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("sbUnit")}</Label>
              <Select
                value={form.triggerUnit}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    triggerUnit: value as "nights" | "sessions" | "days",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nights">{t("sbNights")}</SelectItem>
                  <SelectItem value="days">{t("sbDays")}</SelectItem>
                  <SelectItem value="sessions">{t("sbSessions")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={form.requireSamePet}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    requireSamePet: checked === true,
                  }))
                }
              />
              <span className="text-sm">{t("sbSamePet")}</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={form.requireSameRoom}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    requireSameRoom: checked === true,
                  }))
                }
              />
              <span className="text-sm">{t("sbSameRoom")}</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("sbMode")}</Label>
              <Select
                value={form.bundleMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    bundleMode: value as "mandatory" | "optional",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mandatory">{t("sbMandatory")}</SelectItem>
                  <SelectItem value="optional">{t("sbOptional")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("sbPricing")}</Label>
              <Select
                value={form.pricingMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    pricingMode: value as
                      | "included"
                      | "discount_flat"
                      | "discount_percentage"
                      | "fixed_price",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">Included (free)</SelectItem>
                  <SelectItem value="discount_percentage">
                    {t("sbDiscountPercent")}
                  </SelectItem>
                  <SelectItem value="discount_flat">
                    {t("sbDiscountFlat")}
                  </SelectItem>
                  <SelectItem value="fixed_price">
                    {t("sbFixedPrice")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.pricingMode !== "included" && (
            <div className="space-y-2">
              <Label>
                {form.pricingMode === "discount_percentage"
                  ? t("sbDiscountPercentLabel")
                  : t("sbValueDollarsLabel")}
              </Label>
              <Input
                type="number"
                min={0}
                value={form.pricingValue}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pricingValue: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("sbNotes")}</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={t("sbNotesPlaceholder")}
            />
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
              if (!form.bundledServiceLabel.trim()) {
                toast.error(t("sbBundledLabelRequired"));
                return;
              }
              if (form.pricingMode !== "included" && form.pricingValue <= 0) {
                toast.error(t("sbPricingRequired"));
                return;
              }

              onSave({
                id: editing?.id ?? makeId("bundle"),
                name: form.name,
                triggerService: form.triggerService,
                bundledService: form.bundledService,
                bundledServiceLabel: form.bundledServiceLabel,
                triggerUnit: form.triggerUnit,
                minUnits: form.minUnits,
                maxUnits: form.maxUnits,
                requireSamePet: form.requireSamePet,
                requireSameRoom: form.requireSameRoom,
                bundleMode: form.bundleMode,
                pricingMode: form.pricingMode,
                pricingValue:
                  form.pricingMode === "included"
                    ? undefined
                    : form.pricingValue,
                notes: form.notes || undefined,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: editing?.isActive ?? true,
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
