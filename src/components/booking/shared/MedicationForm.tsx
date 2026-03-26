"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MedicationItem,
  MedForm,
  MedFrequency,
  MedAdminInstruction,
  MissedDoseAction,
} from "@/lib/types";

export interface PetOption {
  id: number;
  name: string;
  type?: string;
}

interface MedicationFormProps {
  medications: MedicationItem[];
  setMedications: (medications: MedicationItem[]) => void;
  selectedPets: PetOption[];
  compact?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MED_FORMS: { value: MedForm; label: string }[] = [
  { value: "pill", label: "Pill / Tablet" },
  { value: "liquid", label: "Liquid" },
  { value: "topical", label: "Topical" },
  { value: "injection", label: "Injection" },
  { value: "powder", label: "Powder" },
  { value: "ear_drops", label: "Ear Drops" },
  { value: "eye_drops", label: "Eye Drops" },
];

const MED_FREQUENCIES: { value: MedFrequency; label: string }[] = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "every_8hrs", label: "Every 8 hrs" },
  { value: "every_other_day", label: "Every other day" },
  { value: "specific_days", label: "Specific days" },
  { value: "prn", label: "PRN (As needed)" },
  { value: "other", label: "Other" },
];

const ADMIN_INSTRUCTIONS: { value: MedAdminInstruction; label: string }[] = [
  { value: "with_food", label: "With food" },
  { value: "empty_stomach", label: "Empty stomach" },
  { value: "hide_in_treat", label: "Hide in treat" },
  { value: "crush_and_mix", label: "Crush & mix" },
  { value: "give_whole", label: "Give whole" },
  { value: "after_cleaning", label: "After cleaning" },
  { value: "refrigerate", label: "Refrigerate" },
];

const MISSED_DOSE_OPTIONS: { value: MissedDoseAction; label: string }[] = [
  { value: "skip_continue", label: "Skip, continue next" },
  { value: "give_when_remembered", label: "Give when remembered" },
  { value: "call_parent", label: "Call owner" },
  { value: "do_not_double", label: "Do not double" },
];

const COMMON_TIMES = ["08:00", "12:00", "18:00", "20:00"];

const HIGH_RISK_KEYWORDS = [
  "insulin",
  "seizure",
  "phenobarbital",
  "prednisone",
  "thyroid",
  "heart",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(time: string) {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time;
  }
}

function isLikelyHighRisk(name: string): boolean {
  return HIGH_RISK_KEYWORDS.some((kw) => name.toLowerCase().includes(kw));
}

function createEmptyItem(defaultPetId?: number): MedicationItem {
  return {
    id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    petId: defaultPetId,
    name: "",
    amount: "",
    form: "pill",
    frequency: "once_daily",
    times: [],
    adminInstructions: [],
    ifMissed: "skip_continue",
    notes: "",
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MedicationForm({
  medications,
  setMedications,
  selectedPets,
}: MedicationFormProps) {
  const [expandedMed, setExpandedMed] = useState<string | null>(
    medications.length > 0 ? medications[0].id : null,
  );

  const updateMed = (index: number, patch: Partial<MedicationItem>) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], ...patch };
    setMedications(updated);
  };

  const add = () => {
    const item = createEmptyItem(
      selectedPets.length === 1 ? selectedPets[0].id : undefined,
    );
    setMedications([...medications, item]);
    setExpandedMed(item.id);
  };

  const remove = (index: number) => {
    const removed = medications[index];
    setMedications(medications.filter((_, i) => i !== index));
    if (expandedMed === removed.id) setExpandedMed(null);
  };

  const addTime = (index: number, time: string) => {
    const item = medications[index];
    if (item.times.includes(time)) return;
    updateMed(index, { times: [...item.times, time] });
  };

  const removeTime = (index: number, timeIdx: number) => {
    const item = medications[index];
    updateMed(index, { times: item.times.filter((_, i) => i !== timeIdx) });
  };

  const toggleAdmin = (index: number, val: MedAdminInstruction) => {
    const item = medications[index];
    const current = item.adminInstructions || [];
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    updateMed(index, { adminInstructions: updated });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Medication Instructions</h4>
      <div className="space-y-3">
        {medications.map((item, index) => {
          const isExpanded = expandedMed === item.id;
          const showHighRisk = item.isHighRisk || isLikelyHighRisk(item.name);

          return (
            <Card
              key={item.id}
              className={cn(showHighRisk && "border-red-200")}
            >
              <CardContent className="space-y-4 pt-4">
                {/* Header */}
                <div
                  className="flex cursor-pointer items-start justify-between"
                  onClick={() => setExpandedMed(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        showHighRisk ? "bg-red-100" : "bg-violet-100",
                      )}
                    >
                      <Pill
                        className={cn(
                          "h-3.5 w-3.5",
                          showHighRisk ? "text-red-600" : "text-violet-600",
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">
                          {item.name || "New Medication"}
                        </h4>
                        {showHighRisk && (
                          <Badge
                            variant="destructive"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            <ShieldAlert className="mr-0.5 h-2.5 w-2.5" />
                            High Risk
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {item.amount}
                        {item.strength
                          ? ` (${item.strength})`
                          : ""} &middot;{" "}
                        {MED_FREQUENCIES.find((f) => f.value === item.frequency)
                          ?.label || item.frequency}
                        {item.times.length > 0 &&
                          ` &middot; ${item.times.length} times`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(index);
                      }}
                      className="text-destructive hover:text-destructive text-xs"
                    >
                      Remove
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="text-muted-foreground size-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground size-4" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4">
                    {/* Pet select */}
                    {selectedPets.length > 1 && (
                      <Select
                        value={item.petId?.toString() ?? ""}
                        onValueChange={(v) =>
                          updateMed(index, { petId: parseInt(v, 10) })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select pet" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPets.map((pet) => (
                            <SelectItem key={pet.id} value={pet.id.toString()}>
                              {pet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Name + Purpose */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Name *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateMed(index, { name: e.target.value })
                          }
                          placeholder="e.g., Apoquel"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Purpose</Label>
                        <Input
                          value={item.purpose || ""}
                          onChange={(e) =>
                            updateMed(index, { purpose: e.target.value })
                          }
                          placeholder="e.g., Allergy"
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Dosing */}
                    <div className="bg-muted/30 space-y-3 rounded-lg p-3">
                      <h5 className="text-muted-foreground text-xs font-medium">
                        Dosage
                      </h5>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Amount *</Label>
                          <Input
                            value={item.amount}
                            onChange={(e) =>
                              updateMed(index, { amount: e.target.value })
                            }
                            placeholder="1 tablet"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Strength</Label>
                          <Input
                            value={item.strength || ""}
                            onChange={(e) =>
                              updateMed(index, { strength: e.target.value })
                            }
                            placeholder="16mg"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
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
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="bg-muted/30 space-y-3 rounded-lg p-3">
                      <h5 className="text-muted-foreground text-xs font-medium">
                        Schedule
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {MED_FREQUENCIES.map((freq) => (
                          <button
                            key={freq.value}
                            type="button"
                            onClick={() =>
                              updateMed(index, { frequency: freq.value })
                            }
                            className={cn(
                              `rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors`,
                              item.frequency === freq.value
                                ? `border-violet-300 bg-violet-50 text-violet-700`
                                : `border-input hover:bg-muted/50`,
                            )}
                          >
                            {freq.label}
                          </button>
                        ))}
                      </div>

                      {item.frequency === "prn" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Max per day</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.prnMaxPerDay || ""}
                              onChange={(e) =>
                                updateMed(index, {
                                  prnMaxPerDay:
                                    parseInt(e.target.value) || undefined,
                                })
                              }
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Trigger</Label>
                            <Input
                              value={item.prnTrigger || ""}
                              onChange={(e) =>
                                updateMed(index, { prnTrigger: e.target.value })
                              }
                              placeholder="e.g., Itching"
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Times */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Times</Label>
                        <div className="flex flex-wrap gap-1">
                          {COMMON_TIMES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => addTime(index, t)}
                              disabled={item.times.includes(t)}
                              className="border-input hover:bg-muted/50 rounded-full border px-2 py-0.5 text-[11px] disabled:opacity-40"
                            >
                              + {formatTime(t)}
                            </button>
                          ))}
                          <Input
                            type="time"
                            className="h-6 w-24 text-[11px]"
                            onBlur={(e) => {
                              if (e.target.value) {
                                addTime(index, e.target.value);
                                e.target.value = "";
                              }
                            }}
                          />
                        </div>
                        {item.times.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.times.map((t, ti) => (
                              <span
                                key={ti}
                                className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-700"
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {formatTime(t)}
                                <button
                                  type="button"
                                  onClick={() => removeTime(index, ti)}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin instructions */}
                    <div className="bg-muted/30 space-y-2 rounded-lg p-3">
                      <h5 className="text-muted-foreground text-xs font-medium">
                        Administration
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {ADMIN_INSTRUCTIONS.map((inst) => {
                          const active = (
                            item.adminInstructions || []
                          ).includes(inst.value);
                          return (
                            <button
                              key={inst.value}
                              type="button"
                              onClick={() => toggleAdmin(index, inst.value)}
                              className={cn(
                                `rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors`,
                                active
                                  ? "border-teal-300 bg-teal-50 text-teal-700"
                                  : `border-input hover:bg-muted/50`,
                              )}
                            >
                              {inst.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* If missed */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        If Dose Missed
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {MISSED_DOSE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              updateMed(index, { ifMissed: opt.value })
                            }
                            className={cn(
                              `rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors`,
                              item.ifMissed === opt.value
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : `border-input hover:bg-muted/50`,
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* High risk toggle */}
                    <div className="flex items-center justify-between rounded-md border p-2.5">
                      <div>
                        <Label className="text-xs font-medium">
                          High-risk medication
                        </Label>
                        <p className="text-muted-foreground text-[10px]">
                          Extra caution required
                        </p>
                      </div>
                      <Switch
                        checked={item.isHighRisk || false}
                        onCheckedChange={(checked) =>
                          updateMed(index, { isHighRisk: checked })
                        }
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Notes</Label>
                      <Input
                        value={item.notes}
                        onChange={(e) =>
                          updateMed(index, { notes: e.target.value })
                        }
                        placeholder="Additional medication notes..."
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Button
          type="button"
          variant="outline"
          onClick={add}
          className="w-full"
        >
          <Plus className="mr-2 size-4" />
          Add Medication
        </Button>
      </div>
    </div>
  );
}
