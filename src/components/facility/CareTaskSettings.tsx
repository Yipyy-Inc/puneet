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
import { useCareTaskFeedback } from "@/hooks/use-care-task-feedback";
import type { CareTaskFeedbackOption } from "@/lib/settings/care-task-feedback";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";

// The domain's option type, not a local one: an option carries an optional
// `tone` the badge is coloured from, and a local `{value,label}` would have
// STRIPPED it on the first save — quietly turning every coloured chip grey.
type FeedbackOption = CareTaskFeedbackOption;

/**
 * Waits for the facility's own options before seeding anything.
 *
 * `useFacilitySettings` answers with the documented defaults while the request
 * is in flight, and `useState` captures ONCE — so seeding before the row lands
 * holds the SHIPPED list, and the first Save writes it over whatever the
 * facility had. A load delay becomes data loss (check:settings-seeding, which
 * exists because this happened three times in one day).
 */
export function CareTaskSettings() {
  const { feedback, save, isPending } = useCareTaskFeedback();
  const t = useSettingsText().section("care-tasks");

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy>
        <div>
          <h2 className="text-lg font-semibold">{t("feedbackTitle")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("feedbackHelp")}
          </p>
        </div>
        <div className="bg-muted/40 h-40 animate-pulse rounded-2xl motion-reduce:animate-none" />
        <div className="bg-muted/40 h-40 animate-pulse rounded-2xl motion-reduce:animate-none" />
      </div>
    );
  }

  return <CareTaskFeedbackForm initial={feedback} save={save} />;
}

function CareTaskFeedbackForm({
  initial,
  save,
}: {
  initial: { feeding: FeedbackOption[]; medication: FeedbackOption[] };
  save: (next: {
    feeding: FeedbackOption[];
    medication: FeedbackOption[];
  }) => Promise<boolean>;
}) {
  const t = useSettingsText().section("care-tasks");
  const [feedingOptions, setFeedingOptions] = useState<FeedbackOption[]>(
    initial.feeding,
  );
  const [medOptions, setMedOptions] = useState<FeedbackOption[]>(
    initial.medication,
  );
  const [newFeeding, setNewFeeding] = useState("");
  const [newMed, setNewMed] = useState("");
  const [saving, setSaving] = useState(false);
  // Snapshot of the last-saved state; dirty is derived by comparing to it, so
  // every edit (add/rename/delete) flips the sticky banner automatically.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      feeding: initial.feeding,
      medication: initial.medication,
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

  // ── IT REACHES THE DATABASE NOW ───────────────────────────────────────
  //
  // This used to be `facilityConfig.careTaskFeedback.feeding = feedingOptions`
  // — an assignment into an imported object literal, which the React Compiler
  // later refused, so it was deleted and the screen was left flashing
  // "Feedback options saved" over nothing at all.
  //
  // It would not have worked before that either: every reader captured the
  // list in a MODULE-LEVEL const, read once when its module was first
  // evaluated. An edit here had never changed a dropdown a staff member sees.
  //
  // `care_task_feedback` is a facility_settings domain now, and the two screens
  // that OFFER the choice — FeedingLogModal and MedicationLogModal — read it
  // through `useCareTaskFeedback`. The toast waits for the row.
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await save({ feeding: feedingOptions, medication: medOptions });
    setSaving(false);
    if (!ok) {
      // The options on screen are left exactly as typed: the edit is not lost
      // because the save was refused, and the banner stays up to say so.
      toast.error(t("feedbackNotSaved"));
      return;
    }
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
          <Button onClick={handleSave} loading={saving} className="gap-1.5">
            {t("saveChanges")}
          </Button>
        </div>
      )}
    </div>
  );
}
