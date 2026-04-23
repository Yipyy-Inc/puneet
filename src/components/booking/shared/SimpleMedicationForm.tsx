"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  Pill,
  Clock,
  ShieldAlert,
  PillBottle,
  DollarSign,
  HandHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { facilityConfig } from "@/data/facility-config";
import type {
  MedicationItem,
  MedForm,
  MedFrequency,
  MedGivenWith,
} from "@/types/booking";

interface PetOption {
  id: number;
  name: string;
  type?: string;
}

interface SimpleMedicationFormProps {
  medications: MedicationItem[];
  setMedications: (medications: MedicationItem[]) => void;
  selectedPets: PetOption[];
  /** The booking service type — used to show applicable fees */
  serviceType?: string;
}

const MED_FORMS: { value: MedForm; label: string }[] = [
  { value: "pill", label: "Pill" },
  { value: "liquid", label: "Liquid" },
  { value: "topical", label: "Topical" },
  { value: "powder", label: "Powder" },
  { value: "ear_drops", label: "Ear drops" },
  { value: "eye_drops", label: "Eye drops" },
];

const MED_FREQUENCIES: { value: MedFrequency; label: string }[] = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "every_8hrs", label: "Every 8 hrs" },
  { value: "prn", label: "As needed" },
];

// Read from facility config (editable in Settings > Care Tasks)
const QUICK_TIMES = facilityConfig.medicationOptions.quickTimes;
const GIVEN_WITH_OPTIONS = facilityConfig.serviceFees.givenWithOptions;
const MED_FEES = facilityConfig.serviceFees.medication;
const FACILITY_AID_ITEMS = MED_FEES.facilityProvides.enabled
  ? MED_FEES.facilityProvides.items
  : [];

const HIGH_RISK_KEYWORDS = [
  "insulin",
  "seizure",
  "phenobarbital",
  "prednisone",
  "thyroid",
  "heart",
];

function makeId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function fmtTime(t: string) {
  try {
    return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return t;
  }
}

export function SimpleMedicationForm({
  medications,
  setMedications,
  selectedPets,
  serviceType,
}: SimpleMedicationFormProps) {
  const showMedFee =
    MED_FEES.adminFee.enabled &&
    (!serviceType ||
      MED_FEES.adminFee.applicableServices.includes(serviceType));

  // Tracks which medication indices have a pending custom-time picker open
  const pendingCustomValue = useRef<Record<number, string>>({});
  const [pendingCustomKeys, setPendingCustomKeys] = useState<Set<number>>(
    new Set(),
  );
  // Separate state to drive trigger-button display (ref alone won't re-render)
  const [pendingCustomTime, setPendingCustomTime] = useState<
    Record<number, string>
  >({});

  const updateMed = (index: number, patch: Partial<MedicationItem>) => {
    const next = [...medications];
    next[index] = { ...next[index], ...patch };
    setMedications(next);
  };

  const add = () => {
    setMedications([
      ...medications,
      {
        id: makeId(),
        petId: selectedPets.length === 1 ? selectedPets[0].id : undefined,
        name: "",
        amount: "",
        form: "pill",
        frequency: "once_daily",
        times: ["08:00"],
        adminInstructions: [],
        ifMissed: "skip_continue",
        notes: "",
      },
    ]);
  };

  const remove = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const toggleTime = (index: number, time: string) => {
    const item = medications[index];
    const next = item.times.includes(time)
      ? item.times.filter((t) => t !== time)
      : [...item.times, time].sort();
    updateMed(index, { times: next });
  };

  // #3 — move medication up/down for reordering
  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...medications];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setMedications(next);
  };

  const moveDown = (index: number) => {
    if (index >= medications.length - 1) return;
    const next = [...medications];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setMedications(next);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
          <Pill className="size-4 text-violet-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Medications</h4>
          {/* #2 — skip affordance */}
          <p className="text-muted-foreground text-xs">
            Add any medications needed during the stay. No medications? Skip to
            the next step.
          </p>
        </div>
      </div>

      {/* Medication fee notice */}
      {showMedFee && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <DollarSign className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-medium text-amber-800">
              Medication administration fee applies
            </p>
            <p className="text-[11px] text-amber-600">
              ${MED_FEES.adminFee.amount.toFixed(2)}{" "}
              {MED_FEES.adminFee.scope === "per_medication"
                ? "per medication"
                : MED_FEES.adminFee.scope === "per_pet"
                  ? "per pet"
                  : "flat fee"}{" "}
              for{" "}
              {serviceType
                ? serviceType
                : MED_FEES.adminFee.applicableServices.join(" & ")}
            </p>
          </div>
        </div>
      )}

      {/* #1 — empty state */}
      {medications.length === 0 && (
        <div className="rounded-xl border border-dashed px-4 py-6 text-center">
          <PillBottle className="text-muted-foreground/30 mx-auto mb-1.5 size-6" />
          <p className="text-muted-foreground text-xs">
            No medications added — tap the button below if this pet needs any
          </p>
        </div>
      )}

      {/* Medication list */}
      {medications.length > 0 && (
        <div className="space-y-3">
          {medications.map((item, index) => {
            const isHighRisk =
              item.isHighRisk ||
              HIGH_RISK_KEYWORDS.some((kw) =>
                item.name.toLowerCase().includes(kw),
              );

            return (
              <div
                key={item.id}
                className={cn(
                  "space-y-3 rounded-xl border-2 p-4 transition-colors",
                  isHighRisk ? "border-red-200 bg-red-50/30" : "border-border",
                )}
              >
                {/* Top bar: pet badge (multi-pet) + reorder + remove */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* #5 — pet badge on each medication card */}
                    {selectedPets.length > 1 && (
                      <Select
                        value={item.petId?.toString() ?? ""}
                        onValueChange={(v) =>
                          updateMed(index, { petId: parseInt(v, 10) })
                        }
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent px-1 text-xs font-medium shadow-none">
                          <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                            {selectedPets.find((p) => p.id === item.petId)
                              ?.name[0] ?? "?"}
                          </span>
                          <SelectValue placeholder="Pet" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPets.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* High risk badge */}
                    {isHighRisk && (
                      <Badge
                        variant="destructive"
                        className="gap-1 text-[10px]"
                      >
                        <ShieldAlert className="size-3" />
                        High-risk
                      </Badge>
                    )}

                    {/* #3 — reorder indicator */}
                    {medications.length > 1 && (
                      <span className="text-muted-foreground text-[10px]">
                        {index + 1} of {medications.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* #3 — reorder buttons */}
                    {medications.length > 1 && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground size-6"
                          disabled={index === 0}
                          onClick={() => moveUp(index)}
                        >
                          <span className="text-xs">↑</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground size-6"
                          disabled={index >= medications.length - 1}
                          onClick={() => moveDown(index)}
                        >
                          <span className="text-xs">↓</span>
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-6"
                      onClick={() => remove(index)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Name + dosage row */}
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-[11px]">Medication name</Label>
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        updateMed(index, { name: e.target.value })
                      }
                      placeholder="e.g., Apoquel"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-24 shrink-0 space-y-1">
                    <Label className="text-[11px]">Dosage</Label>
                    <Input
                      value={item.amount}
                      onChange={(e) =>
                        updateMed(index, { amount: e.target.value })
                      }
                      placeholder="1 tablet"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Form + Frequency */}
                <div className="flex gap-2">
                  <div className="w-1/2 space-y-1">
                    <Label className="text-[11px]">Form</Label>
                    <Select
                      value={item.form}
                      onValueChange={(v) =>
                        updateMed(index, { form: v as MedForm })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MED_FORMS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-1/2 space-y-1">
                    <Label className="text-[11px]">Frequency</Label>
                    <Select
                      value={item.frequency}
                      onValueChange={(v) =>
                        updateMed(index, { frequency: v as MedFrequency })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MED_FREQUENCIES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Times — quick toggles + custom */}
                <div className="space-y-2">
                  <Label className="text-[11px]">Give at</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TIMES.map(({ label, time }) => {
                      const active = item.times.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleTime(index, time)}
                          className={cn(
                            "flex items-center gap-1 rounded-lg border-2 px-2.5 py-1.5 text-xs font-medium transition-all",
                            active
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-border hover:border-violet-200",
                          )}
                        >
                          <Clock className="size-3" />
                          {label}
                          <span className="text-muted-foreground text-[10px]">
                            {fmtTime(time)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Custom times */}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.times
                      .filter((t) => !QUICK_TIMES.some((qt) => qt.time === t))
                      .map((t) => (
                        <div
                          key={t}
                          className="flex items-center gap-1 rounded-lg border-2 border-violet-400 bg-violet-50 px-2.5 py-1.5"
                        >
                          <Clock className="size-3 shrink-0 text-violet-500" />
                          <span className="text-xs font-medium text-violet-700">
                            {fmtTime(t)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateMed(index, {
                                times: item.times.filter((x) => x !== t),
                              })
                            }
                            className="ml-0.5 text-violet-400 hover:text-violet-700"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    {pendingCustomKeys.has(index) && (
                      <TimePickerLux
                        value={pendingCustomTime[index] || undefined}
                        onValueChange={(t) => {
                          pendingCustomValue.current[index] = t;
                          setPendingCustomTime((prev) => ({
                            ...prev,
                            [index]: t,
                          }));
                        }}
                        onOpenChange={(isOpen) => {
                          if (!isOpen) {
                            const t = pendingCustomValue.current[index];
                            if (t) {
                              updateMed(index, {
                                times: [...item.times, t],
                              });
                            }
                            delete pendingCustomValue.current[index];
                            setPendingCustomTime((prev) => {
                              const next = { ...prev };
                              delete next[index];
                              return next;
                            });
                            setPendingCustomKeys((prev) => {
                              const next = new Set(prev);
                              next.delete(index);
                              return next;
                            });
                          }
                        }}
                        defaultOpen={true}
                        stepMinutes={15}
                        displayMode="popover"
                        className="h-7 min-w-[110px] text-xs"
                        placeholder="Pick a time"
                      />
                    )}
                    {!pendingCustomKeys.has(index) && (
                      <button
                        type="button"
                        onClick={() => {
                          pendingCustomValue.current[index] = "";
                          setPendingCustomTime((prev) => ({
                            ...prev,
                            [index]: "",
                          }));
                          setPendingCustomKeys(
                            (prev) => new Set([...prev, index]),
                          );
                        }}
                        className="flex items-center gap-1 rounded-lg border-2 border-dashed border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
                      >
                        <Plus className="size-3" />
                        Custom time
                      </button>
                    )}
                  </div>
                </div>

                {/* Given with — how the medication is administered */}
                <div className="space-y-2">
                  <Label className="text-[11px]">
                    <HandHeart className="mr-1 inline size-3" />
                    How do you give this medication?
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {GIVEN_WITH_OPTIONS.map((opt) => {
                      const active = item.givenWith === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            updateMed(index, {
                              givenWith: active
                                ? undefined
                                : (opt.value as MedGivenWith),
                              ...(active ? { givenWithNotes: undefined } : {}),
                            })
                          }
                          className={cn(
                            "rounded-lg border-2 px-2.5 py-1.5 text-xs font-medium transition-all",
                            active
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                              : "border-border hover:border-emerald-200",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {item.givenWith === "other" && (
                    <Input
                      value={item.givenWithNotes ?? ""}
                      onChange={(e) =>
                        updateMed(index, { givenWithNotes: e.target.value })
                      }
                      placeholder="Describe how you give this medication..."
                      className="h-8 text-xs"
                    />
                  )}
                  {item.givenWith && item.givenWith !== "other" && (
                    <Input
                      value={item.givenWithNotes ?? ""}
                      onChange={(e) =>
                        updateMed(index, { givenWithNotes: e.target.value })
                      }
                      placeholder="Any additional notes (optional)..."
                      className="h-8 text-xs"
                    />
                  )}
                </div>

                {/* Facility-provided medication aid */}
                {FACILITY_AID_ITEMS.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[11px]">
                      Need the facility to provide something to give medication
                      with?
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {FACILITY_AID_ITEMS.map((aidItem) => {
                        const active =
                          item.facilityProvidesMedAid &&
                          item.facilityMedAidItem === aidItem.id;
                        return (
                          <button
                            key={aidItem.id}
                            type="button"
                            onClick={() =>
                              updateMed(index, {
                                facilityProvidesMedAid: !active,
                                facilityMedAidItem: active
                                  ? undefined
                                  : aidItem.id,
                              })
                            }
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-xs font-medium transition-all",
                              active
                                ? "border-blue-400 bg-blue-50 text-blue-700"
                                : "border-border hover:border-blue-200",
                            )}
                          >
                            {aidItem.name}
                            {aidItem.fee > 0 && (
                              <span className="text-muted-foreground text-[10px]">
                                +${aidItem.fee.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {item.facilityProvidesMedAid && (
                        <button
                          type="button"
                          onClick={() =>
                            updateMed(index, {
                              facilityProvidesMedAid: false,
                              facilityMedAidItem: undefined,
                            })
                          }
                          className="rounded-lg border-2 border-dashed border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
                        >
                          No, I&apos;ll bring my own
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Drug allergies */}
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Drug allergies</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(item.drugAllergies ?? []).map((a, ai) => (
                      <span
                        key={ai}
                        className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700"
                      >
                        <ShieldAlert className="size-3" />
                        {a}
                        <button
                          type="button"
                          onClick={() =>
                            updateMed(index, {
                              drugAllergies: (item.drugAllergies ?? []).filter(
                                (_, i) => i !== ai,
                              ),
                            })
                          }
                          className="ml-0.5 text-red-400 hover:text-red-700"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    <form
                      className="flex items-center"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = (
                          e.target as HTMLFormElement
                        ).querySelector("input") as HTMLInputElement;
                        const val = input.value.trim();
                        if (val && !(item.drugAllergies ?? []).includes(val)) {
                          updateMed(index, {
                            drugAllergies: [...(item.drugAllergies ?? []), val],
                          });
                          input.value = "";
                        }
                      }}
                    >
                      <Input
                        placeholder="+ Add allergy"
                        className="h-7 w-28 text-xs"
                      />
                    </form>
                  </div>
                </div>

                {/* Supply count + refill alert */}
                <div className="space-y-1.5">
                  <Label className="text-[11px]">
                    Supply brought (number of doses)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.supplyCount ?? ""}
                    onChange={(e) =>
                      updateMed(index, {
                        supplyCount: e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      })
                    }
                    placeholder="e.g. 10"
                    className="h-8 w-28 text-xs"
                  />
                  {item.supplyCount != null &&
                    item.supplyCount > 0 &&
                    (() => {
                      const dosesPerDay =
                        item.frequency === "twice_daily"
                          ? 2
                          : item.frequency === "every_8hrs"
                            ? 3
                            : item.times.length || 1;
                      const daysOfSupply = Math.floor(
                        item.supplyCount / dosesPerDay,
                      );
                      const isLow = daysOfSupply <= 3;
                      return (
                        <p
                          className={cn(
                            "text-[11px]",
                            isLow
                              ? "font-medium text-amber-700"
                              : "text-muted-foreground",
                          )}
                        >
                          {isLow && "⚠ "}
                          {item.supplyCount} doses = ~{daysOfSupply} day
                          {daysOfSupply !== 1 ? "s" : ""} of supply
                          {isLow ? " — may need refill" : ""}
                        </p>
                      );
                    })()}
                </div>

                {/* Notes */}
                <Textarea
                  value={item.notes}
                  onChange={(e) => updateMed(index, { notes: e.target.value })}
                  placeholder="Special instructions (e.g., hide in treat, give with food)..."
                  rows={2}
                  className="resize-none text-xs"
                />

                {/* Save to profile */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={item.parentConfirmed ?? false}
                    onChange={(e) =>
                      updateMed(index, { parentConfirmed: e.target.checked })
                    }
                    className="size-4 rounded-sm accent-blue-600"
                  />
                  <div>
                    <p className="text-xs font-medium text-blue-800">
                      Save to pet profile for future visits
                    </p>
                    <p className="text-[10px] text-blue-600">
                      This medication will auto-populate next time
                    </p>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        onClick={add}
        className="w-full gap-2 rounded-xl border-2 border-dashed py-5 text-sm"
      >
        <Plus className="size-4" />
        Add Medication
      </Button>
    </div>
  );
}
