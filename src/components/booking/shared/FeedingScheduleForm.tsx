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
import type { FeedingScheduleItem } from "@/lib/types";

export interface PetOption {
  id: number;
  name: string;
  type?: string;
}

interface FeedingScheduleFormProps {
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (schedule: FeedingScheduleItem[]) => void;
  selectedPets: PetOption[];
  /** Optional compact layout */
  compact?: boolean;
}

const TIME_OPTIONS = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
  { value: "Noon", label: "Noon" },
  { value: "Evening", label: "Evening" },
];

const UNIT_OPTIONS = [
  { value: "cup", label: "Cup" },
  { value: "oz", label: "Oz" },
  { value: "g", label: "Grams" },
  { value: "scoop", label: "Scoop" },
];

const TYPE_OPTIONS = [
  { value: "dry", label: "Dry Food" },
  { value: "wet", label: "Wet Food" },
  { value: "raw", label: "Raw Food" },
  { value: "treats", label: "Treats" },
];

const SOURCE_OPTIONS = [
  { value: "owner", label: "Owner Provides" },
  { value: "facility", label: "Facility Provides" },
];

const INSTRUCTIONS_OPTIONS = [
  { value: "slow_feed", label: "Slow Feed" },
  { value: "separate", label: "Feed Separately" },
  { value: "mixed", label: "Mix with Water" },
  { value: "normal", label: "Normal" },
];

function createEmptyItem(defaultPetId?: number): FeedingScheduleItem {
  return {
    id: `feeding-${Date.now()}`,
    petId: defaultPetId,
    name: "",
    time: "",
    amount: "",
    unit: "",
    type: "",
    source: "",
    instructions: "",
    notes: "",
  };
}

export function FeedingScheduleForm({
  feedingSchedule,
  setFeedingSchedule,
  selectedPets,
  compact = false,
}: FeedingScheduleFormProps) {
  const update = (index: number, patch: Partial<FeedingScheduleItem>) => {
    const updated = [...feedingSchedule];
    updated[index] = { ...updated[index], ...patch };
    setFeedingSchedule(updated);
  };

  const add = () => {
    setFeedingSchedule([
      ...feedingSchedule,
      createEmptyItem(
        selectedPets.length === 1 ? selectedPets[0].id : undefined
      ),
    ]);
  };

  const remove = (index: number) => {
    setFeedingSchedule(feedingSchedule.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Feeding Instructions</h4>
      <div className="space-y-3">
        {feedingSchedule.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-orange-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">Feeding Schedule</h4>
                    <p className="text-xs text-muted-foreground">
                      Daily feeding routine
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
                      placeholder="e.g., Morning Feeding"
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
                  Feeding Details
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Time</Label>
                    <Select
                      value={item.time}
                      onValueChange={(value) => update(index, { time: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Amount</Label>
                    <Input
                      value={item.amount}
                      onChange={(e) => update(index, { amount: e.target.value })}
                      placeholder="e.g., 1"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(value) => update(index, { unit: value })}
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
                  Food Details
                </h5>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Type</Label>
                      <Select
                        value={item.type}
                        onValueChange={(value) => update(index, { type: value })}
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
                      <Label className="text-xs font-medium">Source</Label>
                      <Select
                        value={item.source}
                        onValueChange={(value) =>
                          update(index, { source: value })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                <Label className="text-xs font-medium">Feeding Notes</Label>
                <Textarea
                  value={item.notes}
                  onChange={(e) => update(index, { notes: e.target.value })}
                  placeholder="Additional notes about feeding routine..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        <Button type="button" variant="outline" onClick={add} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Feeding Schedule
        </Button>
      </div>
    </div>
  );
}
