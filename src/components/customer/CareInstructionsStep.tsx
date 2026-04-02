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

// ── Types ────────────────────────────────────────────────────────────────────

export interface CustomerFeedingEntry {
  id: string;
  label: string;
  time: string;
  amount: string;
  foodType: string;
  instructions: string;
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
}

interface CareInstructionsStepProps {
  feedingEntries: CustomerFeedingEntry[];
  onFeedingChange: (entries: CustomerFeedingEntry[]) => void;
  medicationEntries: CustomerMedicationEntry[];
  onMedicationChange: (entries: CustomerMedicationEntry[]) => void;
  petNames: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}-${_id}`;
}

const MEAL_LABELS = ["Breakfast", "Lunch", "Dinner", "Snack", "Treats"];
const FOOD_TYPES = [
  "Dry Kibble",
  "Wet Food",
  "Raw",
  "Homemade",
  "Prescription Diet",
  "Other",
];
const MED_METHODS = [
  "Oral",
  "Topical",
  "Injection",
  "Mixed with food",
  "Eye drops",
  "Ear drops",
  "Other",
];
const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Every 8 hours",
  "As needed",
];

// ── Component ────────────────────────────────────────────────────────────────

export function CareInstructionsStep({
  feedingEntries,
  onFeedingChange,
  medicationEntries,
  onMedicationChange,
  petNames,
}: CareInstructionsStepProps) {
  const petLabel =
    petNames.length === 1
      ? petNames[0]
      : `your pet${petNames.length > 1 ? "s" : ""}`;

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div>
        <h3 className="text-lg font-semibold">Care Instructions</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Help us take the best care of {petLabel}. Add feeding schedules and
          any medications so our staff knows exactly what&apos;s needed.
        </p>
      </div>

      {/* ── Feeding ── */}
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
                  foodType: "",
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
                Click &quot;Add Meal&quot; if {petLabel} has a specific feeding
                schedule
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

      {/* ── Medications ── */}
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
            <Input
              value={entry.amount}
              onChange={(e) => onChange({ ...entry, amount: e.target.value })}
              placeholder="e.g. 1 cup"
              className="mt-1 h-9 text-xs"
            />
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
        <div className="mt-3">
          <Label className="text-xs">Special Instructions (optional)</Label>
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
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Time(s)</Label>
            <Input
              value={entry.times.join(", ")}
              onChange={(e) =>
                onChange({
                  ...entry,
                  times: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g. 08:00, 20:00"
              className="mt-1 h-9 text-xs"
            />
          </div>
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
      </CardContent>
    </Card>
  );
}
