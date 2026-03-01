"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { YipyyGoFormData, MedicationItem } from "@/data/yipyygo-forms";
import type { YipyyGoConfig } from "@/data/yipyygo-config";

interface MedicationSectionProps {
  formData: YipyyGoFormData;
  updateFormData: (updates: Partial<YipyyGoFormData>) => void;
  booking: any;
  pet: any;
  customer: any;
  config: YipyyGoConfig | null;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isLastSection: boolean;
}

const MEDICATION_METHODS = [
  { value: "pill_pocket", label: "Pill Pocket" },
  { value: "with_food", label: "With Food" },
  { value: "syringe", label: "Syringe" },
  { value: "topical", label: "Topical" },
  { value: "other", label: "Other" },
] as const;

const FREQUENCY_CHIPS = ["Once daily", "Twice daily", "With meals", "As needed", "Other"] as const;
const COMMON_MED_TIMES = ["08:00", "12:00", "18:00", "20:00"];

export function MedicationSection({
  formData,
  updateFormData,
  config,
  onNext,
  onBack,
  isLastSection,
}: MedicationSectionProps) {
  const [newMedication, setNewMedication] = useState<Partial<MedicationItem>>({
    name: "",
    dosage: "",
    frequency: "",
    method: "pill_pocket",
    times: [],
  });

  const handleNoMedicationsToggle = (checked: boolean) => {
    updateFormData({
      noMedications: checked,
      medications: checked ? [] : formData.medications,
    });
  };

  const handleAddMedication = () => {
    if (!newMedication.name || !newMedication.dosage) return;

    const medication: MedicationItem = {
      id: `med-${Date.now()}`,
      name: newMedication.name,
      dosage: newMedication.dosage,
      frequency: newMedication.frequency || "",
      times: newMedication.times || [],
      method: newMedication.method || "pill_pocket",
      methodNotes: newMedication.methodNotes,
    };

    updateFormData({
      medications: [...formData.medications, medication],
      noMedications: false,
    });

    setNewMedication({
      name: "",
      dosage: "",
      frequency: "",
      method: "pill_pocket",
      times: [],
    });
  };

  const handleRemoveMedication = (id: string) => {
    updateFormData({
      medications: formData.medications.filter((m) => m.id !== id),
    });
  };

  const handleUpdateMedication = (id: string, updates: Partial<MedicationItem>) => {
    updateFormData({
      medications: formData.medications.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  const handleAddTime = (medicationId: string, time: string) => {
    const medication = formData.medications.find((m) => m.id === medicationId);
    if (!medication) return;

    handleUpdateMedication(medicationId, {
      times: [...medication.times, time],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medication Instructions</CardTitle>
        <CardDescription>
          List any medications {formData.petName} is currently taking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base font-medium">No Medications</Label>
            <p className="text-sm text-muted-foreground">
              Check if {formData.petName} is not taking any medications
            </p>
          </div>
          <Switch
            checked={formData.noMedications}
            onCheckedChange={handleNoMedicationsToggle}
          />
        </div>

        {!formData.noMedications && (
          <>
            {/* Existing Medications */}
            {formData.medications.map((medication) => (
              <div
                key={medication.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Medication Name</Label>
                        <Input
                          value={medication.name}
                          onChange={(e) =>
                            handleUpdateMedication(medication.id, { name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Dosage</Label>
                        <Input
                          value={medication.dosage}
                          onChange={(e) =>
                            handleUpdateMedication(medication.id, { dosage: e.target.value })
                          }
                          placeholder="e.g., 10mg"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {FREQUENCY_CHIPS.map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => handleUpdateMedication(medication.id, { frequency: freq })}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm",
                              medication.frequency === freq
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input hover:bg-accent"
                            )}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                      {(medication.frequency === "Other" || (medication.frequency && !FREQUENCY_CHIPS.includes(medication.frequency as any))) && (
                        <Input
                          value={medication.frequency === "Other" ? "" : medication.frequency}
                          onChange={(e) => handleUpdateMedication(medication.id, { frequency: e.target.value.trim() || "Other" })}
                          placeholder="e.g., Every 12 hours"
                          className="mt-2 max-w-xs"
                        />
                      )}
                    </div>
                    <div>
                      <Label>Times</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {COMMON_MED_TIMES.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              if (!medication.times.includes(time))
                                handleUpdateMedication(medication.id, { times: [...medication.times, time] });
                            }}
                            disabled={medication.times.includes(time)}
                            className="rounded-full border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                          >
                            + {new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </button>
                        ))}
                        <Input
                          type="time"
                          className="w-28 h-8"
                          onBlur={(e) => {
                            if (e.target.value && !medication.times.includes(e.target.value)) {
                              handleAddTime(medication.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>
                      {medication.times.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {medication.times.map((time, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                            >
                              {new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                              <button type="button" onClick={() => handleUpdateMedication(medication.id, { times: medication.times.filter((_, i) => i !== index) })}>
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Method</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {MEDICATION_METHODS.map((method) => (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => handleUpdateMedication(medication.id, { method: method.value })}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm",
                              medication.method === method.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input hover:bg-accent"
                            )}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                      {medication.method === "other" && (
                      <div>
                        <Label>Method Notes</Label>
                        <Input
                          value={medication.methodNotes || ""}
                          onChange={(e) =>
                            handleUpdateMedication(medication.id, {
                              methodNotes: e.target.value,
                            })
                          }
                        />
                      </div>
                      )}
                      {config?.formTemplate.features.photoUploads && (
                      <div>
                        <Label>Photo of Medication Label (optional)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUpdateMedication(medication.id, {
                                photoUrl: URL.createObjectURL(file),
                              });
                            }
                          }}
                        />
                        {medication.photoUrl && (
                          <img
                            src={medication.photoUrl}
                            alt="Medication label"
                            className="mt-2 w-32 h-32 object-cover border rounded"
                          />
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMedication(medication.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add New Medication */}
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <h4 className="font-medium">Add Medication</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newMedication.name || ""}
                    onChange={(e) =>
                      setNewMedication({ ...newMedication, name: e.target.value })
                    }
                    placeholder="e.g., Heartgard"
                  />
                </div>
                <div>
                  <Label>Dosage *</Label>
                  <Input
                    value={newMedication.dosage || ""}
                    onChange={(e) =>
                      setNewMedication({ ...newMedication, dosage: e.target.value })
                    }
                    placeholder="e.g., 10mg"
                  />
                </div>
              </div>
              <div>
                <Label>Frequency</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {FREQUENCY_CHIPS.map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setNewMedication({ ...newMedication, frequency: freq })}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        newMedication.frequency === freq ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"
                      )}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleAddMedication} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Medication
              </Button>
            </div>
          </>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>
            {isLastSection ? "Review" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
