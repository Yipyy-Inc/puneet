"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Evaluation } from "@/lib/types";
import { X } from "lucide-react";

type YesNo = "yes" | "no" | "";

type FormState = {
  dogFriendly: YesNo;
  dogFriendlyNotes: string;
  humanFriendly: YesNo;
  humanFriendlyNotes: string;
  energyLevel: "" | "low" | "medium" | "high";
  anxietyLevel: "" | "low" | "medium" | "high";
  reactivity: "" | "low" | "medium" | "high";
  playStyle: "" | "gentle" | "balanced" | "rough" | "chase" | "wrestle";
  temperamentNotes: string;
  internalComments: string;
  playGroup: "" | "small" | "large" | "mixed" | "solo" | "puppies" | "seniors";
  behaviorTags: string[];
  internalWarnings: string[];
};

const defaultState: FormState = {
  dogFriendly: "",
  dogFriendlyNotes: "",
  humanFriendly: "",
  humanFriendlyNotes: "",
  energyLevel: "",
  anxietyLevel: "",
  reactivity: "",
  playStyle: "",
  temperamentNotes: "",
  internalComments: "",
  playGroup: "",
  behaviorTags: [],
  internalWarnings: [],
};

function storageKey(evaluationId: string) {
  return `staff-evaluation-form:${evaluationId}`;
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const nextTag = draft.trim();
    if (!nextTag) return;
    if (value.includes(nextTag)) {
      setDraft("");
      return;
    }
    onChange([...value, nextTag]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                className="ml-1"
                onClick={() => onChange(value.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function StaffEvaluationFormModal({
  open,
  onOpenChange,
  evaluation,
  petName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: Evaluation;
  petName: string;
}) {
  const key = useMemo(() => storageKey(evaluation.id), [evaluation.id]);
  const [form, setForm] = useState<FormState>(defaultState);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setForm({ ...defaultState, ...(JSON.parse(raw) as Partial<FormState>) });
      } else {
        setForm(defaultState);
      }
    } catch {
      setForm(defaultState);
    }
  }, [open, key]);

  const canSave =
    form.dogFriendly !== "" &&
    form.humanFriendly !== "" &&
    form.energyLevel !== "" &&
    form.anxietyLevel !== "" &&
    form.reactivity !== "" &&
    form.playStyle !== "" &&
    form.playGroup !== "";

  const save = () => {
    localStorage.setItem(key, JSON.stringify(form));
    onOpenChange(false);
  };

  return (
    <Modal
      type="form"
      title={`Evaluation Form — ${petName}`}
      description={`Evaluation ID: ${evaluation.id}`}
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Dog-friendly</Label>
            <RadioGroup
              value={form.dogFriendly}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, dogFriendly: v as YesNo }))
              }
              className="grid grid-cols-2 gap-3"
            >
              <label className="flex items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="yes" />
                Yes
              </label>
              <label className="flex items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="no" />
                No
              </label>
            </RadioGroup>
            <Textarea
              placeholder="Optional notes"
              value={form.dogFriendlyNotes}
              onChange={(e) =>
                setForm((p) => ({ ...p, dogFriendlyNotes: e.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            <Label>Human-friendly</Label>
            <RadioGroup
              value={form.humanFriendly}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, humanFriendly: v as YesNo }))
              }
              className="grid grid-cols-2 gap-3"
            >
              <label className="flex items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="yes" />
                Yes
              </label>
              <label className="flex items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="no" />
                No
              </label>
            </RadioGroup>
            <Textarea
              placeholder="Optional notes"
              value={form.humanFriendlyNotes}
              onChange={(e) =>
                setForm((p) => ({ ...p, humanFriendlyNotes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Energy level</Label>
            <Select
              value={form.energyLevel}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, energyLevel: v as FormState["energyLevel"] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select energy level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Anxiety level</Label>
            <Select
              value={form.anxietyLevel}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, anxietyLevel: v as FormState["anxietyLevel"] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select anxiety level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reactivity</Label>
            <Select
              value={form.reactivity}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, reactivity: v as FormState["reactivity"] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select reactivity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Play style</Label>
            <Select
              value={form.playStyle}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, playStyle: v as FormState["playStyle"] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select play style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gentle">Gentle</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="rough">Rough</SelectItem>
                <SelectItem value="chase">Chase</SelectItem>
                <SelectItem value="wrestle">Wrestle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign Play Group</Label>
            <Select
              value={form.playGroup}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, playGroup: v as FormState["playGroup"] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select play group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small Dogs</SelectItem>
                <SelectItem value="large">Large Dogs</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="puppies">Puppies</SelectItem>
                <SelectItem value="seniors">Seniors</SelectItem>
                <SelectItem value="solo">Solo / Separate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TagInput
          label="Behavior Tags"
          value={form.behaviorTags}
          onChange={(next) => setForm((p) => ({ ...p, behaviorTags: next }))}
          placeholder="e.g. loves-toy, food-motivated"
        />

        <TagInput
          label="Internal Warnings / Notes"
          value={form.internalWarnings}
          onChange={(next) => setForm((p) => ({ ...p, internalWarnings: next }))}
          placeholder="e.g. resource-guarding"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Temperament notes</Label>
            <Textarea
              className="min-h-28"
              value={form.temperamentNotes}
              onChange={(e) =>
                setForm((p) => ({ ...p, temperamentNotes: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Additional internal comments (staff-only)</Label>
            <Textarea
              className="min-h-28"
              value={form.internalComments}
              onChange={(e) =>
                setForm((p) => ({ ...p, internalComments: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Save Evaluation Form
          </Button>
        </div>
      </div>
    </Modal>
  );
}

