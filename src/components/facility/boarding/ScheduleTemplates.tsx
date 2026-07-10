"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, LayoutTemplate, Play } from "lucide-react";
import { BUILT_IN_TEMPLATES } from "@/data/daily-care-templates";
import type { DailyCareStep } from "@/types/boarding";

type SavedTemplate = { id: string; name: string; steps: DailyCareStep[] };

type Props = {
  savedTemplates: SavedTemplate[];
  /** Whether the live schedule has any steps to save. */
  hasSteps: boolean;
  onSave: (name: string) => void;
  /** Apply a template's steps; `days` = restrict to those weekdays, or null. */
  onApply: (steps: DailyCareStep[], days: number[] | null) => void;
  onDelete: (id: string) => void;
};

const DAYS: { value: number; label: string }[] = [
  { value: 0, label: "Su" },
  { value: 1, label: "Mo" },
  { value: 2, label: "Tu" },
  { value: 3, label: "We" },
  { value: 4, label: "Th" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
];

function TemplateRow({
  name,
  description,
  count,
  badge,
  onApply,
  onDelete,
}: {
  name: string;
  description?: string;
  count: number;
  badge: string;
  onApply: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      <LayoutTemplate className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <Badge variant="secondary" className="text-[10px]">
            {badge}
          </Badge>
        </div>
        <p className="text-muted-foreground truncate text-xs">
          {count} {count === 1 ? "step" : "steps"}
          {description ? ` · ${description}` : ""}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={onApply}
      >
        <Play className="size-3" />
        Apply
      </Button>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-7"
          onClick={onDelete}
          title="Delete template"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export function ScheduleTemplates({
  savedTemplates,
  hasSteps,
  onSave,
  onApply,
  onDelete,
}: Props) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [applyTarget, setApplyTarget] = useState<{
    name: string;
    steps: DailyCareStep[];
  } | null>(null);
  const [applyDays, setApplyDays] = useState<number[]>([]);

  function confirmSave() {
    const trimmed = templateName.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setTemplateName("");
    setSaveOpen(false);
  }

  function openApply(name: string, steps: DailyCareStep[]) {
    setApplyTarget({ name, steps });
    setApplyDays([]);
  }

  function confirmApply() {
    if (!applyTarget) return;
    onApply(applyTarget.steps, applyDays.length > 0 ? applyDays : null);
    setApplyTarget(null);
  }

  function toggleApplyDay(d: number) {
    setApplyDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">Schedule Templates</Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Save the current schedule as a template, or apply a saved / starter
            template to the live schedule.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSteps}
          onClick={() => setSaveOpen(true)}
        >
          <Save className="mr-2 size-4" />
          Save as template
        </Button>
      </div>

      {savedTemplates.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            Saved
          </p>
          {savedTemplates.map((t) => (
            <TemplateRow
              key={t.id}
              name={t.name}
              count={t.steps.length}
              badge="Saved"
              onApply={() => openApply(t.name, t.steps)}
              onDelete={() => onDelete(t.id)}
            />
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          Starter templates
        </p>
        {BUILT_IN_TEMPLATES.map((t) => (
          <TemplateRow
            key={t.id}
            name={t.name}
            description={t.description}
            count={t.steps.length}
            badge="Starter"
            onApply={() => openApply(t.name, t.steps)}
          />
        ))}
      </div>

      {/* Save-as-template dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Saves the current schedule so you can reapply it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="template-name" className="text-xs">
              Template name
            </Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Summer Weekday Routine"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSave} disabled={!templateName.trim()}>
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply-template dialog */}
      <Dialog
        open={applyTarget !== null}
        onOpenChange={(o) => {
          if (!o) setApplyTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply &ldquo;{applyTarget?.name}&rdquo;</DialogTitle>
            <DialogDescription>
              This replaces the current schedule with the template&rsquo;s{" "}
              {applyTarget?.steps.length ?? 0} steps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Run only on specific days{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const selected = applyDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleApplyDay(d.value)}
                    data-selected={selected}
                    className="data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=false]:text-muted-foreground size-9 rounded-md border text-xs font-medium transition-colors"
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[11px]">
              {applyDays.length === 0
                ? "Applied steps run every day."
                : `Applied steps run on ${applyDays.length} ${
                    applyDays.length === 1 ? "day" : "days"
                  } only.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApplyTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmApply}>Apply template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
