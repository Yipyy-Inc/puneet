"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Utensils,
  Pill,
  Plus,
  Trash2,
  Pencil,
  Check,
  ChevronUp,
  ChevronDown,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { getCareTasksConfig } from "@/data/care-tasks";
import { careTaskMutations } from "@/lib/api/care-tasks";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { formatTime } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type {
  ScheduleItem,
  FeedingOptions,
  MedicationOptions,
} from "@/data/care-tasks";

// ── Helpers ──────────────────────────────────────────────────────────

function moveItem<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const swap = idx + dir;
  if (swap < 0 || swap >= arr.length) return arr;
  const next = [...arr];
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
}

function ReorderButtons({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
}) {
  const t = useSettingsText().section("care-tasks");

  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        aria-label={t("moveUp")}
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronUp className="size-3" />
      </button>
      <button
        type="button"
        aria-label={t("moveDown")}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronDown className="size-3" />
      </button>
    </div>
  );
}

// ── String category editor (rename / reorder / delete / add) ─────────

function StringTagEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <ReorderButtons
            index={i}
            count={items.length}
            onMove={(dir) => onChange(moveItem(items, i, dir))}
          />
          <Input
            value={item}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? e.target.value : x)))
            }
            className="h-8 flex-1 text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive size-8 shrink-0 p-0"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          disabled={!draft.trim()}
          onClick={add}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Schedule category editor (label + time) ──────────────────────────

function ScheduleTagEditor({
  items,
  onChange,
}: {
  items: ScheduleItem[];
  onChange: (values: ScheduleItem[]) => void;
}) {
  const t = useSettingsText().section("care-tasks");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftTime, setDraftTime] = useState("08:00");
  const add = () => {
    if (!draftLabel.trim()) return;
    onChange([...items, { label: draftLabel.trim(), time: draftTime }]);
    setDraftLabel("");
    setDraftTime("08:00");
  };
  const patch = (i: number, p: Partial<ScheduleItem>) =>
    onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={item.id ?? i} className="flex items-center gap-1.5">
          <ReorderButtons
            index={i}
            count={items.length}
            onMove={(dir) => onChange(moveItem(items, i, dir))}
          />
          <Input
            value={item.label}
            onChange={(e) => patch(i, { label: e.target.value })}
            className="h-8 flex-1 text-sm"
            placeholder={t("label")}
          />
          <input
            type="time"
            value={item.time}
            onChange={(e) => patch(i, { time: e.target.value })}
            className="border-border h-8 rounded-md border px-2 text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive size-8 shrink-0 p-0"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={t("phSchedule")}
          className="h-8 flex-1 text-sm"
        />
        <input
          type="time"
          value={draftTime}
          onChange={(e) => setDraftTime(e.target.value)}
          className="border-border h-8 rounded-md border px-2 text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          disabled={!draftLabel.trim()}
          onClick={add}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Category group: read-only tags + per-category Edit ───────────────

function CategoryGroup({
  label,
  count,
  editing,
  onToggle,
  readOnly,
  editor,
}: {
  label: string;
  count: number;
  editing: boolean;
  onToggle: () => void;
  readOnly: React.ReactNode;
  editor: React.ReactNode;
}) {
  const t = useSettingsText().section("care-tasks");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            {label}
          </p>
          <Badge variant="secondary" className="text-[10px]">
            {count}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={onToggle}
        >
          {editing ? (
            <>
              <Check className="size-3" />
              {t("done")}
            </>
          ) : (
            <>
              <Pencil className="size-3" />
              {t("edit")}
            </>
          )}
        </Button>
      </div>
      {editing ? editor : readOnly}
    </div>
  );
}

function StringTags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v) => (
        <Badge key={v} variant="outline" className="text-xs">
          {v}
        </Badge>
      ))}
    </div>
  );
}

/** "HH:mm" as a Date on an arbitrary day, so Intl can format the time. */
function atTime(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((n) => Number(n) || 0);
  return new Date(2000, 0, 1, h, m);
}

function ScheduleTags({
  items,
  locale,
}: {
  items: ScheduleItem[];
  locale: AppLocale;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <Badge key={s.id ?? i} variant="outline" className="gap-1 text-xs">
          <Clock className="size-2.5" />
          {s.label} ({formatTime(atTime(s.time), locale)})
        </Badge>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function FeedingMedicationConfig() {
  const { locale, section } = useSettingsText();
  const t = section("care-tasks");
  const [feeding, setFeeding] = useState<FeedingOptions>(
    () => getCareTasksConfig().feeding,
  );
  const [medication, setMedication] = useState<MedicationOptions>(
    () => getCareTasksConfig().medication,
  );
  const [editingCat, setEditingCat] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const save = useMutation({
    ...careTaskMutations.save(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-tasks"] });
    },
  });

  const setFeedingList = <K extends keyof FeedingOptions>(
    key: K,
    values: FeedingOptions[K],
  ) => {
    const next = { ...feeding, [key]: values };
    setFeeding(next);
    save.mutate({ feeding: next, medication });
  };

  const setMedList = <K extends keyof MedicationOptions>(
    key: K,
    values: MedicationOptions[K],
  ) => {
    const next = { ...medication, [key]: values };
    setMedication(next);
    save.mutate({ feeding, medication: next });
  };

  const toggle = (cat: string) =>
    setEditingCat((c) => {
      if (c === cat) {
        toast.success(t("changesSaved"));
        return null;
      }
      return cat;
    });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-orange-100">
          <Utensils className="size-4 text-orange-700" />
        </div>
        <div>
          <h3 className="text-sm font-bold">{t("optionsTitle")}</h3>
          <p className="text-muted-foreground text-xs">{t("optionsHelp")}</p>
        </div>
      </div>

      {/* Feeding */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-100">
              <Utensils className="size-4 text-orange-700" />
            </div>
            {t("feeding")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <CategoryGroup
            label={t("catSchedules")}
            count={feeding.schedules.length}
            editing={editingCat === "schedules"}
            onToggle={() => toggle("schedules")}
            readOnly={
              <ScheduleTags items={feeding.schedules} locale={locale} />
            }
            editor={
              <ScheduleTagEditor
                items={feeding.schedules}
                onChange={(v) => setFeedingList("schedules", v)}
              />
            }
          />
          <CategoryGroup
            label={t("catUnits")}
            count={feeding.units.length}
            editing={editingCat === "units"}
            onToggle={() => toggle("units")}
            readOnly={<StringTags items={feeding.units} />}
            editor={
              <StringTagEditor
                items={feeding.units}
                onChange={(v) => setFeedingList("units", v)}
                placeholder={t("phUnits")}
              />
            }
          />
          <CategoryGroup
            label={t("catFoodTypes")}
            count={feeding.foodTypes.length}
            editing={editingCat === "foodTypes"}
            onToggle={() => toggle("foodTypes")}
            readOnly={<StringTags items={feeding.foodTypes} />}
            editor={
              <StringTagEditor
                items={feeding.foodTypes}
                onChange={(v) => setFeedingList("foodTypes", v)}
                placeholder={t("phFoodTypes")}
              />
            }
          />
          <CategoryGroup
            label={t("catInstructions")}
            count={feeding.instructions.length}
            editing={editingCat === "instructions"}
            onToggle={() => toggle("instructions")}
            readOnly={<StringTags items={feeding.instructions} />}
            editor={
              <StringTagEditor
                items={feeding.instructions}
                onChange={(v) => setFeedingList("instructions", v)}
                placeholder={t("phInstructions")}
              />
            }
          />
          <CategoryGroup
            label={t("catSources")}
            count={feeding.sources.length}
            editing={editingCat === "sources"}
            onToggle={() => toggle("sources")}
            readOnly={<StringTags items={feeding.sources} />}
            editor={
              <StringTagEditor
                items={feeding.sources}
                onChange={(v) => setFeedingList("sources", v)}
                placeholder={t("phSources")}
              />
            }
          />
          <CategoryGroup
            label={t("catDestinations")}
            count={feeding.destinations.length}
            editing={editingCat === "destinations"}
            onToggle={() => toggle("destinations")}
            readOnly={<StringTags items={feeding.destinations} />}
            editor={
              <StringTagEditor
                items={feeding.destinations}
                onChange={(v) => setFeedingList("destinations", v)}
                placeholder={t("phDestinations")}
              />
            }
          />
          <CategoryGroup
            label={t("catFrequencies")}
            count={feeding.frequencies.length}
            editing={editingCat === "feeding-frequencies"}
            onToggle={() => toggle("feeding-frequencies")}
            readOnly={<StringTags items={feeding.frequencies} />}
            editor={
              <StringTagEditor
                items={feeding.frequencies}
                onChange={(v) => setFeedingList("frequencies", v)}
                placeholder={t("phFrequencies")}
              />
            }
          />
          <CategoryGroup
            label={t("catAllowedProteins")}
            count={feeding.allowedProteins.length}
            editing={editingCat === "allowedProteins"}
            onToggle={() => toggle("allowedProteins")}
            readOnly={<StringTags items={feeding.allowedProteins} />}
            editor={
              <StringTagEditor
                items={feeding.allowedProteins}
                onChange={(v) => setFeedingList("allowedProteins", v)}
                placeholder={t("phProteins")}
              />
            }
          />
          <CategoryGroup
            label={t("catAllergyPresets")}
            count={feeding.allergyPresets.length}
            editing={editingCat === "allergyPresets"}
            onToggle={() => toggle("allergyPresets")}
            readOnly={<StringTags items={feeding.allergyPresets} />}
            editor={
              <StringTagEditor
                items={feeding.allergyPresets}
                onChange={(v) => setFeedingList("allergyPresets", v)}
                placeholder={t("phAllergies")}
              />
            }
          />
        </CardContent>
      </Card>

      {/* Medication */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
              <Pill className="size-4 text-violet-700" />
            </div>
            {t("medication")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <CategoryGroup
            label={t("catMethods")}
            count={medication.methods.length}
            editing={editingCat === "methods"}
            onToggle={() => toggle("methods")}
            readOnly={<StringTags items={medication.methods} />}
            editor={
              <StringTagEditor
                items={medication.methods}
                onChange={(v) => setMedList("methods", v)}
                placeholder={t("phMethods")}
              />
            }
          />
          <CategoryGroup
            label={t("catFrequencies")}
            count={medication.frequencies.length}
            editing={editingCat === "frequencies"}
            onToggle={() => toggle("frequencies")}
            readOnly={<StringTags items={medication.frequencies} />}
            editor={
              <StringTagEditor
                items={medication.frequencies}
                onChange={(v) => setMedList("frequencies", v)}
                placeholder={t("phMedFrequencies")}
              />
            }
          />
          <CategoryGroup
            label={t("catQuickTimes")}
            count={medication.quickTimes.length}
            editing={editingCat === "quickTimes"}
            onToggle={() => toggle("quickTimes")}
            readOnly={
              <ScheduleTags items={medication.quickTimes} locale={locale} />
            }
            editor={
              <ScheduleTagEditor
                items={medication.quickTimes}
                onChange={(v) => setMedList("quickTimes", v)}
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
