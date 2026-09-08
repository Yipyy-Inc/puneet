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

import type { LatePickupFee } from "@/types/boarding";
import {
  makeId,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";

// ── Time Fee Modal (Late Pickup / Early Drop-off) ────────────────────

export function TimeFeeModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LatePickupFee | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (fee: LatePickupFee) => void;
}) {
  const { t } = usePricingLabels();
  const [form, setForm] = useState({
    name: "",
    condition: "late_pickup" as "late_pickup" | "early_dropoff",
    graceMinutes: 15,
    feeType: "per_30min" as
      | "flat"
      | "per_hour"
      | "per_30min"
      | "per_minute"
      | "extra_night",
    amount: 10,
    maxFee: undefined as number | undefined,
    scope: "per_pet" as "per_booking" | "per_pet",
    basedOn: "business_hours" as "business_hours" | "custom_time",
    customTime: "",
    applyFromTime: "",
    applyUntilTime: "",
    taxRate: undefined as number | undefined,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name ?? "",
        condition: editing.condition,
        graceMinutes: editing.graceMinutes,
        feeType: editing.feeType,
        amount: editing.amount,
        maxFee: editing.maxFee,
        scope: editing.scope,
        basedOn: editing.basedOn,
        customTime: editing.customTime ?? "",
        applyFromTime: editing.applyFromTime ?? "",
        applyUntilTime: editing.applyUntilTime ?? "",
        taxRate: editing.taxRate,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        condition: "late_pickup",
        graceMinutes: 15,
        feeType: "per_30min",
        amount: 10,
        maxFee: undefined,
        scope: "per_pet",
        basedOn: "business_hours",
        customTime: "",
        applyFromTime: "",
        applyUntilTime: "",
        taxRate: undefined,
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
          <DialogTitle>{editing ? t("tfEdit") : t("tfAdd")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("tfName")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("tfNamePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("tfCondition")}</Label>
              <Select
                value={form.condition}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    condition: v as "late_pickup" | "early_dropoff",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late_pickup">
                    {t("rowLatePickup")}
                  </SelectItem>
                  <SelectItem value="early_dropoff">
                    {t("rowEarlyDropoff")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("scope")}</Label>
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
                  <SelectItem value="per_pet">{t("perPet")}</SelectItem>
                  <SelectItem value="per_booking">{t("perBooking")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{t("tfGrace")}</Label>
              <Input
                type="number"
                min={0}
                value={form.graceMinutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    graceMinutes: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("amount")}</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                disabled={form.feeType === "extra_night"}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder={
                  form.feeType === "extra_night"
                    ? t("tfNightlyBase")
                    : undefined
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("tfFeeType")}</Label>
              <Select
                value={form.feeType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    feeType: v as
                      | "flat"
                      | "per_hour"
                      | "per_30min"
                      | "per_minute"
                      | "extra_night",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">{t("flat")}</SelectItem>
                  <SelectItem value="per_minute">{t("tfPerMinute")}</SelectItem>
                  <SelectItem value="per_30min">{t("tfPer30")}</SelectItem>
                  <SelectItem value="per_hour">{t("tfPerHour")}</SelectItem>
                  <SelectItem value="extra_night">
                    {t("tfExtraNight")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("tfMaxFee")}</Label>
              <Input
                type="number"
                min={0}
                value={form.maxFee ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    maxFee: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
                placeholder={t("noCap")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("tfBasedOn")}</Label>
              <Select
                value={form.basedOn}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    basedOn: v as "business_hours" | "custom_time",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_hours">
                    {t("tfBusinessHours")}
                  </SelectItem>
                  <SelectItem value="custom_time">
                    {t("tfCustomTime")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.basedOn === "custom_time" && (
            <div className="space-y-2">
              <Label>{t("tfCustomTimeHeading")}</Label>
              <Input
                type="time"
                value={form.customTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customTime: e.target.value }))
                }
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("tfFrom")}</Label>
              <Input
                type="time"
                value={form.applyFromTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, applyFromTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("tfUntil")}</Label>
              <Input
                type="time"
                value={form.applyUntilTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, applyUntilTime: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("taxRate")}</Label>
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
              placeholder={t("facilityDefault")}
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
          {/* White with a hairline — §6 rule 2 tints a metric tile and a
              status chip, and a note is neither. */}
          <p className="text-muted-foreground rounded-xl border px-3.5 py-2.5 text-[11px]/relaxed">
            {t("tfStackingNote")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: editing?.id ?? makeId("tf"),
                name: form.name || undefined,
                enabled: true,
                condition: form.condition,
                graceMinutes: form.graceMinutes,
                feeType: form.feeType,
                amount: form.amount,
                maxFee: form.maxFee,
                scope: form.scope,
                basedOn: form.basedOn,
                customTime:
                  form.basedOn === "custom_time" ? form.customTime : undefined,
                applyFromTime: form.applyFromTime || undefined,
                applyUntilTime: form.applyUntilTime || undefined,
                taxRate: form.taxRate,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
              })
            }
          >
            {editing ? t("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
