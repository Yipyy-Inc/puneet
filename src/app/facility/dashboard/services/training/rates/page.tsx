"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Sparkles,
  Star,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import type {
  TrainingPackage,
  ClassType,
  SkillLevel,
} from "@/types/training";
import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";
import type { ServiceAddOn } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";
import { toast } from "sonner";

function loadTrainingAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const raw = localStorage.getItem("settings-service-addons");
    const all = raw ? (JSON.parse(raw) as ServiceAddOn[]) : defaultServiceAddOns;
    return all.filter((a) => a.applicableServices.includes("training"));
  } catch {
    return defaultServiceAddOns.filter((a) => a.applicableServices.includes("training"));
  }
}

interface ProgramFormState {
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
};

function ProgramDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TrainingPackage | null;
  onSave: (form: ProgramFormState, editing: TrainingPackage | null) => void;
}) {
  const [form, setForm] = useState<ProgramFormState>(() =>
    editing
      ? {
          name: editing.name,
          description: editing.description,
          classType: editing.classType,
          skillLevel: editing.skillLevel,
          sessions: editing.sessions,
          price: editing.price,
          validityDays: editing.validityDays,
          isActive: editing.isActive,
          popular: editing.popular ?? false,
          includes: editing.includes.join("\n"),
        }
      : EMPTY_PROGRAM,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <SelectItem value="board-and-train">Board & Train</SelectItem>
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
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
          <div className="space-y-2">
            <Label>What's included (one per line)</Label>
            <Textarea
              rows={4}
              placeholder={"6 group sessions\nPuppy socialization\nTraining manual"}
              value={form.includes}
              onChange={(e) => setForm({ ...form, includes: e.target.value })}
            />
          </div>
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
          <Button
            disabled={!form.name.trim()}
            onClick={() => onSave(form, editing)}
          >
            <Save className="mr-2 size-4" />
            {editing ? "Save Changes" : "Create Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingRatesPage() {
  const queryClient = useQueryClient();
  const { data: programs = [] } = useQuery(trainingQueries.packages());

  const [trainingAddOns, setTrainingAddOns] = useState<ServiceAddOn[]>([]);

  useEffect(() => {
    const sync = () => setTrainingAddOns(loadTrainingAddOns());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingPackage | null>(
    null,
  );
  const [deletingProgram, setDeletingProgram] = useState<TrainingPackage | null>(
    null,
  );

  const activeCount = programs.filter((p) => p.isActive).length;
  const avgPrice = programs.length
    ? Math.round(programs.reduce((s, p) => s + p.price, 0) / programs.length)
    : 0;
  const activeAddons = trainingAddOns.filter((a) => a.isActive).length;

  // ── Program handlers ────────────────────────────────────────────────────
  function handleProgramSave(
    form: ProgramFormState,
    editing: TrainingPackage | null,
  ) {
    const next: TrainingPackage = {
      id: editing?.id ?? `tpk-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      classType: form.classType,
      skillLevel: form.skillLevel,
      sessions: form.sessions,
      price: form.price,
      validityDays: form.validityDays,
      isActive: form.isActive,
      popular: form.popular || undefined,
      includes: form.includes
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      color: editing?.color,
      includedAddOnIds: editing?.includedAddOnIds,
    };

    queryClient.setQueryData<TrainingPackage[]>(
      ["training", "packages"],
      (prev = []) =>
        editing
          ? prev.map((p) => (p.id === next.id ? next : p))
          : [...prev, next],
    );

    toast.success(editing ? `"${next.name}" updated` : `"${next.name}" created`);
    setProgramDialogOpen(false);
    setEditingProgram(null);
  }

  function handleProgramDelete() {
    if (!deletingProgram) return;
    queryClient.setQueryData<TrainingPackage[]>(
      ["training", "packages"],
      (prev = []) => prev.filter((p) => p.id !== deletingProgram.id),
    );
    toast.success(`"${deletingProgram.name}" deleted`);
    setDeletingProgram(null);
  }

  function toggleProgram(id: string) {
    queryClient.setQueryData<TrainingPackage[]>(
      ["training", "packages"],
      (prev = []) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Training Pricing & Rules
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Create and manage training programs, prices, and add-ons.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Programs
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {activeCount}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {programs.length} total
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50">
                <GraduationCap className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Avg. Program Price
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  ${avgPrice}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  across all programs
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <DollarSign className="size-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Add-ons
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {activeAddons}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {trainingAddOns.length} total
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50">
                <Sparkles className="size-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList className="bg-slate-100 border">
          <TabsTrigger value="programs">
            Programs ({programs.length})
          </TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({trainingAddOns.length})</TabsTrigger>
        </TabsList>

        {/* ── Programs Tab ── */}
        <TabsContent value="programs" className="mt-0 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Each program is a bookable training package with sessions, price,
              and validity period.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingProgram(null);
                setProgramDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 size-4" />
              New Program
            </Button>
          </div>
          {programs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
              <GraduationCap className="text-muted-foreground/50 size-8" />
              <div className="text-center">
                <p className="text-sm font-medium">No programs yet</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Create your first training program.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingProgram(null);
                  setProgramDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" />
                Add Program
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {programs.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="hover:bg-muted/30 flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{pkg.name}</p>
                          {pkg.popular && (
                            <Badge className="border-0 bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star className="mr-1 size-2.5" />
                              Popular
                            </Badge>
                          )}
                          {!pkg.isActive && (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                            {pkg.description}
                          </p>
                        )}
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                          <span>
                            {pkg.sessions}{" "}
                            {pkg.sessions === 1 ? "session" : "sessions"}
                          </span>
                          <span className="capitalize">{pkg.classType}</span>
                          <span className="capitalize">{pkg.skillLevel}</span>
                          <span>Valid {pkg.validityDays}d</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-xs tabular-nums"
                        >
                          ${pkg.price}
                        </Badge>
                        <Switch
                          checked={pkg.isActive}
                          onCheckedChange={() => toggleProgram(pkg.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setEditingProgram(pkg);
                            setProgramDialogOpen(true);
                          }}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive size-8"
                          onClick={() => setDeletingProgram(pkg)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Add-ons Tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          <AddOnsManager serviceFilter="training" />
        </TabsContent>
      </Tabs>

      {/* Pricing rules link */}
      <div className="flex items-center justify-between rounded-xl border px-5 py-3">
        <p className="text-muted-foreground text-sm">
          Pricing rules are now in Settings → Pricing Rules
        </p>
        <a
          href="/facility/dashboard/settings?section=pricing-rules"
          className="text-primary text-sm font-medium hover:underline"
        >
          Go to Pricing Rules →
        </a>
      </div>

      {/* Program editor */}
      <ProgramDialog
        key={editingProgram?.id ?? "new-program"}
        open={programDialogOpen}
        onOpenChange={(v) => {
          setProgramDialogOpen(v);
          if (!v) setEditingProgram(null);
        }}
        editing={editingProgram}
        onSave={handleProgramSave}
      />

      {/* Program delete confirmation */}
      <Dialog
        open={!!deletingProgram}
        onOpenChange={(open) => !open && setDeletingProgram(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Program</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingProgram?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProgram(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleProgramDelete}>
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
