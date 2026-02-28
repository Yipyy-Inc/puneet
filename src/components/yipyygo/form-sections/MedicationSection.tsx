"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload } from "lucide-react";
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
                      <Input
                        value={medication.frequency}
                        onChange={(e) =>
                          handleUpdateMedication(medication.id, { frequency: e.target.value })
                        }
                        placeholder="e.g., twice daily"
                      />
                    </div>
                    <div>
                      <Label>Times</Label>
                      <div className="flex flex-wrap gap-2">
                        {medication.times.map((time, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 px-2 py-1 bg-muted rounded"
                          >
                            <span>{time}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleUpdateMedication(medication.id, {
                                  times: medication.times.filter((_, i) => i !== index),
                                });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Input
                          type="time"
                          className="w-32"
                          onBlur={(e) => {
                            if (e.target.value && !medication.times.includes(e.target.value)) {
                              handleAddTime(medication.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          placeholder="Add time"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Method</Label>
                      <select
                        className="w-full h-10 px-3 border rounded-md"
                        value={medication.method}
                        onChange={(e) =>
                          handleUpdateMedication(medication.id, {
                            method: e.target.value as MedicationItem["method"],
                          })
                        }
                      >
                        {MEDICATION_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
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
                <Input
                  value={newMedication.frequency || ""}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, frequency: e.target.value })
                  }
                  placeholder="e.g., twice daily"
                />
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
