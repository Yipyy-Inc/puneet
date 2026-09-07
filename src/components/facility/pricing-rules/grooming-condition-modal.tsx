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
  GROOMING_HAIR_TYPE_OPTIONS,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";

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
          <DialogTitle>
            {editing ? "Edit Pet Condition Rule" : "Add Pet Condition Rule"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Senior large-breed handling surcharge"
            />
          </div>

          <div className="space-y-2">
            <Label>Hair type conditions</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              {GROOMING_HAIR_TYPE_OPTIONS.map((hairType) => (
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
            <Label>Breeds (comma separated)</Label>
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
              placeholder="golden retriever, poodle"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min age (years)</Label>
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
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max age (years)</Label>
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
                placeholder="Any"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sex and pet status</Label>
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label className="text-xs">Sex</Label>
                {(
                  [
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
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
                <Label className="text-xs">Pet status</Label>
                {(
                  [
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "deceased", label: "Deceased" },
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
              <Label>Min weight (kg)</Label>
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
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max weight (kg)</Label>
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
                placeholder="Any"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min duration (min)</Label>
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
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max duration (min)</Label>
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
                placeholder="Any"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Appointment window start</Label>
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
              <Label>Appointment window end</Label>
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
              <Label>Type</Label>
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
                  <SelectItem value="surcharge">Surcharge</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
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
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percentage">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.adjustmentType === "percentage" ? "%" : "$"}</Label>
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
              <Label>Billing mode</Label>
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
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="per_unit">Per unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit type</Label>
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
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="nights">Nights</SelectItem>
                </SelectContent>
              </Select>
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
                toast.error(
                  "Add at least one pet condition (age, breed, sex, status, weight, duration, or time)",
                );
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
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
