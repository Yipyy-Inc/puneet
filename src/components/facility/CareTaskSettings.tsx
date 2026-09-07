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
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";

interface FeedbackOption {
  value: string;
  label: string;
}

export function CareTaskSettings() {
  const t = useSettingsText().section("care-tasks");
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
      toast.error(t("duplicateOption"));
      return;
    }
    setFeedingOptions((prev) => [...prev, { value, label: newFeeding.trim() }]);
    setNewFeeding("");
    toast.success(t("feedingOptionAdded"));
  };

  const handleAddMed = () => {
    if (!newMed.trim()) return;
    const value = newMed.trim().toLowerCase().replace(/\s+/g, "_");
    if (medOptions.some((o) => o.value === value)) {
      toast.error(t("duplicateOption"));
      return;
    }
    setMedOptions((prev) => [...prev, { value, label: newMed.trim() }]);
    setNewMed("");
    toast.success(t("medicationOptionAdded"));
  };

  const handleSave = () => {
    // ── THIS ASSIGNED TO THE IMPORTED FIXTURE, AND REACHED NOBODY ─────────
    //
    // It was `facilityConfig.careTaskFeedback.feeding = feedingOptions`, which
    // the React Compiler refuses (react-hooks/immutability) now that this scope
    // is analysed. Removing it costs nothing measurable: all three consumers —
    // CareTasks.tsx:95-96 and FeedingSection.tsx:58 — capture the list in a
    // MODULE-LEVEL const, so they read it once when their module is first
    // evaluated and never see a later mutation. Editing a feedback option here
    // has never changed the dropdown a staff member sees, in this session or
    // any other.
    //
    // The screen still needs a `care_task_feedback` settings domain and those
    // three reads moved onto it. Recorded in the debt map; this file is
    // already in check:success-claims' baseline for the toast below.
    setSavedSnapshot(
      JSON.stringify({ feeding: feedingOptions, medication: medOptions }),
    );
    toast.success(t("feedbackSaved"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("feedbackTitle")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("feedbackHelp")}
        </p>
      </div>

      {/* Feeding Feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UtensilsCrossed className="size-4" />
            {t("feedingFeedback")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            {t("feedingFeedbackHelp")}
          </p>
          <p className="text-muted-foreground text-xs">
            <InterpolatedText
              template={t("portionNote")}
              placeholder="{reference}"
            >
              <span className="text-foreground font-medium">
                {t("portionReference")}
              </span>
            </InterpolatedText>
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
                      toast.error(t("atLeastOne"));
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
              placeholder={t("addOptionPlaceholder")}
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
              {t("add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Medication Feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Pill className="size-4" />
            {t("medicationFeedback")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            {t("medicationFeedbackHelp")}
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
                      toast.error(t("atLeastOne"));
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
              placeholder={t("addOptionPlaceholder")}
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
              {t("add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sticky save banner — appears whenever there are unsaved changes */}
      {dirty && (
        <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t py-3 backdrop-blur-sm">
          <span className="text-muted-foreground mr-auto text-sm">
            {t("unsavedChanges")}
          </span>
          <Button onClick={handleSave} className="gap-1.5">
            {t("saveChanges")}
          </Button>
        </div>
      )}
    </div>
  );
}
