"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Plus, TreePine } from "lucide-react";
import { toast } from "sonner";
import { PlayAreaCard } from "@/components/rooms/PlayAreaCard";
import { RoomImageUpload } from "@/components/rooms/RoomImageUpload";
import { getMockUsage } from "@/lib/capacity-engine";
import { useDaycareAreas } from "@/hooks/use-daycare-areas";
import type {
  DaycarePlayArea,
  DaycareSection,
  RoomCategoryColor,
} from "@/types/rooms";

const COLORS: RoomCategoryColor[] = [
  "emerald",
  "blue",
  "amber",
  "violet",
  "orange",
  "rose",
  "indigo",
  "slate",
];

const TODAY = new Date().toISOString().split("T")[0];

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  facilityId?: number;
}

// ── Blank templates ────────────────────────────────────────────────────────────

function blankArea(facilityId: number, sortOrder: number): DaycarePlayArea {
  return {
    id: `area-${Date.now()}`,
    facilityId,
    name: "",
    description: "",
    isActive: true,
    sortOrder,
  };
}

function blankSection(
  facilityId: number,
  playAreaId: string,
  sortOrder: number,
): DaycareSection {
  return {
    id: `sec-${Date.now()}`,
    playAreaId,
    facilityId,
    name: "",
    capacity: 20,
    description: "",
    isActive: true,
    sortOrder,
    rules: [],
    color: "emerald",
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function DaycareAreasClient({ facilityId = 11 }: Props) {
  const {
    areas: allAreas,
    sections: allSections,
    addArea,
    updateArea,
    deleteArea: removeArea,
    toggleArea: toggleAreaInHook,
    addSection,
    updateSection,
    deleteSection: removeSection,
    toggleSection: toggleSectionInHook,
  } = useDaycareAreas();

  const areas = allAreas.filter((a) => a.facilityId === facilityId);
  const areaIds = new Set(areas.map((a) => a.id));
  const sections = allSections.filter(
    (s) => s.facilityId === facilityId && areaIds.has(s.playAreaId),
  );

  // Area dialog
  const [areaDialog, setAreaDialog] = useState<{
    open: boolean;
    data: DaycarePlayArea;
  } | null>(null);

  // Section dialog
  const [sectionDialog, setSectionDialog] = useState<{
    open: boolean;
    data: DaycareSection;
    isNew: boolean;
  } | null>(null);

  // Deterministic mock usage for today
  const mockUsage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sec of sections) {
      map[sec.id] = getMockUsage(sec.id, TODAY, sec.capacity);
    }
    return map;
  }, [sections]);

  // ── Stats ────────────────────────────────────────────────────────────────────

  const activeSections = sections.filter((s) => s.isActive);
  const totalCapacity = activeSections.reduce((sum, s) => sum + s.capacity, 0);
  const totalUsed = activeSections.reduce(
    (sum, s) => sum + (mockUsage[s.id] ?? 0),
    0,
  );

  // ── Area handlers ────────────────────────────────────────────────────────────

  const openAreaDialog = (area?: DaycarePlayArea) => {
    setAreaDialog({
      open: true,
      data: area ?? blankArea(facilityId, areas.length + 1),
    });
  };

  const saveArea = () => {
    if (!areaDialog) return;
    const a = areaDialog.data;
    if (!a.name.trim()) {
      toast.error("Play area name is required");
      return;
    }
    const isExisting = areas.find((x) => x.id === a.id);
    if (isExisting) {
      updateArea(a);
      toast.success("Play area updated");
    } else {
      addArea(a);
      toast.success("Play area created");
    }
    setAreaDialog(null);
  };

  const deleteArea = (id: string) => {
    removeArea(id);
    toast.success("Play area and its sections removed");
  };

  const toggleArea = (id: string) => toggleAreaInHook(id);

  // ── Section handlers ─────────────────────────────────────────────────────────

  const openSectionDialog = (playAreaId: string, section?: DaycareSection) => {
    const existingForArea = sections.filter((s) => s.playAreaId === playAreaId);
    setSectionDialog({
      open: true,
      data:
        section ??
        blankSection(facilityId, playAreaId, existingForArea.length + 1),
      isNew: !section,
    });
  };

  const saveSection = () => {
    if (!sectionDialog) return;
    const s = sectionDialog.data;
    if (!s.name.trim()) {
      toast.error("Section name is required");
      return;
    }
    if (s.capacity <= 0) {
      toast.error("Capacity must be at least 1");
      return;
    }
    if (sectionDialog.isNew) {
      addSection(s);
      toast.success("Section added");
    } else {
      updateSection(s);
      toast.success("Section updated");
    }
    setSectionDialog(null);
  };

  const toggleSection = (id: string) => toggleSectionInHook(id);

  const deleteSection = (id: string) => {
    removeSection(id);
    toast.success("Section removed");
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Play Areas</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Configure parks, sections, and per-section capacity. Each section
            automatically tracks daily occupancy.
          </p>
        </div>
        <Button onClick={() => openAreaDialog()} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Add Play Area
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Capacity"
          value={totalCapacity}
          color="indigo"
          sub="pets/day across all sections"
        />
        <StatCard
          label="In Today"
          value={totalUsed}
          color="amber"
          sub="currently booked today"
        />
        <StatCard
          label="Play Areas"
          value={areas.length}
          color="emerald"
          sub="parks & locations"
        />
        <StatCard
          label="Sections"
          value={activeSections.length}
          color="violet"
          sub="active sections"
        />
      </div>

      {/* Play area cards */}
      <div className="space-y-4">
        {areas.length === 0 ? (
          <EmptyState onAdd={() => openAreaDialog()} />
        ) : (
          areas
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((area) => (
              <PlayAreaCard
                key={area.id}
                area={area}
                sections={sections.filter((s) => s.playAreaId === area.id)}
                mockUsage={mockUsage}
                onEditArea={() => openAreaDialog(area)}
                onDeleteArea={() => deleteArea(area.id)}
                onToggleArea={() => toggleArea(area.id)}
                onAddSection={() => openSectionDialog(area.id)}
                onEditSection={(sec) => openSectionDialog(area.id, sec)}
                onToggleSection={toggleSection}
                onDeleteSection={deleteSection}
              />
            ))
        )}
      </div>

      {/* ── Play Area Dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={!!areaDialog?.open}
        onOpenChange={(open) => !open && setAreaDialog(null)}
      >
        <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {areas.find((a) => a.id === areaDialog?.data.id)
                ? "Edit Play Area"
                : "New Play Area"}
            </DialogTitle>
          </DialogHeader>
          {areaDialog && (
            <div className="space-y-4">
              <RoomImageUpload
                value={areaDialog.data.imageUrl}
                onChange={(url) =>
                  setAreaDialog({
                    ...areaDialog,
                    data: { ...areaDialog.data, imageUrl: url ?? undefined },
                  })
                }
                label="Cover Photo"
                hint="Shown in the booking flow"
              />
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={areaDialog.data.name}
                  onChange={(e) =>
                    setAreaDialog({
                      ...areaDialog,
                      data: { ...areaDialog.data, name: e.target.value },
                    })
                  }
                  placeholder="e.g. Indoor Park, Outdoor Yard"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={areaDialog.data.description ?? ""}
                  onChange={(e) =>
                    setAreaDialog({
                      ...areaDialog,
                      data: {
                        ...areaDialog.data,
                        description: e.target.value,
                      },
                    })
                  }
                  placeholder="Brief description for staff"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={areaDialog.data.isActive}
                  onCheckedChange={(v) =>
                    setAreaDialog({
                      ...areaDialog,
                      data: { ...areaDialog.data, isActive: v },
                    })
                  }
                />
                <Label>Active (visible in booking flow)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveArea}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Section Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={!!sectionDialog?.open}
        onOpenChange={(open) => !open && setSectionDialog(null)}
      >
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sectionDialog?.isNew ? "Add Section" : "Edit Section"}
            </DialogTitle>
          </DialogHeader>
          {sectionDialog && (
            <div className="space-y-4">
              <RoomImageUpload
                value={sectionDialog.data.imageUrl}
                onChange={(url) =>
                  setSectionDialog({
                    ...sectionDialog,
                    data: {
                      ...sectionDialog.data,
                      imageUrl: url ?? undefined,
                    },
                  })
                }
                label="Section Photo"
                hint="Optional — shown on the section tile"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section Name *</Label>
                  <Input
                    value={sectionDialog.data.name}
                    onChange={(e) =>
                      setSectionDialog({
                        ...sectionDialog,
                        data: { ...sectionDialog.data, name: e.target.value },
                      })
                    }
                    placeholder="e.g. Small Dogs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Capacity *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={sectionDialog.data.capacity}
                    onChange={(e) =>
                      setSectionDialog({
                        ...sectionDialog,
                        data: {
                          ...sectionDialog.data,
                          capacity: Math.max(1, parseInt(e.target.value) || 1),
                        },
                      })
                    }
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={sectionDialog.data.description ?? ""}
                  onChange={(e) =>
                    setSectionDialog({
                      ...sectionDialog,
                      data: {
                        ...sectionDialog.data,
                        description: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. For dogs under 20 lbs"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setSectionDialog({
                          ...sectionDialog,
                          data: { ...sectionDialog.data, color },
                        })
                      }
                      className={`size-7 rounded-full border-2 transition-transform ${
                        sectionDialog.data.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      } bg-${color}-400`}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Weight rules */}
              <div className="space-y-3">
                <Label>Weight Restrictions (optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">
                      Min weight (lbs)
                    </p>
                    <Input
                      type="number"
                      min={0}
                      placeholder="No minimum"
                      value={
                        sectionDialog.data.rules.find(
                          (r) => r.type === "min_weight",
                        )?.value ?? ""
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSectionDialog((prev) => {
                          if (!prev) return prev;
                          const filtered = prev.data.rules.filter(
                            (r) => r.type !== "min_weight",
                          );
                          const rules = isNaN(val)
                            ? filtered
                            : [
                                ...filtered,
                                {
                                  id: `rule-min-${Date.now()}`,
                                  type: "min_weight" as const,
                                  value: val,
                                  clientMessage: `This section is for dogs ${val} lbs and above.`,
                                  enabled: true,
                                },
                              ];
                          return {
                            ...prev,
                            data: { ...prev.data, rules },
                          };
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">
                      Max weight (lbs)
                    </p>
                    <Input
                      type="number"
                      min={0}
                      placeholder="No maximum"
                      value={
                        sectionDialog.data.rules.find(
                          (r) => r.type === "max_weight",
                        )?.value ?? ""
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSectionDialog((prev) => {
                          if (!prev) return prev;
                          const filtered = prev.data.rules.filter(
                            (r) => r.type !== "max_weight",
                          );
                          const rules = isNaN(val)
                            ? filtered
                            : [
                                ...filtered,
                                {
                                  id: `rule-max-${Date.now()}`,
                                  type: "max_weight" as const,
                                  value: val,
                                  clientMessage: `This section is for dogs up to ${val} lbs.`,
                                  enabled: true,
                                },
                              ];
                          return {
                            ...prev,
                            data: { ...prev.data, rules },
                          };
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Pet type rule */}
              <div className="space-y-2">
                <Label>Pet Type</Label>
                <Select
                  value={
                    (sectionDialog.data.rules.find((r) => r.type === "pet_type")
                      ?.value as string) ?? "all"
                  }
                  onValueChange={(v) => {
                    setSectionDialog((prev) => {
                      if (!prev) return prev;
                      const filtered = prev.data.rules.filter(
                        (r) => r.type !== "pet_type",
                      );
                      const rules =
                        v === "all"
                          ? filtered
                          : [
                              ...filtered,
                              {
                                id: `rule-type-${Date.now()}`,
                                type: "pet_type" as const,
                                value: v,
                                clientMessage: `This section is for ${v}s only.`,
                                enabled: true,
                              },
                            ];
                      return { ...prev, data: { ...prev.data, rules } };
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All pets</SelectItem>
                    <SelectItem value="dog">Dogs only</SelectItem>
                    <SelectItem value="cat">Cats only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={sectionDialog.data.isActive}
                  onCheckedChange={(v) =>
                    setSectionDialog({
                      ...sectionDialog,
                      data: { ...sectionDialog.data, isActive: v },
                    })
                  }
                />
                <Label>Section is active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveSection}>Save Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
  color: "indigo" | "emerald" | "violet" | "amber";
}) {
  const text = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[color];
  return (
    <div className="bg-card rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-muted/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center">
      <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-2xl">
        <TreePine className="text-muted-foreground/50 size-8" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No play areas yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        Create play areas like <span className="font-medium">Indoor Park</span>{" "}
        or <span className="font-medium">Outdoor Yard</span>, then add sections
        (Small Dogs, Medium Dogs, etc.) with per-section capacity.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 size-4" />
        Create First Play Area
      </Button>
    </div>
  );
}
