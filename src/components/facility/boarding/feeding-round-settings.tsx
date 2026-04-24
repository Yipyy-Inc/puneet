"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Save, Edit, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { facilityFeedingConfig } from "@/data/boarding";
import type { FacilityFeedingConfig, FeedingSlot } from "@/types/boarding";

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h_ = h ?? 0;
  return `${h_ % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h_ < 12 ? "AM" : "PM"}`;
}

export function FeedingRoundSettings() {
  const [config, setConfig] = useState<FacilityFeedingConfig>(facilityFeedingConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("");

  const sortedSlots = [...config.slots].sort((a, b) => a.sortOrder - b.sortOrder);

  function updateSlot(id: string, patch: Partial<FeedingSlot>) {
    setConfig((prev) => ({
      ...prev,
      slots: prev.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function removeSlot(id: string) {
    setConfig((prev) => ({
      ...prev,
      slots: prev.slots.filter((s) => s.id !== id),
    }));
  }

  function addSlot() {
    if (!newLabel.trim() || !newTime) return;
    const maxSort = Math.max(0, ...config.slots.map((s) => s.sortOrder));
    setConfig((prev) => ({
      ...prev,
      slots: [
        ...prev.slots,
        {
          id: `slot-${Date.now()}`,
          label: newLabel.trim(),
          time: newTime,
          enabled: true,
          sortOrder: maxSort + 1,
        },
      ],
    }));
    setNewLabel("");
    setNewTime("");
  }

  function handleSave() {
    toast.success("Feeding schedule saved");
    setIsEditing(false);
  }

  function handleCancel() {
    setConfig(facilityFeedingConfig);
    setIsEditing(false);
    setNewLabel("");
    setNewTime("");
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Feeding Rounds</CardTitle>
            <CardDescription>
              Configure the daily meal slots for your facility. Staff use these
              rounds when feeding boarded guests. Each facility can define its
              own schedule — 1, 2, or 3 meals per day.
            </CardDescription>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="mr-1 size-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-1 size-4" />
                Save
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="mr-1 size-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Slot list */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Meal Slots</Label>
          <p className="text-muted-foreground text-xs">
            Enabled slots appear in the Feeding Rounds checklist. Disabled slots
            are hidden from staff but preserved for future use.
          </p>

          <div className="mt-3 space-y-2">
            {sortedSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <GripVertical className="text-muted-foreground size-4 shrink-0" />

                <Switch
                  checked={slot.enabled}
                  onCheckedChange={(v) =>
                    isEditing && updateSlot(slot.id, { enabled: v })
                  }
                  disabled={!isEditing}
                />

                <Input
                  value={slot.label}
                  onChange={(e) =>
                    updateSlot(slot.id, { label: e.target.value })
                  }
                  className="h-8 w-28"
                  disabled={!isEditing}
                  placeholder="Label"
                />

                <Input
                  type="time"
                  value={slot.time}
                  onChange={(e) =>
                    updateSlot(slot.id, { time: e.target.value })
                  }
                  className="h-8 w-32"
                  disabled={!isEditing}
                />

                {!isEditing && (
                  <span className="text-muted-foreground text-xs">
                    {fmt12(slot.time)}
                  </span>
                )}

                {!slot.enabled && !isEditing && (
                  <Badge variant="secondary" className="text-xs">
                    Disabled
                  </Badge>
                )}

                {isEditing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto h-8 w-8"
                    onClick={() => removeSlot(slot.id)}
                    title="Remove slot"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* Add slot row */}
            {isEditing && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
                <Plus className="text-muted-foreground size-4 shrink-0" />
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Lunch"
                  className="h-8 w-28"
                />
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-8 w-32"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addSlot}
                  disabled={!newLabel.trim() || !newTime}
                  className="h-8"
                >
                  Add Slot
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Options */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Checklist Options</Label>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Medications in Checklist</Label>
              <p className="text-muted-foreground text-sm">
                Display medications due near each slot&apos;s time alongside
                feeding tasks
              </p>
            </div>
            <Switch
              checked={config.showMedicationsInChecklist}
              onCheckedChange={(v) =>
                isEditing &&
                setConfig((prev) => ({
                  ...prev,
                  showMedicationsInChecklist: v,
                }))
              }
              disabled={!isEditing}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Medication Match Window (minutes)</Label>
              <p className="text-muted-foreground text-sm">
                A medication is shown in a slot if its scheduled time falls
                within ±N minutes of the slot time
              </p>
            </div>
            <Input
              type="number"
              min={15}
              max={180}
              step={15}
              value={config.matchWindowMinutes}
              onChange={(e) =>
                isEditing &&
                setConfig((prev) => ({
                  ...prev,
                  matchWindowMinutes: Number(e.target.value) || 90,
                }))
              }
              className="h-8 w-20 shrink-0"
              disabled={!isEditing}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
