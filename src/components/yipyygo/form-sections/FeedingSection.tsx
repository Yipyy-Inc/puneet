"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { YipyyGoFormData, FeedingInstruction } from "@/data/yipyygo-forms";
import type { YipyyGoConfig } from "@/data/yipyygo-config";

interface FeedingSectionProps {
  formData: YipyyGoFormData;
  updateFormData: (updates: Partial<YipyyGoFormData>) => void;
  booking: any;
  pet: any;
  customer: any;
  config: YipyyGoConfig | null;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isLastSection: boolean;
}

const FOOD_TYPE_CHIPS = [
  "Kibble",
  "Wet food",
  "Raw",
  "Prescription diet",
  "Same as at home",
  "Other",
] as const;

const PORTION_CHIPS = [
  { amount: "1/4", unit: "cups" as const },
  { amount: "1/2", unit: "cups" as const },
  { amount: "1", unit: "cups" as const },
  { amount: "1.5", unit: "cups" as const },
  { amount: "2", unit: "cups" as const },
  { amount: "50", unit: "grams" as const },
  { amount: "100", unit: "grams" as const },
  { amount: "150", unit: "grams" as const },
];

const COMMON_TIMES = ["07:00", "08:00", "12:00", "17:00", "18:00"];

export function FeedingSection({
  formData,
  updateFormData,
  onNext,
  onBack,
  isLastSection,
}: FeedingSectionProps) {
  const feeding = formData.feedingInstructions || {
    foodType: "",
    portionSize: "",
    portionUnit: "cups",
    feedingSchedule: [],
  };

  const [newTime, setNewTime] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const handleUpdate = (updates: Partial<FeedingInstruction>) => {
    updateFormData({
      feedingInstructions: { ...feeding, ...updates },
    });
  };

  const setFoodType = (value: string) => {
    handleUpdate({ foodType: value });
  };

  const setPortion = (amount: string, unit: "cups" | "grams") => {
    handleUpdate({ portionSize: amount, portionUnit: unit });
  };

  const handleAddFeedingTime = () => {
    const time = newTime || (COMMON_TIMES.length > 0 ? COMMON_TIMES[0] : "08:00");
    const amount = newAmount || feeding.portionSize || "1";
    if (!time) return;
    handleUpdate({
      feedingSchedule: [...feeding.feedingSchedule, { time, amount }],
    });
    setNewTime("");
    setNewAmount("");
  };

  const handleRemoveFeedingTime = (index: number) => {
    handleUpdate({
      feedingSchedule: feeding.feedingSchedule.filter((_, i) => i !== index),
    });
  };

  const addCommonTime = (time: string) => {
    handleUpdate({
      feedingSchedule: [...feeding.feedingSchedule, { time, amount: feeding.portionSize || "1" }],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feeding</CardTitle>
        <CardDescription>
          Tap to select — quick setup for {formData.petName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Food type</Label>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPE_CHIPS.map((label) => {
              const isSelected = feeding.foodType === label || (label === "Other" && feeding.foodType && !FOOD_TYPE_CHIPS.slice(0, -1).includes(feeding.foodType as any));
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFoodType(label)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {(feeding.foodType === "Other" || (feeding.foodType && !FOOD_TYPE_CHIPS.includes(feeding.foodType as any))) && (
            <Input
              value={feeding.foodType}
              onChange={(e) => handleUpdate({ foodType: e.target.value })}
              placeholder="e.g., Purina Pro Plan"
              className="mt-2 max-w-xs"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Portion per feeding</Label>
          <div className="flex flex-wrap gap-2">
            {PORTION_CHIPS.map(({ amount, unit }) => {
              const isSelected = feeding.portionSize === amount && feeding.portionUnit === unit;
              return (
                <button
                  key={`${amount}-${unit}`}
                  type="button"
                  onClick={() => setPortion(amount, unit)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"
                  )}
                >
                  {amount} {unit}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              type="text"
              value={feeding.portionSize}
              onChange={(e) => handleUpdate({ portionSize: e.target.value })}
              placeholder="Custom amount"
              className="w-24"
            />
            <select
              className="h-9 rounded-md border px-3"
              value={feeding.portionUnit}
              onChange={(e) => handleUpdate({ portionUnit: e.target.value as "cups" | "grams" | "other" })}
            >
              <option value="cups">cups</option>
              <option value="grams">grams</option>
              <option value="other">other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Feeding times</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_TIMES.map((time) => {
              const label = new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => addCommonTime(time)}
                  className="rounded-full border border-input px-3 py-1.5 text-sm hover:bg-accent"
                >
                  + {label}
                </button>
              );
            })}
          </div>
          {feeding.feedingSchedule.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {feeding.feedingSchedule.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <span>
                    {new Date(`2000-01-01T${s.time}`).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    — {s.amount} {feeding.portionUnit}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveFeedingTime(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 flex-wrap items-center mt-2">
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-32"
            />
            <Input
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Amount"
              className="w-20"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddFeedingTime}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Pre-portioned bags</Label>
            <p className="text-xs text-muted-foreground">Bringing bagged meals?</p>
          </div>
          <div className="flex items-center gap-2">
            {feeding.prePortionedBagCount != null && feeding.prePortionedBagCount > 0 && (
              <Input
                type="number"
                min={1}
                max={30}
                value={feeding.prePortionedBagCount}
                onChange={(e) => handleUpdate({ prePortionedBagCount: parseInt(e.target.value, 10) || undefined })}
                className="w-16 text-center"
              />
            )}
            <Switch
              checked={feeding.prePortionedBagCount != null && feeding.prePortionedBagCount > 0}
              onCheckedChange={(checked) =>
                handleUpdate({ prePortionedBagCount: checked ? 1 : undefined })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Notes (optional)</Label>
          <Input
            value={feeding.notes || ""}
            onChange={(e) => handleUpdate({ notes: e.target.value })}
            placeholder="e.g., Mix with warm water"
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
