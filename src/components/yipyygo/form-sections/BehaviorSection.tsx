"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { YipyyGoFormData, BehaviorNotes } from "@/data/yipyygo-forms";
import type { YipyyGoConfig } from "@/data/yipyygo-config";

interface BehaviorSectionProps {
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

const ENERGY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "very_high", label: "Very High" },
] as const;

const SOCIALIZATION_OPTIONS: {
  withDogs: { value: BehaviorNotes["socialization"]["withDogs"]; label: string }[];
  withHumans: { value: BehaviorNotes["socialization"]["withHumans"]; label: string }[];
} = {
  withDogs: [
    { value: "friendly", label: "Friendly" },
    { value: "selective", label: "Selective" },
    { value: "not_friendly", label: "Not Friendly" },
    { value: "unknown", label: "Unknown" },
  ],
  withHumans: [
    { value: "friendly", label: "Friendly" },
    { value: "shy", label: "Shy" },
    { value: "fearful", label: "Fearful" },
    { value: "unknown", label: "Unknown" },
  ],
};

const COMMON_ANXIETY_TRIGGERS = [
  "Thunderstorms",
  "Loud noises",
  "Strangers",
  "Other dogs",
  "Separation",
  "Vet visits",
  "Grooming",
  "Car rides",
];

export function BehaviorSection({
  formData,
  updateFormData,
  onNext,
  onBack,
  isLastSection,
}: BehaviorSectionProps) {
  const behavior = formData.behaviorNotes || {
    energyLevel: "medium",
    socialization: {
      withDogs: "unknown",
      withHumans: "friendly",
    },
    anxietyTriggers: [],
    specialNotes: "",
  };

  const [newTrigger, setNewTrigger] = useState("");

  const handleUpdate = (updates: Partial<BehaviorNotes>) => {
    updateFormData({
      behaviorNotes: { ...behavior, ...updates },
    });
  };

  const handleAddTrigger = () => {
    if (!newTrigger.trim()) return;
    handleUpdate({
      anxietyTriggers: [...(behavior.anxietyTriggers || []), newTrigger.trim()],
    });
    setNewTrigger("");
  };

  const handleRemoveTrigger = (trigger: string) => {
    handleUpdate({
      anxietyTriggers: (behavior.anxietyTriggers || []).filter((t) => t !== trigger),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Behavior & Special Notes</CardTitle>
        <CardDescription>
          Help us understand {formData.petName}'s behavior and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Energy Level</Label>
          <div className="grid grid-cols-4 gap-2">
            {ENERGY_LEVELS.map((level) => (
              <Button
                key={level.value}
                variant={behavior.energyLevel === level.value ? "default" : "outline"}
                onClick={() => handleUpdate({ energyLevel: level.value })}
                className="w-full"
              >
                {level.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>With other dogs</Label>
          <div className="flex flex-wrap gap-2">
            {SOCIALIZATION_OPTIONS.withDogs.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  handleUpdate({
                    socialization: { ...behavior.socialization, withDogs: option.value },
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  behavior.socialization.withDogs === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-accent"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Label>With humans</Label>
          <div className="flex flex-wrap gap-2">
            {SOCIALIZATION_OPTIONS.withHumans.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  handleUpdate({
                    socialization: { ...behavior.socialization, withHumans: option.value },
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  behavior.socialization.withHumans === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-accent"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Anxiety Triggers (optional)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {behavior.anxietyTriggers?.map((trigger) => (
              <Badge key={trigger} variant="secondary" className="flex items-center gap-1">
                {trigger}
                <button
                  onClick={() => handleRemoveTrigger(trigger)}
                  className="ml-1 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTrigger();
                }
              }}
              placeholder="Add trigger (e.g., Thunderstorms)"
            />
            <Button onClick={handleAddTrigger} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {COMMON_ANXIETY_TRIGGERS.map((trigger) => (
              <Button
                key={trigger}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!behavior.anxietyTriggers?.includes(trigger)) {
                    setNewTrigger(trigger);
                    handleAddTrigger();
                  }
                }}
                disabled={behavior.anxietyTriggers?.includes(trigger)}
              >
                {trigger}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Anything else? (optional)</Label>
          <Textarea
            value={behavior.specialNotes || ""}
            onChange={(e) => handleUpdate({ specialNotes: e.target.value })}
            placeholder="e.g., Prefers quiet corner, loves belly rubs"
            rows={2}
          />
        </div>

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
