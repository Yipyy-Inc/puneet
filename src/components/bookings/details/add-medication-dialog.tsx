"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { bookingMutations } from "@/lib/api/booking";
import type { MedForm, MedFrequency } from "@/types/base";
import type { MedicationItem } from "@/types/booking";

import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// The Medications card's "+ Add" — the form MedicationSection carried inline,
// moved behind a dialog (2026-10-03). It writes the booking's own list
// (`booking.medications`), exactly as the page did: the Daily Care board, the
// kennel card and the care gate all read that list.
// ============================================================================

const FORM_KEYS: Partial<Record<MedForm, string>> = {
  pill: "medFormPill",
  liquid: "medFormLiquid",
  topical: "medFormTopical",
  injection: "medFormInjection",
  powder: "medFormPowder",
  ear_drops: "medFormEarDrops",
  eye_drops: "medFormEyeDrops",
};
const FREQUENCY_KEYS: Partial<Record<MedFrequency, string>> = {
  once_daily: "medFreqOnce",
  twice_daily: "medFreqTwice",
  every_8hrs: "medFreqEvery8",
  every_other_day: "medFreqOtherDay",
  prn: "medFreqAsNeeded",
};

const EMPTY = {
  name: "",
  dosage: "",
  form: "pill" as MedForm,
  frequency: "once_daily" as MedFrequency,
  times: "08:00",
  instructions: "",
  isCritical: false,
};

export function AddMedicationDialog({
  d,
  open,
  onOpenChange,
}: {
  d: BookingDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = d.text;
  const queryClient = useQueryClient();
  const [med, setMed] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const booking = d.booking;
  if (!booking) return null;

  const save = async () => {
    if (!med.name.trim()) {
      toast.error(t("medNameRequired"));
      return;
    }
    const item: MedicationItem = {
      id: `med-${crypto.randomUUID()}`,
      name: med.name.trim(),
      amount: med.dosage.trim(),
      form: med.form,
      frequency: med.frequency,
      times: med.times
        .split(",")
        .map((time) => time.trim())
        .filter(Boolean),
      adminInstructions: med.form === "powder" ? ["with_food"] : [],
      ifMissed: "call_parent",
      isHighRisk: med.isCritical || undefined,
      notes: med.instructions.trim(),
    };
    setSaving(true);
    try {
      await bookingMutations.update(booking.id, {
        medications: [...(booking.medications ?? []), item],
      });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (error) {
      toast.error(t("medicationNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    } finally {
      setSaving(false);
    }
    setMed(EMPTY);
    onOpenChange(false);
    toast.success(t("medicationAdded"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addMedication")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-med-name">{t("medName")}</Label>
            <Input
              id="add-med-name"
              value={med.name}
              onChange={(e) => setMed((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-med-dose">{t("medDosage")}</Label>
            <Input
              id="add-med-dose"
              value={med.dosage}
              placeholder={t("medDosagePlaceholder")}
              onChange={(e) =>
                setMed((p) => ({ ...p, dosage: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("medForm")}</Label>
            <Select
              value={med.form}
              onValueChange={(v) =>
                setMed((p) => ({ ...p, form: v as MedForm }))
              }
            >
              <SelectTrigger aria-label={t("medForm")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FORM_KEYS) as MedForm[]).map((form) => (
                  <SelectItem key={form} value={form}>
                    {t(FORM_KEYS[form] ?? "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("medFrequency")}</Label>
            <Select
              value={med.frequency}
              onValueChange={(v) =>
                setMed((p) => ({ ...p, frequency: v as MedFrequency }))
              }
            >
              <SelectTrigger aria-label={t("medFrequency")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQUENCY_KEYS) as MedFrequency[]).map(
                  (frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {t(FREQUENCY_KEYS[frequency] ?? "")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-med-times">{t("medTimes")}</Label>
            <Input
              id="add-med-times"
              value={med.times}
              placeholder="08:00, 20:00"
              className="tabular-nums"
              onChange={(e) => setMed((p) => ({ ...p, times: e.target.value }))}
            />
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-2 self-end text-[14px] font-semibold">
            <input
              type="checkbox"
              checked={med.isCritical}
              onChange={(e) =>
                setMed((p) => ({ ...p, isCritical: e.target.checked }))
              }
              className="accent-primary size-4"
            />
            {t("medCriticalLabel")}
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-med-instructions">{t("medInstructions")}</Label>
          <Textarea
            id="add-med-instructions"
            rows={2}
            value={med.instructions}
            placeholder={t("medInstructionsPlaceholder")}
            onChange={(e) =>
              setMed((p) => ({ ...p, instructions: e.target.value }))
            }
          />
        </div>
        <DialogFooter>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            {t("notNow")}
          </Button>
          <Button
            variant="bd-cta"
            onClick={() => void save()}
            disabled={saving}
            data-loading={saving || undefined}
          >
            {t("addMedication")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
