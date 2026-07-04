"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UtensilsCrossed,
  Pill,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";

interface FeedbackOption {
  value: string;
  label: string;
}

export function CareTaskSettings() {
  const [feedingOptions, setFeedingOptions] = useState<FeedbackOption[]>(
    facilityConfig.careTaskFeedback.feeding,
  );
  const [medOptions, setMedOptions] = useState<FeedbackOption[]>(
    facilityConfig.careTaskFeedback.medication,
  );
  const [newFeeding, setNewFeeding] = useState("");
  const [newMed, setNewMed] = useState("");
  // Snapshot of the last-saved state; dirty is derived by comparing to it, so
  // every edit (add/rename/delete) flips the sticky banner automatically.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      feeding: facilityConfig.careTaskFeedback.feeding,
      medication: facilityConfig.careTaskFeedback.medication,
    }),
  );
  const dirty =
    JSON.stringify({ feeding: feedingOptions, medication: medOptions }) !==
    savedSnapshot;

  const handleAddFeeding = () => {
    if (!newFeeding.trim()) return;
    const value = newFeeding.trim().toLowerCase().replace(/\s+/g, "_");
    if (feedingOptions.some((o) => o.value === value)) {
      toast.error("This option already exists");
      return;
    }
    setFeedingOptions((prev) => [...prev, { value, label: newFeeding.trim() }]);
    setNewFeeding("");
    toast.success("Feeding option added");
  };

  const handleAddMed = () => {
    if (!newMed.trim()) return;
    const value = newMed.trim().toLowerCase().replace(/\s+/g, "_");
    if (medOptions.some((o) => o.value === value)) {
      toast.error("This option already exists");
      return;
    }
    setMedOptions((prev) => [...prev, { value, label: newMed.trim() }]);
    setNewMed("");
    toast.success("Medication option added");
  };

  const handleSave = () => {
    // In production: save to API/database
    // For now: update the in-memory config
    facilityConfig.careTaskFeedback.feeding = feedingOptions;
    facilityConfig.careTaskFeedback.medication = medOptions;
    setSavedSnapshot(
      JSON.stringify({ feeding: feedingOptions, medication: medOptions }),
    );
    toast.success("Care task feedback options saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Care Task Feedback</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Customize the feedback options staff see when logging feeding and
          medication tasks. These appear as dropdown choices on the booking
          detail page.
        </p>
      </div>

      {/* Feeding Feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UtensilsCrossed className="size-4" />
            Feeding Feedback Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Staff selects one of these when logging a meal. Drag to reorder.
          </p>
          <p className="text-muted-foreground text-xs">
            Any percentage is a{" "}
            <span className="text-foreground font-medium">
              portion-of-meal reference
            </span>{" "}
            — how much of the meal the pet ate (100% = the full meal). It is not
            a historical usage rate.
          </p>
          <div className="space-y-1.5">
            {feedingOptions.map((opt, idx) => (
              <div
                key={opt.value}
                className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <GripVertical className="text-muted-foreground/40 size-4 shrink-0" />
                <Input
                  value={opt.label}
                  onChange={(e) => {
                    setFeedingOptions((prev) =>
                      prev.map((o, i) =>
                        i === idx ? { ...o, label: e.target.value } : o,
                      ),
                    );
                  }}
                  className="h-8 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                  onClick={() => {
                    if (feedingOptions.length <= 1) {
                      toast.error("Must have at least one option");
                      return;
                    }
                    setFeedingOptions((prev) =>
                      prev.filter((_, i) => i !== idx),
                    );
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newFeeding}
              onChange={(e) => setNewFeeding(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFeeding();
              }}
              placeholder="Add new option..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1"
              onClick={handleAddFeeding}
              disabled={!newFeeding.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Medication Feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Pill className="size-4" />
            Medication Feedback Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Staff selects one of these when logging a medication dose.
          </p>
          <div className="space-y-1.5">
            {medOptions.map((opt, idx) => (
              <div
                key={opt.value}
                className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <GripVertical className="text-muted-foreground/40 size-4 shrink-0" />
                <Input
                  value={opt.label}
                  onChange={(e) => {
                    setMedOptions((prev) =>
                      prev.map((o, i) =>
                        i === idx ? { ...o, label: e.target.value } : o,
                      ),
                    );
                  }}
                  className="h-8 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                  onClick={() => {
                    if (medOptions.length <= 1) {
                      toast.error("Must have at least one option");
                      return;
                    }
                    setMedOptions((prev) => prev.filter((_, i) => i !== idx));
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newMed}
              onChange={(e) => setNewMed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddMed();
              }}
              placeholder="Add new option..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1"
              onClick={handleAddMed}
              disabled={!newMed.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sticky save banner — appears whenever there are unsaved changes */}
      {dirty && (
        <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t py-3 backdrop-blur-sm">
          <span className="text-muted-foreground mr-auto text-sm">
            You have unsaved changes
          </span>
          <Button onClick={handleSave} className="gap-1.5">
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
