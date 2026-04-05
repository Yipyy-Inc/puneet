"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Utensils,
  Pill,
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  Clock,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";

// ── Editable list helper ─────────────────────────────────────────────

function EditableList({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const val = draft.trim();
    if (!val || items.includes(val)) {
      setDraft("");
      return;
    }
    onChange([...items, val]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{title}</Label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
          >
            <GripVertical className="text-muted-foreground/30 size-3.5 shrink-0" />
            <span className="flex-1 text-sm">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          disabled={!draft.trim()}
          onClick={add}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Schedule list (label + time) ─────────────────────────────────────

function ScheduleList({
  items,
  onChange,
}: {
  items: { id: string; label: string; time: string }[];
  onChange: (items: { id: string; label: string; time: string }[]) => void;
}) {
  const [draftLabel, setDraftLabel] = useState("");
  const [draftTime, setDraftTime] = useState("08:00");

  const add = () => {
    if (!draftLabel.trim()) return;
    onChange([
      ...items,
      {
        id: `s-${Date.now()}`,
        label: draftLabel.trim(),
        time: draftTime,
      },
    ]);
    setDraftLabel("");
    setDraftTime("08:00");
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">Feeding Schedules</Label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
          >
            <GripVertical className="text-muted-foreground/30 size-3.5 shrink-0" />
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              <Clock className="mr-1 size-2.5" />
              {item.time}
            </Badge>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Evening"
          className="h-8 flex-1 text-xs"
        />
        <input
          type="time"
          value={draftTime}
          onChange={(e) => setDraftTime(e.target.value)}
          className="border-border h-8 rounded-md border px-2 text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          disabled={!draftLabel.trim()}
          onClick={add}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function FeedingMedicationConfig() {
  const [feeding, setFeeding] = useState(facilityConfig.feedingOptions);
  const [medication, setMedication] = useState(
    facilityConfig.medicationOptions,
  );
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    facilityConfig.feedingOptions = feeding;
    facilityConfig.medicationOptions = medication;
    setEditing(false);
    toast.success("Feeding & medication options saved");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-100">
            <Utensils className="size-4 text-orange-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Feeding & Medication Options</h3>
            <p className="text-muted-foreground text-xs">
              Configure the options staff and customers see when adding care
              instructions
            </p>
          </div>
        </div>
        {!editing ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFeeding(facilityConfig.feedingOptions);
                setMedication(facilityConfig.medicationOptions);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleSave}>
              <Save className="size-3.5" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Feeding */}
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="border-b bg-slate-50/50 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-100">
              <Utensils className="size-4 text-orange-700" />
            </div>
            Feeding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {!editing ? (
            /* Read-only */
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Schedules
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feeding.schedules.map((s) => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      {s.label} ({s.time})
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Units
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feeding.units.map((u) => (
                    <Badge key={u} variant="outline" className="text-xs">
                      {u}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Food Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feeding.foodTypes.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Instructions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feeding.instructions.map((i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {i}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feeding.sources.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Allergy Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feeding.allergyPresets.map((a) => (
                    <Badge
                      key={a}
                      variant="outline"
                      className="border-red-200 text-xs text-red-700"
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Edit mode */
            <div className="grid gap-5 sm:grid-cols-2">
              <ScheduleList
                items={feeding.schedules}
                onChange={(s) => setFeeding({ ...feeding, schedules: s })}
              />
              <EditableList
                title="Units"
                items={feeding.units}
                onChange={(u) => setFeeding({ ...feeding, units: u })}
                placeholder="e.g. Lbs"
              />
              <EditableList
                title="Food Types"
                items={feeding.foodTypes}
                onChange={(t) => setFeeding({ ...feeding, foodTypes: t })}
                placeholder="e.g. Freeze-dried"
              />
              <EditableList
                title="Instructions"
                items={feeding.instructions}
                onChange={(i) => setFeeding({ ...feeding, instructions: i })}
                placeholder="e.g. Elevated bowl"
              />
              <EditableList
                title="Sources"
                items={feeding.sources}
                onChange={(s) => setFeeding({ ...feeding, sources: s })}
                placeholder="e.g. Mix both"
              />
              <EditableList
                title="Allergy Presets"
                items={feeding.allergyPresets}
                onChange={(a) => setFeeding({ ...feeding, allergyPresets: a })}
                placeholder="e.g. Soy"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medication */}
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="border-b bg-slate-50/50 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
              <Pill className="size-4 text-violet-700" />
            </div>
            Medication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {!editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Methods
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {medication.methods.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Frequencies
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {medication.frequencies.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  Quick Times
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {medication.quickTimes.map((t) => (
                    <Badge key={t.time} variant="outline" className="text-xs">
                      {t.label} ({t.time})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <EditableList
                title="Methods"
                items={medication.methods}
                onChange={(m) => setMedication({ ...medication, methods: m })}
                placeholder="e.g. Inhaled"
              />
              <EditableList
                title="Frequencies"
                items={medication.frequencies}
                onChange={(f) =>
                  setMedication({ ...medication, frequencies: f })
                }
                placeholder="e.g. Every 12 hours"
              />
              <div className="sm:col-span-2">
                <ScheduleList
                  items={medication.quickTimes.map((t, i) => ({
                    id: `mt-${i}`,
                    label: t.label,
                    time: t.time,
                  }))}
                  onChange={(items) =>
                    setMedication({
                      ...medication,
                      quickTimes: items.map((i) => ({
                        label: i.label,
                        time: i.time,
                      })),
                    })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
