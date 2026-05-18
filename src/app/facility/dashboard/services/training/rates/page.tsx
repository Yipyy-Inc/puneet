"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  GraduationCap,
  Plus,
  Trash2,
  Sparkles,
  MoveVertical,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import type { TrainingPackage } from "@/types/training";
import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";
import type { ServiceAddOn } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";
import { toast } from "sonner";
import {
  ProgramDialog,
  type ProgramFormState,
} from "./_components/program-dialog";
import { ProgramCardGrid } from "./_components/program-card-grid";

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
      prerequisitePackageIds:
        form.prerequisitePackageIds.length > 0
          ? form.prerequisitePackageIds
          : undefined,
      disciplineId: form.disciplineId || undefined,
      // Max group size is a group-only override — drop it entirely on private.
      maxGroupSize:
        form.classType === "group" && form.maxGroupSize !== ""
          ? Number(form.maxGroupSize)
          : undefined,
      imageUrl: form.imageUrl.trim() || undefined,
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
            <>
              <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <MoveVertical className="size-3" />
                Drag any card to reorder — this is the order programs appear
                on the online booking page.
              </p>
              <ProgramCardGrid
                programs={programs}
                onToggleActive={toggleProgram}
                onEdit={(program) => {
                  setEditingProgram(program);
                  setProgramDialogOpen(true);
                }}
                onDelete={setDeletingProgram}
              />
            </>
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
