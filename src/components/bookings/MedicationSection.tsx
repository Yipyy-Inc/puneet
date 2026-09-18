"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pill,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Ban,
  XCircle,
  Plus,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import type { MedicationEntry, MedicationItem } from "@/types/booking";
import type { MedForm, MedFrequency } from "@/types/base";
import { formatTime } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// The booking's medications and today's doses.
//
// Translated as it was touched. On the way: the form and frequency are named
// from the booking record's own ids rather than from English words built out
// of them; the times read in the viewer's clock; and the fallback that added a
// medication to this component's state — its doses stamped on a hardcoded
// 15 April 2026 — is gone, since the booking page always saves it (`onAdd`).
// ============================================================================

interface MedicationSectionProps {
  entries: MedicationEntry[];
  required?: boolean;
  /**
   * Whether staff may record a dose here — only when `onLog` is supplied,
   * since that is what makes it persist (the care log, 20260819140000).
   */
  canLog?: boolean;
  /**
   * Record a dose. The parent owns the write and the refetch; this panel says
   * which medication, which scheduled time, and how it went.
   */
  onLog?: (
    medicationId: string,
    scheduledAt: string,
    outcome: string,
    notes?: string,
  ) => void;
  /**
   * Save a medication onto the booking's own list (`booking.medications`).
   * Without it there is no "Add a medication" — it has nowhere to go.
   */
  onAdd?: (item: MedicationItem) => Promise<void>;
}

const FORM_KEYS: Record<MedForm, string> = {
  pill: "medFormPill",
  liquid: "medFormLiquid",
  topical: "medFormTopical",
  injection: "medFormInjection",
  powder: "medFormPowder",
  ear_drops: "medFormEarDrops",
  eye_drops: "medFormEyeDrops",
};
const FREQUENCY_KEYS: Record<MedFrequency, string> = {
  once_daily: "medFreqOnce",
  twice_daily: "medFreqTwice",
  every_8hrs: "medFreqEvery8",
  every_other_day: "medFreqOtherDay",
  specific_days: "medFreqSetDays",
  prn: "medFreqAsNeeded",
  other: "medFreqOther",
};
/** What the add form offers — the frequencies that need no further detail. */
const ADD_FREQUENCIES: MedFrequency[] = [
  "once_daily",
  "twice_daily",
  "every_8hrs",
  "every_other_day",
  "prn",
];

const DOSE_KEYS = {
  given: "journalOutcomeGiven",
  skipped: "journalOutcomeSkipped",
  refused: "journalOutcomeRefused",
  pending: "dosePending",
} as const;

const doseStatusIcon = {
  given: <CheckCircle2 className="text-success size-4" />,
  skipped: <Ban className="text-warning size-4" />,
  refused: <XCircle className="text-destructive size-4" />,
  pending: <Circle className="text-ink-disabled size-4" />,
};

const EMPTY_MED = {
  name: "",
  dosage: "",
  form: "pill" as MedForm,
  frequency: "once_daily" as MedFrequency,
  times: "08:00",
  instructions: "",
  isCritical: false,
};

export function MedicationSection({
  entries,
  required,
  canLog = true,
  onLog,
  onAdd,
}: MedicationSectionProps) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  // The booking's own list. It also merged the medication of FIXTURE
  // incidents matched by booking number — a real booking could show a
  // sample dog's prescription.
  const [meds, setMeds] = useState<MedicationEntry[]>(() => entries);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [notePopover, setNotePopover] = useState<string | null>(null);
  const [doseNote, setDoseNote] = useState("");
  const [newMed, setNewMed] = useState(EMPTY_MED);

  const formName = (med: MedicationEntry) =>
    med.formId ? t(FORM_KEYS[med.formId]) : med.method;
  const frequencyName = (med: MedicationEntry) =>
    med.frequencyId ? t(FREQUENCY_KEYS[med.frequencyId]) : med.frequency;

  const handleAdminister = (medId: string, doseIdx: number, notes?: string) => {
    setMeds((prev) =>
      prev.map((med) =>
        med.id === medId
          ? {
              ...med,
              doses: med.doses.map((d, i) =>
                i === doseIdx
                  ? {
                      ...d,
                      status: "given" as const,
                      administeredBy: t("loggedByYou"),
                      administeredAt: new Date().toISOString(),
                      notes: notes || d.notes,
                    }
                  : d,
              ),
            }
          : med,
      ),
    );
    // Optimistic, then authoritative — the parent writes it and refetches.
    const med = meds.find((m) => m.id === medId);
    const dose = med?.doses[doseIdx];
    if (med && dose) onLog?.(med.id, dose.scheduledAt, "given", notes);
  };

  const handleAddNote = (medId: string, doseIdx: number) => {
    setMeds((prev) =>
      prev.map((med) =>
        med.id === medId
          ? {
              ...med,
              doses: med.doses.map((d, i) =>
                i === doseIdx ? { ...d, notes: doseNote } : d,
              ),
            }
          : med,
      ),
    );
    setDoseNote("");
    setNotePopover(null);
    // A note on a dose that has not been given yet has nowhere to live —
    // `care_log_entries` records an EXECUTION — so this stays local. Giving
    // the dose sends the note along with it, which is the path that persists.
  };

  const handleAdd = async () => {
    if (!onAdd) return;
    if (!newMed.name.trim()) {
      toast.error(t("medNameRequired"));
      return;
    }
    const times = newMed.times
      .split(",")
      .map((time) => time.trim())
      .filter(Boolean);
    const item: MedicationItem = {
      id: `med-${crypto.randomUUID()}`,
      name: newMed.name.trim(),
      amount: newMed.dosage.trim(),
      form: newMed.form,
      frequency: newMed.frequency,
      times,
      adminInstructions: newMed.form === "powder" ? ["with_food"] : [],
      ifMissed: "call_parent",
      isHighRisk: newMed.isCritical || undefined,
      notes: newMed.instructions.trim(),
    };
    setSaving(true);
    try {
      await onAdd(item);
    } catch (error) {
      toast.error(t("medicationNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    } finally {
      setSaving(false);
    }
    setNewMed(EMPTY_MED);
    setAddOpen(false);
    toast.success(t("medicationAdded"));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-ink-tertiary flex items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
            <Pill className="size-4" />
            {t("medsTitle")}
            {required && (
              <Badge variant="destructive" className="normal-case">
                {t("taskRequired")}
              </Badge>
            )}
          </CardTitle>
          {canLog && onAdd && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(!addOpen)}
            >
              <Plus className="size-4" />
              {t("medAdd")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Inline add form */}
        <Collapsible open={addOpen} onOpenChange={setAddOpen}>
          <CollapsibleContent>
            <div className="border-line space-y-3 border-b py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="med-name" className="text-xs">
                    {t("medName")}
                  </Label>
                  <Input
                    id="med-name"
                    value={newMed.name}
                    onChange={(e) =>
                      setNewMed((p) => ({ ...p, name: e.target.value }))
                    }
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="med-dosage" className="text-xs">
                    {t("medDosage")}
                  </Label>
                  <Input
                    id="med-dosage"
                    value={newMed.dosage}
                    onChange={(e) =>
                      setNewMed((p) => ({ ...p, dosage: e.target.value }))
                    }
                    placeholder={t("medDosagePlaceholder")}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("medForm")}</Label>
                  <Select
                    value={newMed.form}
                    onValueChange={(v) =>
                      setNewMed((p) => ({ ...p, form: v as MedForm }))
                    }
                  >
                    <SelectTrigger
                      className="mt-1 text-sm"
                      aria-label={t("medForm")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FORM_KEYS) as MedForm[]).map((form) => (
                        <SelectItem key={form} value={form}>
                          {t(FORM_KEYS[form])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("medFrequency")}</Label>
                  <Select
                    value={newMed.frequency}
                    onValueChange={(v) =>
                      setNewMed((p) => ({ ...p, frequency: v as MedFrequency }))
                    }
                  >
                    <SelectTrigger
                      className="mt-1 text-sm"
                      aria-label={t("medFrequency")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADD_FREQUENCIES.map((frequency) => (
                        <SelectItem key={frequency} value={frequency}>
                          {t(FREQUENCY_KEYS[frequency])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="med-times" className="text-xs">
                    {t("medTimes")}
                  </Label>
                  <Input
                    id="med-times"
                    value={newMed.times}
                    onChange={(e) =>
                      setNewMed((p) => ({ ...p, times: e.target.value }))
                    }
                    placeholder="08:00, 20:00"
                    className="mt-1 text-sm tabular-nums"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newMed.isCritical}
                      onChange={(e) =>
                        setNewMed((p) => ({
                          ...p,
                          isCritical: e.target.checked,
                        }))
                      }
                      className="accent-primary"
                    />
                    <span className="text-body-ink font-semibold">
                      {t("medCriticalLabel")}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <Label htmlFor="med-instructions" className="text-xs">
                  {t("medInstructions")}
                </Label>
                <Textarea
                  id="med-instructions"
                  value={newMed.instructions}
                  onChange={(e) =>
                    setNewMed((p) => ({ ...p, instructions: e.target.value }))
                  }
                  placeholder={t("medInstructionsPlaceholder")}
                  className="mt-1 min-h-[50px] text-sm"
                  rows={2}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddOpen(false)}
                >
                  {t("notNow")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleAdd()}
                  loading={saving}
                >
                  {t("medAddConfirm")}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Entries */}
        {meds.length === 0 ? (
          <div className="py-6 text-center">
            <Pill className="text-ink-disabled mx-auto size-6" />
            <p className="text-ink-secondary mt-2 text-sm">{t("medsNone")}</p>
          </div>
        ) : (
          <div className="divide-line divide-y">
            {meds.map((med) => (
              <div key={med.id} className="py-4 first:pt-4">
                {/* Header */}
                <div className="flex items-start gap-2">
                  {med.isCritical && (
                    <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* The medication as the owner named it. */}
                      <span className="text-body-ink text-sm font-semibold">
                        {med.name}
                      </span>
                      {med.isCritical && (
                        <span className="bg-wash-warning text-warning rounded-full px-2 py-0.5 text-xs font-bold tracking-[.06em] uppercase">
                          {t("medCritical")}
                        </span>
                      )}
                    </div>
                    <div className="text-ink-secondary mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                      {med.dosage && (
                        <>
                          <span className="font-semibold">{med.dosage}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{formName(med)}</span>
                      <span>·</span>
                      <span>{frequencyName(med)}</span>
                    </div>
                    {med.purpose && (
                      <p className="text-ink-secondary mt-0.5 text-xs">
                        {fill("medPurpose", { purpose: med.purpose })}
                      </p>
                    )}
                    {med.instructions && (
                      <p
                        className={
                          med.isCritical
                            ? "border-warning text-body-ink mt-1.5 rounded-2xl border px-2.5 py-1.5 text-xs font-semibold"
                            : "border-line text-ink-secondary mt-1.5 rounded-2xl border px-2.5 py-1.5 text-xs"
                        }
                      >
                        {med.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Doses timeline */}
                <div className="mt-3 space-y-1.5 pl-1">
                  {med.doses.map((dose, idx) => {
                    const doseKey = `${med.id}-${idx}`;
                    return (
                      <div
                        key={idx}
                        className="border-line flex flex-wrap items-center gap-2.5 rounded-2xl border px-3 py-2"
                      >
                        {doseStatusIcon[dose.status]}
                        <div className="min-w-0 flex-1">
                          <span className="text-body-ink text-sm tabular-nums">
                            <Clock className="mr-1 inline size-4" />
                            {formatTime(dose.scheduledAt, locale)}
                          </span>
                          {dose.administeredBy && (
                            <span className="text-ink-tertiary ml-2 text-xs">
                              {dose.administeredAt
                                ? fill("doseByAt", {
                                    status: t(DOSE_KEYS[dose.status]),
                                    name: dose.administeredBy,
                                    time: formatTime(
                                      dose.administeredAt,
                                      locale,
                                    ),
                                  })
                                : fill("doseBy", {
                                    status: t(DOSE_KEYS[dose.status]),
                                    name: dose.administeredBy,
                                  })}
                            </span>
                          )}
                          {dose.skipReason && (
                            <span className="text-ink-tertiary ml-2 text-xs">
                              — {dose.skipReason}
                            </span>
                          )}
                          {dose.notes && (
                            <p className="text-ink-secondary mt-0.5 text-xs">
                              {fill("doseNote", { note: dose.notes })}
                            </p>
                          )}
                        </div>
                        {canLog && onLog && dose.status === "pending" && (
                          <div className="flex items-center gap-1">
                            {/* Note popover */}
                            <Popover
                              open={notePopover === doseKey}
                              onOpenChange={(open) => {
                                setNotePopover(open ? doseKey : null);
                                if (!open) setDoseNote("");
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t("doseAddNote")}
                                >
                                  <MessageSquare className="size-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="w-[240px] p-3"
                              >
                                <Textarea
                                  value={doseNote}
                                  onChange={(e) => setDoseNote(e.target.value)}
                                  placeholder={t("doseNotePlaceholder")}
                                  aria-label={t("doseAddNote")}
                                  className="min-h-[60px] text-sm"
                                  rows={2}
                                />
                                <Button
                                  size="sm"
                                  className="mt-2 w-full"
                                  onClick={() => handleAddNote(med.id, idx)}
                                >
                                  {t("doseKeepNote")}
                                </Button>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleAdminister(
                                  med.id,
                                  idx,
                                  doseNote || undefined,
                                )
                              }
                            >
                              <CheckCircle2 className="size-4" />
                              {fill("doseGive", { name: med.name })}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
