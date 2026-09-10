"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  X,
  Pill,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MedicationItem, YipyyGoFormSectionProps } from "@/types/yipyygo";
import { getFormTemplateForService } from "@/data/yipyygo-config";
import type {
  MedForm,
  MedFrequency,
  MedAdminInstruction,
  MissedDoseAction,
} from "@/types/booking";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatMoney, formatTimeOfDay } from "@/lib/i18n/format";

type MedicationSectionProps = YipyyGoFormSectionProps;

// ── Constants ──────────────────────────────────────────────────────────────────

// Option tables carry CATALOGUE KEYS; the value stored is `value`.
const MED_FORMS: { value: MedForm; labelKey: string }[] = [
  { value: "pill", labelKey: "formPill" },
  { value: "liquid", labelKey: "formLiquid" },
  { value: "topical", labelKey: "formTopical" },
  { value: "injection", labelKey: "formInjection" },
  { value: "powder", labelKey: "formPowder" },
  { value: "ear_drops", labelKey: "formEarDrops" },
  { value: "eye_drops", labelKey: "formEyeDrops" },
];

const MED_FREQUENCIES: { value: MedFrequency; labelKey: string }[] = [
  { value: "once_daily", labelKey: "freqOnceDaily" },
  { value: "twice_daily", labelKey: "freqTwiceDaily" },
  { value: "every_8hrs", labelKey: "freqEvery8Hours" },
  { value: "every_other_day", labelKey: "freqEveryOtherDay" },
  { value: "specific_days", labelKey: "freqSpecificDays" },
  { value: "prn", labelKey: "freqAsNeeded" },
  { value: "other", labelKey: "other" },
];

const ADMIN_INSTRUCTIONS: { value: MedAdminInstruction; labelKey: string }[] = [
  { value: "with_food", labelKey: "adminWithFood" },
  { value: "empty_stomach", labelKey: "adminEmptyStomach" },
  { value: "hide_in_treat", labelKey: "adminHideInTreat" },
  { value: "crush_and_mix", labelKey: "adminCrushAndMix" },
  { value: "give_whole", labelKey: "adminGiveWhole" },
  { value: "after_cleaning", labelKey: "adminAfterCleaningEars" },
  { value: "refrigerate", labelKey: "adminRefrigerate" },
];

const MISSED_DOSE_OPTIONS: { value: MissedDoseAction; labelKey: string }[] = [
  { value: "skip_continue", labelKey: "missedSkip" },
  { value: "give_when_remembered", labelKey: "missedGiveWhenRemembered" },
  { value: "call_parent", labelKey: "callMe" },
  { value: "do_not_double", labelKey: "missedDoNotDouble" },
];

const COMMON_MED_TIMES = ["08:00", "12:00", "18:00", "20:00"];

const HIGH_RISK_KEYWORDS = [
  "insulin",
  "seizure",
  "phenobarbital",
  "prednisone",
  "thyroid",
  "heart",
  "blood pressure",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function isLikelyHighRisk(name: string): boolean {
  const lower = name.toLowerCase();
  return HIGH_RISK_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MedicationSection({
  formData,
  updateFormData,
  config,
  booking,
  onNext,
  onBack,
  isLastSection,
}: MedicationSectionProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const [expandedMed, setExpandedMed] = useState<string | null>(
    formData.medications.length > 0 ? formData.medications[0].id : null,
  );
  const effectiveTemplate = config
    ? getFormTemplateForService(config, booking.service ?? "")
    : null;

  const handleNoMedicationsToggle = (checked: boolean) => {
    updateFormData({
      noMedications: checked,
      medications: checked ? [] : formData.medications,
    });
  };

  const addMedication = () => {
    const med: MedicationItem = {
      id: `med-${Date.now()}`,
      name: "",
      dosage: "",
      frequency: "once_daily",
      times: [],
      method: "with_food",
      form: "pill",
      adminInstructions: [],
      ifMissed: "skip_continue",
    };
    updateFormData({
      medications: [...formData.medications, med],
      noMedications: false,
    });
    setExpandedMed(med.id);
  };

  const removeMedication = (id: string) => {
    updateFormData({
      medications: formData.medications.filter((m) => m.id !== id),
    });
    if (expandedMed === id) setExpandedMed(null);
  };

  const updateMed = (id: string, updates: Partial<MedicationItem>) => {
    updateFormData({
      medications: formData.medications.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    });
  };

  const toggleAdminInstruction = (medId: string, val: MedAdminInstruction) => {
    const med = formData.medications.find((m) => m.id === medId);
    if (!med) return;
    const current = med.adminInstructions || [];
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    updateMed(medId, { adminInstructions: updated });
  };

  const addTime = (medId: string, time: string) => {
    const med = formData.medications.find((m) => m.id === medId);
    if (!med || med.times.includes(time)) return;
    updateMed(medId, { times: [...med.times, time] });
  };

  const removeTime = (medId: string, index: number) => {
    const med = formData.medications.find((m) => m.id === medId);
    if (!med) return;
    updateMed(medId, { times: med.times.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-red-50">
            <Pill className="h-4.5 w-4.5 text-red-600" />
          </div>
          <div>
            <CardTitle>{t("medicationInstructions")}</CardTitle>
            <CardDescription>
              {t("listMedicationsFor").replace("{pet}", formData.petName)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── No Medications Toggle ── */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-sm font-medium">{t("noMedications")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("petNotTakingMedications").replace("{pet}", formData.petName)}
            </p>
          </div>
          <Switch
            checked={formData.noMedications}
            onCheckedChange={handleNoMedicationsToggle}
          />
        </div>

        {/* ── Facility medication fee ── */}
        {!formData.noMedications && config?.medicationFee?.enabled && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/20">
            <div className="flex items-start gap-2">
              <DollarSign className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {t("feeLabelAmount")
                    .replace(
                      "{label}",
                      config.medicationFee.label ?? t("medicationAdminFee"),
                    )
                    .replace(
                      "{amount}",
                      formatMoney(config.medicationFee.amount, locale),
                    )}{" "}
                  <span className="font-normal">
                    {config.medicationFee.billing === "per_dose" &&
                      t("feePerDose")}
                    {config.medicationFee.billing === "per_day" &&
                      t("feePerDay")}
                    {config.medicationFee.billing === "per_stay" &&
                      t("feePerStay")}
                  </span>
                </p>
                {config.medicationFee.description && (
                  <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
                    {config.medicationFee.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!formData.noMedications && (
          <>
            {/* ── Medication Cards ── */}
            {formData.medications.map((med) => {
              const isExpanded = expandedMed === med.id;
              const autoHighRisk = isLikelyHighRisk(med.name);
              const showHighRisk = med.isHighRisk || autoHighRisk;

              return (
                <div
                  key={med.id}
                  className={cn(
                    "rounded-lg border transition-colors",
                    showHighRisk
                      ? "border-red-200 bg-red-50/30"
                      : isExpanded
                        ? "border-violet-200 bg-violet-50/20"
                        : "border-input",
                  )}
                >
                  {/* Card header */}
                  <div
                    className="flex cursor-pointer items-center justify-between px-4 py-3"
                    onClick={() => setExpandedMed(isExpanded ? null : med.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          `flex size-8 items-center justify-center rounded-full`,
                          showHighRisk ? "bg-red-100" : "bg-violet-100",
                        )}
                      >
                        <Pill
                          className={cn(
                            "size-3.5",
                            showHighRisk ? "text-red-600" : "text-violet-600",
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {med.name || t("newMedication")}
                          </span>
                          {showHighRisk && (
                            <Badge
                              variant="destructive"
                              className="px-1.5 py-0 text-[10px]"
                            >
                              <ShieldAlert className="mr-0.5 size-3" />
                              {t("highRisk")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          {med.dosage && <span>{med.dosage}</span>}
                          {med.strength && <span>&middot; {med.strength}</span>}
                          {med.frequency && (
                            <span>
                              &middot;{" "}
                              {(() => {
                                const freq = MED_FREQUENCIES.find(
                                  (f) => f.value === med.frequency,
                                );
                                return freq ? t(freq.labelKey) : med.frequency;
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMedication(med.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="text-muted-foreground size-4" />
                      ) : (
                        <ChevronDown className="text-muted-foreground size-4" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-border space-y-4 border-t px-4 pb-4">
                      {/* Name + Purpose */}
                      <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t("medicationName")}
                          </Label>
                          <Input
                            value={med.name}
                            onChange={(e) =>
                              updateMed(med.id, { name: e.target.value })
                            }
                            placeholder={t("eGApoquel")}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("purpose")}</Label>
                          <Input
                            value={med.purpose || ""}
                            onChange={(e) =>
                              updateMed(med.id, { purpose: e.target.value })
                            }
                            placeholder={t("eGAllergyJointHeart")}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Dosing section */}
                      <div className="space-y-3 rounded-md border bg-white p-3">
                        <h5 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          {t("dosage")}
                        </h5>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Amount *</Label>
                            <Input
                              value={med.dosage}
                              onChange={(e) =>
                                updateMed(med.id, { dosage: e.target.value })
                              }
                              placeholder={t("eG1Tablet")}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("strength")}</Label>
                            <Input
                              value={med.strength || ""}
                              onChange={(e) =>
                                updateMed(med.id, { strength: e.target.value })
                              }
                              placeholder="e.g., 16mg"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">{t("form")}</Label>
                            <Select
                              value={med.form || "pill"}
                              onValueChange={(v) =>
                                updateMed(med.id, { form: v as MedForm })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MED_FORMS.map((f) => (
                                  <SelectItem key={f.value} value={f.value}>
                                    {t(f.labelKey)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {med.form === "liquid" && (
                          <p className="text-muted-foreground text-xs">
                            {t("useMlForLiquidDosage")}
                          </p>
                        )}
                        {(med.form === "ear_drops" ||
                          med.form === "eye_drops") && (
                          <p className="text-muted-foreground text-xs">
                            {t("specifyDropsHint")}
                          </p>
                        )}
                      </div>

                      {/* Timing section */}
                      <div className="space-y-3 rounded-md border bg-white p-3">
                        <h5 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          {t("schedule")}
                        </h5>
                        <div className="space-y-2">
                          <Label className="text-xs">{t("frequency")}</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {MED_FREQUENCIES.map((freq) => (
                              <button
                                key={freq.value}
                                type="button"
                                onClick={() =>
                                  updateMed(med.id, { frequency: freq.value })
                                }
                                className={cn(
                                  `rounded-full border px-3 py-1 text-xs font-medium transition-colors`,
                                  med.frequency === freq.value
                                    ? `border-violet-300 bg-violet-50 text-violet-700`
                                    : `border-input text-muted-foreground hover:bg-muted/50`,
                                )}
                              >
                                {t(freq.labelKey)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {med.frequency === "other" && (
                          <Input
                            value={med.frequencyNotes || ""}
                            onChange={(e) =>
                              updateMed(med.id, {
                                frequencyNotes: e.target.value,
                              })
                            }
                            placeholder={t("describeSchedule")}
                            className="h-8 text-xs"
                          />
                        )}

                        {med.frequency === "prn" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {t("maxTimesPerDay")}
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={med.prnMaxPerDay || ""}
                                onChange={(e) =>
                                  updateMed(med.id, {
                                    prnMaxPerDay:
                                      parseInt(e.target.value) || undefined,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {t("triggerReason")}
                              </Label>
                              <Input
                                value={med.prnTrigger || ""}
                                onChange={(e) =>
                                  updateMed(med.id, {
                                    prnTrigger: e.target.value,
                                  })
                                }
                                placeholder={t("eGItchingAnxiety")}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {/* Times */}
                        <div className="space-y-2">
                          <Label className="text-xs">
                            {t("administrationTimes")}
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {COMMON_MED_TIMES.map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => addTime(med.id, time)}
                                disabled={med.times.includes(time)}
                                className="border-input hover:bg-muted/50 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40"
                              >
                                + {formatTimeOfDay(time, locale)}
                              </button>
                            ))}
                            <Input
                              type="time"
                              className="h-7 w-28 text-xs"
                              onBlur={(e) => {
                                if (e.target.value) {
                                  addTime(med.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                            />
                          </div>
                          {med.times.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {med.times.map((time, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs text-violet-700"
                                >
                                  <Clock className="size-3" />
                                  {formatTimeOfDay(time, locale)}
                                  <button
                                    type="button"
                                    onClick={() => removeTime(med.id, idx)}
                                  >
                                    <X className="size-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Administration instructions */}
                      <div className="space-y-3 rounded-md border bg-white p-3">
                        <h5 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          {t("howToGive")}
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {ADMIN_INSTRUCTIONS.map((inst) => {
                            const active = (
                              med.adminInstructions || []
                            ).includes(inst.value);
                            return (
                              <button
                                key={inst.value}
                                type="button"
                                onClick={() =>
                                  toggleAdminInstruction(med.id, inst.value)
                                }
                                className={cn(
                                  `rounded-full border px-3 py-1 text-xs font-medium transition-colors`,
                                  active
                                    ? "border-teal-300 bg-teal-50 text-teal-700"
                                    : `border-input text-muted-foreground hover:bg-muted/50`,
                                )}
                              >
                                {t(inst.labelKey)}
                              </button>
                            );
                          })}
                        </div>
                        <Input
                          value={med.adminNotes || ""}
                          onChange={(e) =>
                            updateMed(med.id, { adminNotes: e.target.value })
                          }
                          placeholder={t("otherAdministrationNotes")}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* If dose is missed */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          {t("ifADoseIsMissed")}
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {MISSED_DOSE_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                updateMed(med.id, { ifMissed: opt.value })
                              }
                              className={cn(
                                `rounded-full border px-3 py-1 text-xs font-medium transition-colors`,
                                med.ifMissed === opt.value
                                  ? `border-amber-300 bg-amber-50 text-amber-700`
                                  : `border-input text-muted-foreground hover:bg-muted/50`,
                              )}
                            >
                              {t(opt.labelKey)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Safety: high risk + confirmation */}
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <Label className="text-xs font-medium">
                            {t("highRiskMedication")}
                          </Label>
                          <p className="text-muted-foreground text-[11px]">
                            {t("highRiskHint")}
                          </p>
                        </div>
                        <Switch
                          checked={med.isHighRisk || false}
                          onCheckedChange={(checked) =>
                            updateMed(med.id, { isHighRisk: checked })
                          }
                        />
                      </div>

                      {/* Photo upload */}
                      {effectiveTemplate?.features.photoUploads && (
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t("photoOfMedicationLabelOptional")}
                          </Label>
                          <Input
                            type="file"
                            accept="image/*"
                            className="h-9 text-xs"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                updateMed(med.id, {
                                  photoUrl: URL.createObjectURL(file),
                                });
                              }
                            }}
                          />
                          {med.photoUrl && (
                            <Image
                              src={med.photoUrl}
                              alt={t("medicationLabelPhoto")}
                              width={112}
                              height={112}
                              className="mt-2 h-28 w-28 rounded-sm border object-cover"
                              unoptimized
                            />
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      <Input
                        value={med.methodNotes || ""}
                        onChange={(e) =>
                          updateMed(med.id, { methodNotes: e.target.value })
                        }
                        placeholder={t("additionalNotesForThisMedication")}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add medication button */}
            <Button
              type="button"
              variant="outline"
              onClick={addMedication}
              className="w-full"
            >
              <Plus className="mr-2 size-4" />
              {t("addMedication")}
            </Button>

            {/* Parent confirmation */}
            {formData.medications.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <Checkbox
                  id="med-confirm"
                  checked={formData.medications.every((m) => m.parentConfirmed)}
                  onCheckedChange={(checked) => {
                    updateFormData({
                      medications: formData.medications.map((m) => ({
                        ...m,
                        parentConfirmed: !!checked,
                      })),
                    });
                  }}
                />
                <div>
                  <Label
                    htmlFor="med-confirm"
                    className="cursor-pointer text-sm font-medium"
                  >
                    {t("iConfirmAllMedicationDosages")}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("verifyEachMedication")}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            {t("back")}
          </Button>
          <Button onClick={onNext}>
            {isLastSection ? t("review") : t("next")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
