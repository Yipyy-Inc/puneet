"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
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
  isSubmitting: boolean;
  isLastSection: boolean;
}

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

  const [newFeedingTime, setNewFeedingTime] = useState({ time: "", amount: "" });

  const handleUpdate = (updates: Partial<FeedingInstruction>) => {
    updateFormData({
      feedingInstructions: { ...feeding, ...updates },
    });
  };

  const handleAddFeedingTime = () => {
    if (!newFeedingTime.time || !newFeedingTime.amount) return;
    
    handleUpdate({
      feedingSchedule: [...feeding.feedingSchedule, newFeedingTime],
    });
    setNewFeedingTime({ time: "", amount: "" });
  };

  const handleRemoveFeedingTime = (index: number) => {
    handleUpdate({
      feedingSchedule: feeding.feedingSchedule.filter((_, i) => i !== index),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feeding Instructions</CardTitle>
        <CardDescription>
          Provide feeding details for {formData.petName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Food Type</Label>
          <Input
            value={feeding.foodType}
            onChange={(e) => handleUpdate({ foodType: e.target.value })}
            placeholder="e.g., Purina Pro Plan, Royal Canin"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Portion Size</Label>
            <Input
              type="number"
              value={feeding.portionSize}
              onChange={(e) => handleUpdate({ portionSize: e.target.value })}
              placeholder="e.g., 2"
            />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <select
              className="w-full h-10 px-3 border rounded-md"
              value={feeding.portionUnit}
              onChange={(e) =>
                handleUpdate({ portionUnit: e.target.value as "cups" | "grams" | "other" })
              }
            >
              <option value="cups">Cups</option>
              <option value="grams">Grams</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Feeding Schedule</Label>
          {feeding.feedingSchedule.map((schedule, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={schedule.time}
                disabled
                className="flex-1"
              />
              <Input
                value={schedule.amount}
                disabled
                placeholder="Amount"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFeedingTime(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={newFeedingTime.time}
              onChange={(e) =>
                setNewFeedingTime({ ...newFeedingTime, time: e.target.value })
              }
              className="flex-1"
            />
            <Input
              value={newFeedingTime.amount}
              onChange={(e) =>
                setNewFeedingTime({ ...newFeedingTime, amount: e.target.value })
              }
              placeholder="Amount"
              className="flex-1"
            />
            <Button onClick={handleAddFeedingTime} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pre-portioned Bag Count (optional)</Label>
          <Input
            type="number"
            min="0"
            value={feeding.prePortionedBagCount || ""}
            onChange={(e) =>
              handleUpdate({
                prePortionedBagCount: parseInt(e.target.value) || undefined,
              })
            }
            placeholder="e.g., 3"
          />
        </div>

        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            value={feeding.notes || ""}
            onChange={(e) => handleUpdate({ notes: e.target.value })}
            placeholder="Any additional feeding instructions..."
            rows={3}
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
