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
import type { GroomingConditionAdjustment } from "@/types/boarding";
import {
  makeId,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";

// ── Grooming Condition Adjustment Modal ─────────────────────────────

export function GroomingConditionAdjustmentModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GroomingConditionAdjustment | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: GroomingConditionAdjustment) => void;
}) {
  const { t, coats } = usePricingLabels();
  const [form, setForm] = useState({
    name: "",
    hairTypes: [] as string[],
    breeds: [] as string[],
    sexes: [] as Array<"male" | "female">,
    petStatuses: [] as Array<"active" | "inactive" | "deceased">,
    ageMinYears: null as number | null,
    ageMaxYears: null as number | null,
    weightMinKg: null as number | null,
    weightMaxKg: null as number | null,
    durationMinutesMin: null as number | null,
    durationMinutesMax: null as number | null,
    appointmentWindowStart: "",
    appointmentWindowEnd: "",
    adjustmentKind: "surcharge" as "discount" | "surcharge",
    adjustmentType: "flat" as "flat" | "percentage",
    billingMode: "one_time" as "one_time" | "per_unit",
    unitType: "sessions" as "nights" | "days" | "sessions",
    amount: 15,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["grooming"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        hairTypes: editing.hairTypes ?? [],
        breeds: editing.breeds ?? [],
        sexes: editing.sexes ?? [],
        petStatuses: editing.petStatuses ?? [],
        ageMinYears: editing.ageMinYears ?? null,
        ageMaxYears: editing.ageMaxYears ?? null,
        weightMinKg: editing.weightMinKg ?? null,
        weightMaxKg: editing.weightMaxKg ?? null,
        durationMinutesMin: editing.durationMinutesMin ?? null,
        durationMinutesMax: editing.durationMinutesMax ?? null,
        appointmentWindowStart: editing.appointmentWindowStart ?? "",
        appointmentWindowEnd: editing.appointmentWindowEnd ?? "",
        adjustmentKind: editing.adjustmentKind,
        adjustmentType: editing.adjustmentType,
        billingMode: editing.billingMode ?? "one_time",
        unitType: editing.unitType ?? "sessions",
        amount: editing.amount,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        hairTypes: [],
        breeds: [],
        sexes: [],
        petStatuses: [],
        ageMinYears: null,
        ageMaxYears: null,
        weightMinKg: null,
        weightMaxKg: null,
        durationMinutesMin: null,
        durationMinutesMax: null,
        appointmentWindowStart: "",
        appointmentWindowEnd: "",
        adjustmentKind: "surcharge",
        adjustmentType: "flat",
        billingMode: "one_time",
        unitType: "sessions",
        amount: 15,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["grooming"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("gcEdit") : t("gcAdd")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("mpName")}</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("gcNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("gcHairTypes")}</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              {coats.map((hairType) => (
                <label key={hairType.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.hairTypes.includes(hairType.value)}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        hairTypes:
                          checked === true
                            ? prev.hairTypes.includes(hairType.value)
                              ? prev.hairTypes
                              : [...prev.hairTypes, hairType.value]
                            : prev.hairTypes.filter(
                                (value) => value !== hairType.value,
                              ),
                      }))
                    }
                  />
                  <span className="text-xs">{hairType.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("gcBreeds")}</Label>
            <Input
              value={form.breeds.join(", ")}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  breeds: e.target.value
                    .split(",")
                    .map((value) => value.trim().toLowerCase())
                    .filter((value) => value.length > 0),
                }))
              }
              placeholder={t("gcBreedsPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("gcMinAge")}</Label>
              <Input
                type="number"
                min={0}
                value={form.ageMinYears ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ageMinYears: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder={t("anyValue")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("gcMaxAge")}</Label>
              <Input
                type="number"
                min={0}
                value={form.ageMaxYears ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ageMaxYears: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder={t("anyValue")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("gcSexAndStatus")}</Label>
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label className="text-xs">{t("gcSex")}</Label>
                {(
                  [
                    { value: "male", label: t("gcMale") },
                    { value: "female", label: t("gcFemale") },
                  ] as const
                ).map((sexOption) => (
                  <label
                    key={sexOption.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.sexes.includes(sexOption.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          sexes:
                            checked === true
                              ? prev.sexes.includes(sexOption.value)
                                ? prev.sexes
                                : [...prev.sexes, sexOption.value]
                              : prev.sexes.filter(
                                  (value) => value !== sexOption.value,
                                ),
                        }))
                      }
                    />
                    <span className="text-xs">{sexOption.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("gcPetStatus")}</Label>
                {(
                  [
                    { value: "active", label: t("gcStatusActive") },
                    { value: "inactive", label: t("gcStatusInactive") },
                    { value: "deceased", label: t("gcStatusDeceased") },
                  ] as const
                ).map((statusOption) => (
                  <label
                    key={statusOption.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.petStatuses.includes(statusOption.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          petStatuses:
                            checked === true
                              ? prev.petStatuses.includes(statusOption.value)
                                ? prev.petStatuses
                                : [...prev.petStatuses, statusOption.value]
                              : prev.petStatuses.filter(
                                  (value) => value !== statusOption.value,
                                ),
                        }))
                      }
                    />
                    <span className="text-xs">{statusOption.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("gcMinWeight")}</Label>
              <Input
                type="number"
                min={0}
                value={form.weightMinKg ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    weightMinKg: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder={t("anyValue")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("gcMaxWeight")}</Label>
              <Input
                type="number"
                min={0}
                value={form.weightMaxKg ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    weightMaxKg: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder={t("anyValue")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("gcMinDuration")}</Label>
              <Input
                type="number"
                min={0}
                value={form.durationMinutesMin ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutesMin: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                placeholder={t("anyValue")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("gcMaxDuration")}</Label>
              <Input
                type="number"
                min={0}
                value={form.durationMinutesMax ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutesMax: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                placeholder={t("anyValue")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("gcWindowStart")}</Label>
              <Input
                type="time"
                value={form.appointmentWindowStart}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    appointmentWindowStart: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("gcWindowEnd")}</Label>
              <Input
                type="time"
                value={form.appointmentWindowEnd}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    appointmentWindowEnd: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{t("kind")}</Label>
              <Select
                value={form.adjustmentKind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentKind: value as "discount" | "surcharge",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surcharge">{t("surcharge")}</SelectItem>
                  <SelectItem value="discount">{t("discount")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("format")}</Label>
              <Select
                value={form.adjustmentType}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentType: value as "flat" | "percentage",
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
            <div className="space-y-2">
              <Label>{t("amount")}</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("gcBillingMode")}</Label>
              <Select
                value={form.billingMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    billingMode: value as "one_time" | "per_unit",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">{t("gcOneTime")}</SelectItem>
                  <SelectItem value="per_unit">{t("gcPerUnit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("gcUnitType")}</Label>
              <Select
                value={form.unitType}
                disabled={form.billingMode !== "per_unit"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    unitType: value as "nights" | "days" | "sessions",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessions">
                    {t("gcUnitSessions")}
                  </SelectItem>
                  <SelectItem value="days">{t("gcUnitDays")}</SelectItem>
                  <SelectItem value="nights">{t("gcUnitNights")}</SelectItem>
                </SelectContent>
              </Select>
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

              const hasAnyCondition =
                form.hairTypes.length > 0 ||
                form.breeds.length > 0 ||
                form.sexes.length > 0 ||
                form.petStatuses.length > 0 ||
                form.ageMinYears !== null ||
                form.ageMaxYears !== null ||
                form.weightMinKg !== null ||
                form.weightMaxKg !== null ||
                form.durationMinutesMin !== null ||
                form.durationMinutesMax !== null ||
                Boolean(form.appointmentWindowStart) ||
                Boolean(form.appointmentWindowEnd);

              if (!hasAnyCondition) {
                toast.error(t("gcConditionRequired"));
                return;
              }

              onSave({
                id: editing?.id ?? makeId("gca"),
                name: form.name,
                hairTypes: form.hairTypes,
                breeds: form.breeds,
                sexes: form.sexes,
                petStatuses: form.petStatuses,
                ageMinYears: form.ageMinYears,
                ageMaxYears: form.ageMaxYears,
                weightMinKg: form.weightMinKg,
                weightMaxKg: form.weightMaxKg,
                durationMinutesMin: form.durationMinutesMin,
                durationMinutesMax: form.durationMinutesMax,
                appointmentWindowStart:
                  form.appointmentWindowStart || undefined,
                appointmentWindowEnd: form.appointmentWindowEnd || undefined,
                adjustmentKind: form.adjustmentKind,
                adjustmentType: form.adjustmentType,
                billingMode: form.billingMode,
                unitType:
                  form.billingMode === "per_unit" ? form.unitType : undefined,
                amount: form.amount,
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
