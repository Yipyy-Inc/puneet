"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus } from "lucide-react";
import type { MedicationItem } from "@/lib/types";

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

const TIME_OPTIONS = [
  "AM",
  "PM",
  "Noon",
  "Evening",
  "breakfast",
  "lunch",
  "dinner",
  "bedtime",
  "as_needed",
];

const UNIT_OPTIONS = [
  { value: "pill", label: "Pill" },
  { value: "ml", label: "ML" },
  { value: "mg", label: "MG" },
  { value: "drop", label: "Drop(s)" },
];

const TYPE_OPTIONS = [
  { value: "oral", label: "Oral" },
  { value: "topical", label: "Topical" },
  { value: "injection", label: "Injection" },
  { value: "eye_ear", label: "Eye/Ear Drops" },
];

const INSTRUCTIONS_OPTIONS = [
  { value: "with_food", label: "With Food" },
  { value: "empty_stomach", label: "Empty Stomach" },
  { value: "as_needed", label: "As Needed" },
  { value: "regular", label: "Regular Schedule" },
];

function createEmptyItem(defaultPetId?: number): MedicationItem {
  return {
    id: `medication-${Date.now()}`,
    petId: defaultPetId,
    name: "",
    time: [],
    amount: "",
    unit: "",
    type: "",
    instructions: "",
    notes: "",
  };
}

function formatTimeLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function MedicationForm({
  medications,
  setMedications,
  selectedPets,
}: MedicationFormProps) {
  const update = (index: number, patch: Partial<MedicationItem>) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], ...patch };
    setMedications(updated);
  };

  const add = () => {
    setMedications([
      ...medications,
      createEmptyItem(
        selectedPets.length === 1 ? selectedPets[0].id : undefined
      ),
    ]);
  };

  const remove = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const addTime = (index: number, value: string) => {
    const item = medications[index];
    if (item.time.includes(value)) return;
    update(index, { time: [...item.time, value] });
  };

  const removeTime = (index: number, timeIndex: number) => {
    const item = medications[index];
    update(index, {
      time: item.time.filter((_, i) => i !== timeIndex),
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Medication Instructions</h4>
      <div className="space-y-3">
        {medications.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-red-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">Medication</h4>
                    <p className="text-xs text-muted-foreground">
                      Medical treatment details
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Name</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => update(index, { name: e.target.value })}
                      placeholder="e.g., Heartworm Prevention"
                      className="h-9"
                    />
                  </div>
                  {selectedPets.length > 1 && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Pet</Label>
                      <Select
                        value={item.petId?.toString() ?? ""}
                        onValueChange={(value) =>
                          update(index, { petId: parseInt(value, 10) })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select pet" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPets.map((pet) => (
                            <SelectItem
                              key={pet.id}
                              value={pet.id.toString()}
                            >
                              {pet.name} {pet.type ? `(${pet.type})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                <h5 className="text-sm font-medium text-muted-foreground">
                  Dosage Details
                </h5>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Time</Label>
                  <div className="flex flex-wrap gap-1">
                    {item.time.map((time, timeIndex) => (
                      <div
                        key={timeIndex}
                        className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs"
                      >
                        <span>{formatTimeLabel(time)}</span>
                        <button
                          type="button"
                          onClick={() => removeTime(index, timeIndex)}
                          className="text-primary hover:text-primary/80"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <Select
                    onValueChange={(value) => addTime(index, value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Add time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((v) => (
                        <SelectItem
                          key={v}
                          value={v}
                          disabled={item.time.includes(v)}
                        >
                          {formatTimeLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Amount</Label>
                    <Input
                      value={item.amount}
                      onChange={(e) =>
                        update(index, { amount: e.target.value })
                      }
                      placeholder="e.g., 1"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(value) =>
                        update(index, { unit: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                <h5 className="text-sm font-medium text-muted-foreground">
                  Administration Details
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Type</Label>
                    <Select
                      value={item.type}
                      onValueChange={(value) =>
                        update(index, { type: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Instructions</Label>
                    <Select
                      value={item.instructions}
                      onValueChange={(value) =>
                        update(index, { instructions: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select instructions" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTRUCTIONS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Medication Notes</Label>
                <Textarea
                  value={item.notes}
                  onChange={(e) => update(index, { notes: e.target.value })}
                  placeholder="Additional notes about medication..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        <Button type="button" variant="outline" onClick={add} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </Button>
      </div>
    </div>
  );
}
