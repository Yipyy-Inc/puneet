"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ImageOff,
  Image as ImageIcon,
  Save,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import {
  SKILL_LEVEL_LABELS,
  type ClassType,
  type SkillLevel,
  type TrainingPackage,
} from "@/types/training";
import { detectCircularPrerequisite } from "@/lib/training-program-prereqs";

export interface ProgramFormState {
  name: string;
  description: string;
  classType: ClassType;
  skillLevel: SkillLevel;
  sessions: number;
  price: number;
  validityDays: number;
  isActive: boolean;
  popular: boolean;
  includes: string;
  prerequisitePackageIds: string[];
  disciplineId: string;
  maxGroupSize: number | "";
  imageUrl: string;
}

const EMPTY_PROGRAM: ProgramFormState = {
  name: "",
  description: "",
  classType: "group",
  skillLevel: "beginner",
  sessions: 1,
  price: 0,
  validityDays: 90,
  isActive: true,
  popular: false,
  includes: "",
  prerequisitePackageIds: [],
  disciplineId: "",
  maxGroupSize: "",
  imageUrl: "",
};

function seedFromPackage(pkg: TrainingPackage): ProgramFormState {
  return {
    name: pkg.name,
    description: pkg.description,
    classType: pkg.classType,
    skillLevel: pkg.skillLevel,
    sessions: pkg.sessions,
    price: pkg.price,
    validityDays: pkg.validityDays,
    isActive: pkg.isActive,
    popular: pkg.popular ?? false,
    includes: pkg.includes.join("\n"),
    prerequisitePackageIds: pkg.prerequisitePackageIds ?? [],
    disciplineId: pkg.disciplineId ?? "",
    maxGroupSize: pkg.maxGroupSize ?? "",
    imageUrl: pkg.imageUrl ?? "",
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TrainingPackage | null;
  onSave: (form: ProgramFormState, editing: TrainingPackage | null) => void;
}

export function ProgramDialog({ open, onOpenChange, editing, onSave }: Props) {
  const [form, setForm] = useState<ProgramFormState>(() =>
    editing ? seedFromPackage(editing) : EMPTY_PROGRAM,
  );

  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());
  const { data: allPackages = [] } = useQuery(trainingQueries.packages());

  // Self + already-selected prereqs are excluded from the prereq picker, plus
  // anything that would create a circular dependency back to this program.
  const eligiblePrereqs = useMemo(() => {
    return allPackages.filter((p) => {
      if (editing && p.id === editing.id) return false;
      if (form.prerequisitePackageIds.includes(p.id)) return false;
      if (!editing) return true;
      // Check what a graph rooted at `p` would look like — if walking its
      // prereq chain ever reaches `editing.id`, picking `p` here creates a
      // cycle.
      const cycle = detectCircularPrerequisite(
        editing.id,
        [p.id],
        allPackages,
      );
      return cycle === null;
    });
  }, [allPackages, editing, form.prerequisitePackageIds]);

  function addPrereq(id: string) {
    if (!id || form.prerequisitePackageIds.includes(id)) return;
    setForm({
      ...form,
      prerequisitePackageIds: [...form.prerequisitePackageIds, id],
    });
  }

  function removePrereq(id: string) {
    setForm({
      ...form,
      prerequisitePackageIds: form.prerequisitePackageIds.filter(
        (p) => p !== id,
      ),
    });
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Program name is required.");
      return;
    }
    // Re-run the cycle check at save time in case the picker raced with form
    // edits (e.g. a stale dropdown selection).
    if (editing && form.prerequisitePackageIds.length > 0) {
      const cycle = detectCircularPrerequisite(
        editing.id,
        form.prerequisitePackageIds,
        allPackages,
      );
      if (cycle) {
        toast.error(
          "Prerequisite would create a circular dependency. Pick a different program.",
        );
        return;
      }
    }
    onSave(form, editing);
  }

  const isPrivate = form.classType === "private";
  const selectedDiscipline = disciplines.find((d) => d.id === form.disciplineId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Program" : "New Training Program"}
          </DialogTitle>
          <DialogDescription>
            Define a bookable training program (e.g. Puppy Starter, Basic
            Obedience, Private 1-on-1).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identity ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Program Name</Label>
            <Input
              placeholder="e.g. Puppy Starter Pack"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Shown to customers during booking."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          {/* Classification ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Class Type</Label>
              <Select
                value={form.classType}
                onValueChange={(v: ClassType) =>
                  setForm({ ...form, classType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select
                value={form.skillLevel}
                onValueChange={(v: SkillLevel) =>
                  setForm({ ...form, skillLevel: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    {SKILL_LEVEL_LABELS.beginner}
                  </SelectItem>
                  <SelectItem value="intermediate">
                    {SKILL_LEVEL_LABELS.intermediate}
                  </SelectItem>
                  <SelectItem value="advanced">
                    {SKILL_LEVEL_LABELS.advanced}
                  </SelectItem>
                  <SelectItem value="all-levels">
                    {SKILL_LEVEL_LABELS["all-levels"]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Discipline ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Discipline</Label>
              <a
                href="/facility/dashboard/settings?section=training-disciplines"
                className="text-primary text-xs hover:underline"
              >
                Manage in Settings →
              </a>
            </div>
            <Select
              value={form.disciplineId || "__unset__"}
              onValueChange={(v) =>
                setForm({ ...form, disciplineId: v === "__unset__" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a discipline…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset__">
                  <span className="text-muted-foreground">None</span>
                </SelectItem>
                {disciplines.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: d.color ?? "#94a3b8" }}
                      />
                      {d.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDiscipline?.description && (
              <p className="text-muted-foreground text-xs">
                {selectedDiscipline.description}
              </p>
            )}
          </div>

          {/* Sessions / price / validity ─────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Sessions</Label>
              <Input
                type="number"
                min={1}
                value={form.sessions}
                onChange={(e) =>
                  setForm({ ...form, sessions: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Days</Label>
              <Input
                type="number"
                min={1}
                value={form.validityDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    validityDays: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          {/* Max group size — only meaningful for group classes ────────── */}
          {!isPrivate && (
            <div className="space-y-2">
              <Label>Max Class Size (default)</Label>
              <Input
                type="number"
                min={1}
                value={form.maxGroupSize}
                placeholder="e.g. 8"
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxGroupSize:
                      e.target.value === ""
                        ? ""
                        : parseInt(e.target.value) || 1,
                  })
                }
              />
              <p className="text-muted-foreground text-xs">
                Default group size for new series of this program. Each series
                can still override its own capacity.
              </p>
            </div>
          )}

          {/* What's included ────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>What&apos;s included (one per line)</Label>
            <Textarea
              rows={4}
              placeholder={"6 group sessions\nPuppy socialization\nTraining manual"}
              value={form.includes}
              onChange={(e) => setForm({ ...form, includes: e.target.value })}
            />
          </div>

          {/* Prerequisites ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Prerequisites</Label>
            <Select value="" onValueChange={(v) => addPrereq(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Add a prerequisite program…" />
              </SelectTrigger>
              <SelectContent>
                {eligiblePrereqs.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No other programs available.
                  </div>
                ) : (
                  eligiblePrereqs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.prerequisitePackageIds.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.prerequisitePackageIds.map((id) => {
                  const pkg = allPackages.find((p) => p.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {pkg?.name ?? id}
                      <button
                        type="button"
                        onClick={() => removePrereq(id)}
                        className="hover:text-destructive ml-1"
                        aria-label={`Remove ${pkg?.name ?? id}`}
                      >
                        <XCircle className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <p className="text-muted-foreground flex items-start gap-1 text-xs">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              Enforced at enrollment — online flow blocks; staff get a warning
              when booking manually.
            </p>
          </div>

          {/* Cover image ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Cover image URL</Label>
            <Input
              value={form.imageUrl}
              placeholder="https://… or /training/puppy.jpg"
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50",
                )}
              >
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt="Cover preview"
                    className="size-full object-cover"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <ImageOff className="text-muted-foreground size-5" />
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                <ImageIcon className="mr-1 inline size-3 align-text-bottom" />
                Shown on the online booking page as the program&apos;s hero
                image.
              </p>
            </div>
          </div>

          {/* Toggles ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-muted-foreground text-xs">
                Inactive programs are hidden from booking.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Mark as popular</p>
              <p className="text-muted-foreground text-xs">
                Highlights this program in booking flows.
              </p>
            </div>
            <Switch
              checked={form.popular}
              onCheckedChange={(v) => setForm({ ...form, popular: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 size-4" /> Cancel
          </Button>
          <Button disabled={!form.name.trim()} onClick={handleSubmit}>
            <Save className="mr-2 size-4" />
            {editing ? "Save Changes" : "Create Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
