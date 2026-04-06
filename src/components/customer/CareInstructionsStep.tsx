"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UtensilsCrossed,
  Pill,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { facilityConfig } from "@/data/facility-config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CustomerFeedingEntry {
  id: string;
  label: string;
  time: string;
  amount: string;
  unit: string;
  foodType: string;
  feedingInstruction: string;
  instructions: string;
  saveToProfile?: boolean;
}

export interface CustomerMedicationEntry {
  id: string;
  name: string;
  dosage: string;
  method: string;
  frequency: string;
  times: string[];
  instructions: string;
  isCritical: boolean;
  supplyCount?: number;
  drugAllergies?: string[];
  saveToProfile?: boolean;
}

interface CareInstructionsStepProps {
  feedingEntries: CustomerFeedingEntry[];
  onFeedingChange: (entries: CustomerFeedingEntry[]) => void;
  medicationEntries: CustomerMedicationEntry[];
  onMedicationChange: (entries: CustomerMedicationEntry[]) => void;
  petNames: string[];
  mode?: "feeding" | "medication" | "both";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}-${_id}`;
}

// Read from facility config (editable in Settings > Care Tasks)
const fOpts = facilityConfig.feedingOptions;
const mOpts = facilityConfig.medicationOptions;
const MEAL_LABELS = fOpts.schedules.map((s) => s.label);
const FEEDING_UNITS = fOpts.units;
const FEEDING_INSTRUCTIONS_OPTIONS = fOpts.instructions;
const FOOD_TYPES = fOpts.foodTypes;
const MED_METHODS = mOpts.methods;
const FREQUENCIES = mOpts.frequencies;

// ── Component ────────────────────────────────────────────────────────────────

export function CareInstructionsStep({
  feedingEntries,
  onFeedingChange,
  medicationEntries,
  onMedicationChange,
  petNames,
  mode = "both",
}: CareInstructionsStepProps) {
  const petLabel =
    petNames.length === 1
      ? petNames[0]
      : `your pet${petNames.length > 1 ? "s" : ""}`;

  const showFeeding = mode === "both" || mode === "feeding";
  const showMedication = mode === "both" || mode === "medication";

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div>
        <h3 className="text-lg font-semibold">
          {mode === "feeding"
            ? "Feeding Schedule"
            : mode === "medication"
              ? "Medication"
              : "Care Instructions"}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "feeding"
            ? `Add meal times, portions, and food type for ${petLabel} so our staff knows exactly what to serve.`
            : mode === "medication"
              ? `Add any medications ${petLabel} needs during their stay so our staff can administer them on schedule.`
              : `Help us take the best care of ${petLabel}. Add feeding schedules and any medications so our staff knows exactly what's needed.`}
        </p>
      </div>

      {/* ── Feeding ── */}
      {showFeeding && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
                <UtensilsCrossed className="text-primary size-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Feeding Schedule</h4>
                <p className="text-muted-foreground text-xs">
                  Meal times, portions, and food type
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                onFeedingChange([
                  ...feedingEntries,
                  {
                    id: nextId("cf"),
                    label:
                      MEAL_LABELS[
                        Math.min(feedingEntries.length, MEAL_LABELS.length - 1)
                      ],
                    time: feedingEntries.length === 0 ? "08:00" : "18:00",
                    amount: "",
                    unit: "",
                    foodType: "",
                    feedingInstruction: "",
                    instructions: "",
                  },
                ]);
              }}
            >
              <Plus className="size-3.5" />
              Add Meal
            </Button>
          </div>

          {feedingEntries.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-8">
                <UtensilsCrossed className="text-muted-foreground/30 size-8" />
                <p className="text-muted-foreground mt-2 text-sm">
                  No feeding instructions added
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  Click &quot;Add Meal&quot; if {petLabel} has a specific
                  feeding schedule
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {feedingEntries.map((entry, idx) => (
                <FeedingCard
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  onChange={(updated) => {
                    const next = [...feedingEntries];
                    next[idx] = updated;
                    onFeedingChange(next);
                  }}
                  onRemove={() => {
                    onFeedingChange(feedingEntries.filter((_, i) => i !== idx));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Medications ── */}
      {showMedication && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
                <Pill className="text-primary size-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Medications</h4>
                <p className="text-muted-foreground text-xs">
                  Medications your pet needs during their stay
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                onMedicationChange([
                  ...medicationEntries,
                  {
                    id: nextId("cm"),
                    name: "",
                    dosage: "",
                    method: "Oral",
                    frequency: "Once daily",
                    times: ["08:00"],
                    instructions: "",
                    isCritical: false,
                  },
                ]);
              }}
            >
              <Plus className="size-3.5" />
              Add Medication
            </Button>
          </div>

          {medicationEntries.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-8">
                <Pill className="text-muted-foreground/30 size-8" />
                <p className="text-muted-foreground mt-2 text-sm">
                  No medications added
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  Click &quot;Add Medication&quot; if {petLabel} takes any
                  medication
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {medicationEntries.map((entry, idx) => (
                <MedicationCard
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  onChange={(updated) => {
                    const next = [...medicationEntries];
                    next[idx] = updated;
                    onMedicationChange(next);
                  }}
                  onRemove={() => {
                    onMedicationChange(
                      medicationEntries.filter((_, i) => i !== idx),
                    );
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feeding Card ─────────────────────────────────────────────────────────────

function FeedingCard({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: CustomerFeedingEntry;
  index: number;
  onChange: (e: CustomerFeedingEntry) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">
            Meal {index + 1} — {entry.label}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-7 gap-1 text-[11px]"
            onClick={onRemove}
          >
            <Trash2 className="size-3" />
            Remove
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs">Meal</Label>
            <Select
              value={entry.label}
              onValueChange={(v) => onChange({ ...entry, label: v })}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_LABELS.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Time</Label>
            <div className="relative mt-1">
              <Clock className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                type="time"
                value={entry.time}
                onChange={(e) => onChange({ ...entry, time: e.target.value })}
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <div className="mt-1 flex items-center overflow-hidden rounded-lg border">
              <input
                type="number"
                min={0}
                step={0.25}
                value={entry.amount}
                onChange={(e) => onChange({ ...entry, amount: e.target.value })}
                placeholder="0"
                className="h-9 w-16 border-0 bg-transparent px-2 text-center text-xs font-semibold outline-none"
              />
              <div className="flex h-9 items-center border-l bg-slate-50">
                {FEEDING_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => onChange({ ...entry, unit: u })}
                    className={cn(
                      "h-full px-2.5 text-[11px] font-medium transition-colors",
                      (entry.unit || "Cup") === u
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Food Type</Label>
            <Select
              value={entry.foodType}
              onValueChange={(v) => onChange({ ...entry, foodType: v })}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {FOOD_TYPES.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feeding instruction */}
        <div className="mt-3">
          <Label className="text-xs">Feeding Instruction</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FEEDING_INSTRUCTIONS_OPTIONS.map((fi) => (
              <button
                key={fi}
                type="button"
                onClick={() =>
                  onChange({
                    ...entry,
                    feedingInstruction:
                      entry.feedingInstruction === fi ? "" : fi,
                  })
                }
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  entry.feedingInstruction === fi
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-muted",
                )}
              >
                {fi}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <Label className="text-xs">Feeding Note (optional)</Label>
          <Textarea
            value={entry.instructions}
            onChange={(e) =>
              onChange({ ...entry, instructions: e.target.value })
            }
            placeholder="e.g. Mix with warm water, hand-feed if anxious..."
            className="mt-1 min-h-[60px] text-xs"
            rows={2}
          />
        </div>

        {/* Save to profile */}
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={entry.saveToProfile ?? false}
            onChange={(e) =>
              onChange({ ...entry, saveToProfile: e.target.checked })
            }
            className="size-4 rounded-sm accent-blue-600"
          />
          <div>
            <p className="text-xs font-medium text-blue-800">
              Save to pet profile for future visits
            </p>
            <p className="text-[10px] text-blue-600">
              These feeding instructions will auto-populate next time
            </p>
          </div>
        </label>
      </CardContent>
    </Card>
  );
}

// ── Medication Card ──────────────────────────────────────────────────────────

function MedicationCard({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: CustomerMedicationEntry;
  index: number;
  onChange: (e: CustomerMedicationEntry) => void;
  onRemove: () => void;
}) {
  return (
    <Card className={cn(entry.isCritical && "border-amber-200 bg-amber-50/30")}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {entry.isCritical && (
              <AlertTriangle className="size-4 text-amber-500" />
            )}
            <span className="text-sm font-semibold">
              Medication {index + 1}
              {entry.name ? ` — ${entry.name}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px]">
              <input
                type="checkbox"
                checked={entry.isCritical}
                onChange={(e) =>
                  onChange({ ...entry, isCritical: e.target.checked })
                }
                className="accent-amber-500"
              />
              <span className="text-amber-700">Critical</span>
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-7 gap-1 text-[11px]"
              onClick={onRemove}
            >
              <Trash2 className="size-3" />
              Remove
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Medication Name</Label>
            <Input
              value={entry.name}
              onChange={(e) => onChange({ ...entry, name: e.target.value })}
              placeholder="e.g. Apoquel"
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Dosage</Label>
            <Input
              value={entry.dosage}
              onChange={(e) => onChange({ ...entry, dosage: e.target.value })}
              placeholder="e.g. 16mg tablet"
              className="mt-1 h-9 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Method</Label>
            <Select
              value={entry.method}
              onValueChange={(v) => onChange({ ...entry, method: v })}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MED_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Frequency</Label>
            <Select
              value={entry.frequency}
              onValueChange={(v) => onChange({ ...entry, frequency: v })}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <Label className="text-xs">Time(s)</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {entry.times.map((t, ti) => (
                <div
                  key={ti}
                  className="flex items-center gap-1 rounded-md border px-1.5 py-1"
                >
                  <Clock className="text-muted-foreground size-3" />
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => {
                      const next = [...entry.times];
                      next[ti] = e.target.value;
                      onChange({ ...entry, times: next });
                    }}
                    className="h-6 border-0 bg-transparent text-xs"
                  />
                  {entry.times.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...entry,
                          times: entry.times.filter((_, i) => i !== ti),
                        })
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  onChange({ ...entry, times: [...entry.times, "12:00"] })
                }
                className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-[11px] text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
              >
                <Plus className="size-3" />
                Add time
              </button>
            </div>
          </div>
        </div>

        {/* Drug allergies */}
        <div className="mt-3">
          <Label className="text-xs">Drug Allergies</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(entry.drugAllergies ?? []).map((a, ai) => (
              <span
                key={ai}
                className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700"
              >
                <AlertTriangle className="size-3" />
                {a}
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...entry,
                      drugAllergies: (entry.drugAllergies ?? []).filter(
                        (_, i) => i !== ai,
                      ),
                    })
                  }
                  className="ml-0.5 text-red-400 hover:text-red-700"
                >
                  <Trash2 className="size-2.5" />
                </button>
              </span>
            ))}
            <form
              className="flex items-center"
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).querySelector(
                  "input",
                ) as HTMLInputElement;
                const val = input.value.trim();
                if (val && !(entry.drugAllergies ?? []).includes(val)) {
                  onChange({
                    ...entry,
                    drugAllergies: [...(entry.drugAllergies ?? []), val],
                  });
                  input.value = "";
                }
              }}
            >
              <Input placeholder="+ Add allergy" className="h-7 w-28 text-xs" />
            </form>
          </div>
        </div>

        {/* Supply count */}
        <div className="mt-3">
          <Label className="text-xs">Supply Brought (number of doses)</Label>
          <Input
            type="number"
            min={0}
            value={entry.supplyCount ?? ""}
            onChange={(e) =>
              onChange({
                ...entry,
                supplyCount: e.target.value
                  ? parseInt(e.target.value, 10)
                  : undefined,
              })
            }
            placeholder="e.g. 10"
            className="mt-1 h-9 w-32 text-xs"
          />
          {entry.supplyCount != null &&
            entry.supplyCount > 0 &&
            (() => {
              const dosesPerDay =
                entry.frequency === "Twice daily"
                  ? 2
                  : entry.frequency === "Three times daily"
                    ? 3
                    : entry.times.length || 1;
              const daysOfSupply = Math.floor(entry.supplyCount / dosesPerDay);
              const isLow = daysOfSupply <= 3;
              return (
                <p
                  className={`mt-1 text-[11px] ${isLow ? "font-medium text-amber-700" : "text-muted-foreground"}`}
                >
                  {isLow && "\u26A0 "}
                  {entry.supplyCount} doses = ~{daysOfSupply} day
                  {daysOfSupply !== 1 ? "s" : ""} of supply
                  {isLow ? " — may need refill" : ""}
                </p>
              );
            })()}
        </div>

        <div className="mt-3">
          <Label className="text-xs">Special Instructions (optional)</Label>
          <Textarea
            value={entry.instructions}
            onChange={(e) =>
              onChange({ ...entry, instructions: e.target.value })
            }
            placeholder="e.g. Give with food, not on empty stomach..."
            className="mt-1 min-h-[60px] text-xs"
            rows={2}
          />
        </div>

        {/* Save to profile */}
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={entry.saveToProfile ?? false}
            onChange={(e) =>
              onChange({ ...entry, saveToProfile: e.target.checked })
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
      </CardContent>
    </Card>
  );
}
