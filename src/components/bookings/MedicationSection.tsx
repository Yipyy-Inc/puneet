"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MedicationEntry } from "@/types/booking";

interface MedicationSectionProps {
  entries: MedicationEntry[];
}

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

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtTimestamp(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const doseStatusIcon = {
  given: <CheckCircle2 className="size-3.5 text-emerald-500" />,
  skipped: <Ban className="size-3.5 text-amber-500" />,
  refused: <XCircle className="size-3.5 text-red-500" />,
  pending: <Circle className="text-muted-foreground/30 size-3.5" />,
};

const doseStatusLabel = {
  given: "Given",
  skipped: "Skipped",
  refused: "Refused",
  pending: "Pending",
};

let _medId = 200;

export function MedicationSection({ entries }: MedicationSectionProps) {
  const [meds, setMeds] = useState(entries);
  const [addOpen, setAddOpen] = useState(false);
  const [notePopover, setNotePopover] = useState<string | null>(null);
  const [doseNote, setDoseNote] = useState("");
  const [newMed, setNewMed] = useState({
    name: "",
    dosage: "",
    method: "Oral",
    frequency: "Once daily",
    times: "08:00",
    instructions: "",
    isCritical: false,
  });

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
                      administeredBy: "You",
                      administeredAt: new Date().toISOString(),
                      notes: notes || d.notes,
                    }
                  : d,
              ),
            }
          : med,
      ),
    );
    toast.success("Medication administered");
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
    toast.success("Note added");
  };

  const handleAdd = () => {
    if (!newMed.name) {
      toast.error("Medication name is required");
      return;
    }
    _medId += 1;
    const times = newMed.times
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setMeds((prev) => [
      ...prev,
      {
        id: `med-new-${_medId}`,
        name: newMed.name,
        dosage: newMed.dosage,
        method: newMed.method,
        frequency: newMed.frequency,
        times,
        instructions: newMed.instructions,
        isCritical: newMed.isCritical,
        doses: times.map((t) => ({
          scheduledAt: new Date(
            `2026-04-15T${t.padStart(5, "0")}:00Z`,
          ).toISOString(),
          status: "pending" as const,
        })),
      },
    ]);
    setNewMed({
      name: "",
      dosage: "",
      method: "Oral",
      frequency: "Once daily",
      times: "08:00",
      instructions: "",
      isCritical: false,
    });
    setAddOpen(false);
    toast.success("Medication added");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Pill className="size-3.5" />
            Medications
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            onClick={() => setAddOpen(!addOpen)}
          >
            <Plus className="size-3" />
            Add Medication
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Inline add form */}
        <Collapsible open={addOpen} onOpenChange={setAddOpen}>
          <CollapsibleContent>
            <div className="space-y-3 border-b py-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-[11px]">Medication Name</Label>
                  <Input
                    value={newMed.name}
                    onChange={(e) =>
                      setNewMed((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Apoquel"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Dosage</Label>
                  <Input
                    value={newMed.dosage}
                    onChange={(e) =>
                      setNewMed((p) => ({ ...p, dosage: e.target.value }))
                    }
                    placeholder="e.g. 16mg tablet"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Method</Label>
                  <Select
                    value={newMed.method}
                    onValueChange={(v) =>
                      setNewMed((p) => ({ ...p, method: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
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
                  <Label className="text-[11px]">Frequency</Label>
                  <Select
                    value={newMed.frequency}
                    onValueChange={(v) =>
                      setNewMed((p) => ({ ...p, frequency: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
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
                <div>
                  <Label className="text-[11px]">Time(s)</Label>
                  <Input
                    value={newMed.times}
                    onChange={(e) =>
                      setNewMed((p) => ({ ...p, times: e.target.value }))
                    }
                    placeholder="08:00, 20:00"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={newMed.isCritical}
                      onChange={(e) =>
                        setNewMed((p) => ({
                          ...p,
                          isCritical: e.target.checked,
                        }))
                      }
                      className="accent-amber-500"
                    />
                    <span className="font-medium text-amber-700">
                      Critical medication
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-[11px]">Instructions (optional)</Label>
                <Textarea
                  value={newMed.instructions}
                  onChange={(e) =>
                    setNewMed((p) => ({ ...p, instructions: e.target.value }))
                  }
                  placeholder="e.g. Give with food, not on empty stomach..."
                  className="mt-1 min-h-[50px] text-xs"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={handleAdd}
                >
                  Add Medication
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Entries */}
        {meds.length === 0 ? (
          <div className="py-6 text-center">
            <Pill className="text-muted-foreground/20 mx-auto size-8" />
            <p className="text-muted-foreground mt-2 text-xs">
              No medications — click &quot;Add Medication&quot; to add
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {meds.map((med) => (
              <div key={med.id} className="py-4 first:pt-4">
                {/* Header */}
                <div className="flex items-start gap-2">
                  {med.isCritical && (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{med.name}</span>
                      {med.isCritical && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] font-bold text-amber-700 uppercase">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                      <span className="font-medium">{med.dosage}</span>
                      <span>·</span>
                      <span>{med.method}</span>
                      <span>·</span>
                      <span>{med.frequency}</span>
                    </div>
                    {med.instructions && (
                      <p
                        className={cn(
                          "mt-1.5 rounded-md border px-2.5 py-1.5 text-xs",
                          med.isCritical
                            ? "border-amber-200 bg-amber-50 font-medium text-amber-800"
                            : "text-muted-foreground border-border bg-muted/20 italic",
                        )}
                      >
                        {med.isCritical && "\u26A0 "}
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
                        className="bg-background flex items-center gap-2.5 rounded-lg border px-3 py-2"
                      >
                        {doseStatusIcon[dose.status]}
                        <div className="min-w-0 flex-1">
                          <span className="text-xs">
                            <Clock className="mr-1 inline size-3" />
                            {fmtTime(
                              new Date(dose.scheduledAt)
                                .toTimeString()
                                .slice(0, 5),
                            )}
                          </span>
                          {dose.administeredBy && (
                            <span className="text-muted-foreground ml-2 text-[10px]">
                              {doseStatusLabel[dose.status]} by{" "}
                              {dose.administeredBy}
                              {dose.administeredAt &&
                                ` at ${fmtTimestamp(dose.administeredAt)}`}
                            </span>
                          )}
                          {dose.skipReason && (
                            <span className="text-muted-foreground ml-2 text-[10px]">
                              — {dose.skipReason}
                            </span>
                          )}
                          {dose.notes && (
                            <p className="text-muted-foreground mt-0.5 text-[10px] italic">
                              Note: {dose.notes}
                            </p>
                          )}
                        </div>
                        {dose.status === "pending" && (
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
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <MessageSquare className="text-muted-foreground size-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="w-[220px] p-3"
                              >
                                <Textarea
                                  value={doseNote}
                                  onChange={(e) => setDoseNote(e.target.value)}
                                  placeholder="Add a note..."
                                  className="min-h-[60px] text-xs"
                                  rows={2}
                                />
                                <Button
                                  size="sm"
                                  className="mt-2 h-7 w-full text-[11px]"
                                  onClick={() => handleAddNote(med.id, idx)}
                                >
                                  Save Note
                                </Button>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 gap-1 text-[10px]"
                              onClick={() =>
                                handleAdminister(
                                  med.id,
                                  idx,
                                  doseNote || undefined,
                                )
                              }
                            >
                              <CheckCircle2 className="size-3" />
                              Give
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
