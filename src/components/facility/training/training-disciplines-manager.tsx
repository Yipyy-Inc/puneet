"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Eye, EyeOff, Layers, Plus, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/color-utils";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import { trainingQueries } from "@/lib/api/training";
import type { TrainingDiscipline } from "@/types/training";

interface FormState {
  name: string;
  description: string;
  color: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  color: "#6366f1",
  isActive: true,
};

// Module-level id counter so newly added disciplines get a stable id without
// invoking impure helpers (Date.now / Math.random) from render scope.
let newDisciplineSeed = 0;
function nextDisciplineId(): string {
  newDisciplineSeed += 1;
  return `discipline-custom-${newDisciplineSeed}`;
}

export function TrainingDisciplinesManager() {
  const queryClient = useQueryClient();
  const { data: disciplines = [] } = useQuery(
    trainingQueries.allDisciplines(),
  );

  // Edit dialog state.
  const [editingDiscipline, setEditingDiscipline] =
    useState<TrainingDiscipline | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Delete confirmation.
  const [deletingDiscipline, setDeletingDiscipline] =
    useState<TrainingDiscipline | null>(null);

  // Re-sync the dialog form whenever it opens against a new target.
  useEffect(() => {
    if (!dialogOpen) return;
    if (editingDiscipline) {
      setForm({
        name: editingDiscipline.name,
        description: editingDiscipline.description ?? "",
        color: editingDiscipline.color ?? "#6366f1",
        isActive: editingDiscipline.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [dialogOpen, editingDiscipline]);

  // Snapshot of counts for the header summary.
  const summary = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const d of disciplines) {
      if (d.isActive) active++;
      else inactive++;
    }
    return { active, inactive, total: disciplines.length };
  }, [disciplines]);

  /** Persist a fresh discipline list into both query caches so the manager
   *  view (all) and downstream pickers (active-only) update together. */
  function pushDisciplines(next: TrainingDiscipline[]) {
    queryClient.setQueryData<TrainingDiscipline[]>(
      trainingQueries.allDisciplines().queryKey,
      next,
    );
    queryClient.setQueryData<TrainingDiscipline[]>(
      trainingQueries.disciplines().queryKey,
      next.filter((d) => d.isActive),
    );
  }

  function openAdd() {
    setEditingDiscipline(null);
    setDialogOpen(true);
  }

  function openEdit(d: TrainingDiscipline) {
    setEditingDiscipline(d);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Discipline name is required.");
      return;
    }
    if (editingDiscipline) {
      const next = disciplines.map((d) =>
        d.id === editingDiscipline.id
          ? {
              ...d,
              name: form.name.trim(),
              description: form.description.trim() || undefined,
              color: form.color,
              isActive: form.isActive,
            }
          : d,
      );
      pushDisciplines(next);
      toast.success(`"${form.name.trim()}" updated`);
    } else {
      const created: TrainingDiscipline = {
        id: nextDisciplineId(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        isActive: form.isActive,
      };
      pushDisciplines([...disciplines, created]);
      toast.success(`"${created.name}" added`);
    }
    setDialogOpen(false);
    setEditingDiscipline(null);
  }

  function toggleActive(id: string) {
    const next = disciplines.map((d) =>
      d.id === id ? { ...d, isActive: !d.isActive } : d,
    );
    pushDisciplines(next);
  }

  function confirmDelete() {
    if (!deletingDiscipline) return;
    const next = disciplines.filter((d) => d.id !== deletingDiscipline.id);
    pushDisciplines(next);
    toast.success(`"${deletingDiscipline.name}" deleted`);
    setDeletingDiscipline(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="text-muted-foreground size-4" />
            Training Disciplines
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Disciplines tag every course, exercise, and report card so the
            colored badge shows up consistently across the system. Yipyy ships
            with the most common ones — add or hide as needed.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
            >
              <Eye className="size-3" />
              {summary.active} active
            </Badge>
            {summary.inactive > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
              >
                <EyeOff className="size-3" />
                {summary.inactive} hidden
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 size-4" />
          Add discipline
        </Button>
      </CardHeader>

      <CardContent>
        {disciplines.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
            <Sparkles className="text-muted-foreground/40 mx-auto mb-2 size-6" />
            No disciplines yet — add your first to start tagging courses.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {disciplines.map((d) => {
              const color = d.color ?? "#94a3b8";
              return (
                <li
                  key={d.id}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all",
                    !d.isActive && "opacity-70",
                  )}
                >
                  {/* Color swatch */}
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5"
                    style={{
                      backgroundColor: hexToRgba(color, 0.15),
                      color,
                    }}
                  >
                    <Layers className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {d.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="gap-1 border-transparent text-[10px]"
                        style={{
                          backgroundColor: hexToRgba(color, 0.12),
                          color,
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        Badge preview
                      </Badge>
                      {!d.isActive && (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                        >
                          Hidden
                        </Badge>
                      )}
                    </div>
                    {d.description && (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        {d.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={d.isActive}
                      onCheckedChange={() => toggleActive(d.id)}
                      aria-label={`Toggle ${d.name}`}
                      className="scale-90"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(d)}
                      title="Edit discipline"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-8"
                      onClick={() => setDeletingDiscipline(d)}
                      title="Delete discipline"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      {/* Add/Edit dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingDiscipline(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDiscipline ? "Edit discipline" : "Add discipline"}
            </DialogTitle>
            <DialogDescription>
              Disciplines group your training programs and exercises so badges
              and filters stay consistent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Obedience, Agility, Scent Work"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Description (optional)
              </Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Short tagline so staff know what falls under this discipline."
              />
            </div>
            <RateColorPicker
              value={form.color}
              onChange={(hex) => setForm({ ...form, color: hex })}
              label="Badge color"
            />
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-muted-foreground text-xs">
                  Hidden disciplines stay on file but disappear from course +
                  exercise pickers.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingDiscipline ? "Save changes" : "Add discipline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation ───────────────────────────────────────── */}
      <AlertDialog
        open={!!deletingDiscipline}
        onOpenChange={(o) => !o && setDeletingDiscipline(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deletingDiscipline?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Programs and exercises currently tagged with this discipline
              will lose their tag — they won&apos;t be deleted. Consider
              hiding instead if you might want it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
