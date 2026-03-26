"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  Utensils,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FeedingScheduleItem,
  FeedingOccasion,
  MealComponent,
  FoodComponentType,
  FoodUnit,
  FoodSource,
  PrepInstruction,
  RefusalAction,
} from "@/lib/types";

export interface PetOption {
  id: number;
  name: string;
  type?: string;
}

interface FeedingScheduleFormProps {
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (schedule: FeedingScheduleItem[]) => void;
  selectedPets: PetOption[];
  compact?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const OCCASION_PRESETS: { label: string; time: string }[] = [
  { label: "Breakfast", time: "07:00" },
  { label: "Lunch", time: "12:00" },
  { label: "Dinner", time: "17:00" },
  { label: "Bedtime Snack", time: "20:00" },
];

const FOOD_TYPES: { value: FoodComponentType; label: string }[] = [
  { value: "kibble", label: "Kibble" },
  { value: "wet_food", label: "Wet Food" },
  { value: "raw", label: "Raw" },
  { value: "supplement", label: "Supplement" },
  { value: "toppers", label: "Toppers" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
];

const FOOD_UNITS: { value: FoodUnit; label: string }[] = [
  { value: "cups", label: "Cup" },
  { value: "tbsp", label: "Tbsp" },
  { value: "grams", label: "Grams" },
  { value: "oz", label: "Oz" },
  { value: "scoop", label: "Scoop" },
  { value: "other", label: "Other" },
];

const SOURCE_OPTIONS: { value: FoodSource; label: string }[] = [
  { value: "parent_brings", label: "Owner Provides" },
  { value: "facility_provides", label: "Facility Provides" },
  { value: "mix", label: "Mix (Both)" },
];

const PREP_OPTIONS: { value: PrepInstruction; label: string }[] = [
  { value: "soak", label: "Soak kibble" },
  { value: "microwave", label: "Microwave" },
  { value: "mix_powder", label: "Mix powder" },
  { value: "serve_separately", label: "Serve separately" },
  { value: "warm_water", label: "Warm water" },
];

const REFUSAL_OPTIONS: { value: RefusalAction; label: string }[] = [
  { value: "plain_kibble", label: "Plain kibble" },
  { value: "warm_water", label: "Warm water" },
  { value: "skip_notify", label: "Skip & notify" },
  { value: "call_parent", label: "Call owner" },
  { value: "try_again_1hr", label: "Retry in 1hr" },
  { value: "add_toppers", label: "Add toppers" },
];

const ALLERGY_PRESETS = [
  "Chicken",
  "Grain-free",
  "No beef",
  "Sensitive stomach",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function formatTime(time: string) {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time;
  }
}

function createEmptyItem(defaultPetId?: number): FeedingScheduleItem {
  return {
    id: makeId("feeding"),
    petId: defaultPetId,
    occasions: [],
    source: "parent_brings",
    prepInstructions: [],
    ifRefuses: [],
    frequency: "daily",
    allergies: [],
    notes: "",
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function FeedingScheduleForm({
  feedingSchedule,
  setFeedingSchedule,
  selectedPets,
}: FeedingScheduleFormProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(
    feedingSchedule.length > 0 ? feedingSchedule[0].id : null,
  );
  const [expandedOcc, setExpandedOcc] = useState<string | null>(null);

  const update = (index: number, patch: Partial<FeedingScheduleItem>) => {
    const updated = [...feedingSchedule];
    updated[index] = { ...updated[index], ...patch };
    setFeedingSchedule(updated);
  };

  const add = () => {
    const item = createEmptyItem(
      selectedPets.length === 1 ? selectedPets[0].id : undefined,
    );
    setFeedingSchedule([...feedingSchedule, item]);
    setExpandedItem(item.id);
  };

  const remove = (index: number) => {
    const removed = feedingSchedule[index];
    setFeedingSchedule(feedingSchedule.filter((_, i) => i !== index));
    if (expandedItem === removed.id) setExpandedItem(null);
  };

  // ── Occasion CRUD ──

  const addOccasion = (
    itemIndex: number,
    preset?: { label: string; time: string },
  ) => {
    const item = feedingSchedule[itemIndex];
    const occ: FeedingOccasion = {
      id: makeId("occ"),
      label: preset?.label || "Meal",
      time: preset?.time || "08:00",
      components: [],
    };
    update(itemIndex, { occasions: [...item.occasions, occ] });
    setExpandedOcc(occ.id);
  };

  const removeOccasion = (itemIndex: number, occId: string) => {
    const item = feedingSchedule[itemIndex];
    update(itemIndex, {
      occasions: item.occasions.filter((o) => o.id !== occId),
    });
  };

  const updateOccasion = (
    itemIndex: number,
    occId: string,
    patch: Partial<FeedingOccasion>,
  ) => {
    const item = feedingSchedule[itemIndex];
    update(itemIndex, {
      occasions: item.occasions.map((o) =>
        o.id === occId ? { ...o, ...patch } : o,
      ),
    });
  };

  // ── Component CRUD (inside an occasion) ──

  const addComponent = (itemIndex: number, occId: string) => {
    const item = feedingSchedule[itemIndex];
    const occ = item.occasions.find((o) => o.id === occId);
    if (!occ) return;
    const comp: MealComponent = {
      id: makeId("comp"),
      type: "kibble",
      name: "",
      amount: "1",
      unit: "cups",
    };
    updateOccasion(itemIndex, occId, { components: [...occ.components, comp] });
  };

  const updateComponent = (
    itemIndex: number,
    occId: string,
    compId: string,
    patch: Partial<MealComponent>,
  ) => {
    const item = feedingSchedule[itemIndex];
    const occ = item.occasions.find((o) => o.id === occId);
    if (!occ) return;
    updateOccasion(itemIndex, occId, {
      components: occ.components.map((c) =>
        c.id === compId ? { ...c, ...patch } : c,
      ),
    });
  };

  const removeComponent = (
    itemIndex: number,
    occId: string,
    compId: string,
  ) => {
    const item = feedingSchedule[itemIndex];
    const occ = item.occasions.find((o) => o.id === occId);
    if (!occ) return;
    updateOccasion(itemIndex, occId, {
      components: occ.components.filter((c) => c.id !== compId),
    });
  };

  // ── Multi-select toggles ──

  const toggleChip = <T extends string>(
    itemIndex: number,
    field: "prepInstructions" | "ifRefuses" | "allergies",
    val: T,
  ) => {
    const item = feedingSchedule[itemIndex];
    const current = (item[field] || []) as T[];
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    update(itemIndex, { [field]: updated });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Feeding Instructions</h4>
      <div className="space-y-3">
        {feedingSchedule.map((item, index) => {
          const isExpanded = expandedItem === item.id;
          const usedPresets = new Set(item.occasions.map((o) => o.label));

          return (
            <Card key={item.id}>
              <CardContent className="space-y-4 pt-4">
                {/* Header */}
                <div
                  className="flex cursor-pointer items-start justify-between"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-orange-100">
                      <Utensils className="size-3.5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        {selectedPets.length > 1
                          ? `Feeding — ${selectedPets.find((p) => p.id === item.petId)?.name || "Select Pet"}`
                          : "Feeding Schedule"}
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        {item.occasions.length}{" "}
                        {item.occasions.length === 1 ? "meal" : "meals"}{" "}
                        &middot;{" "}
                        {
                          SOURCE_OPTIONS.find((s) => s.value === item.source)
                            ?.label
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(index);
                      }}
                      className="text-destructive hover:text-destructive text-xs"
                    >
                      Remove
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="text-muted-foreground size-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground size-4" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4">
                    {/* Pet select (multi-pet) */}
                    {selectedPets.length > 1 && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Pet</Label>
                        <Select
                          value={item.petId?.toString() ?? ""}
                          onValueChange={(v) =>
                            update(index, { petId: parseInt(v, 10) })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select pet" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedPets.map((pet) => (
                              <SelectItem
                                key={pet.id}
                                value={pet.id.toString()}
                              >
                                {pet.name} {pet.type ? `(${pet.type})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Source */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Food Source</Label>
                      <div className="flex gap-2">
                        {SOURCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => update(index, { source: opt.value })}
                            className={cn(
                              `rounded-md border px-3 py-1.5 text-xs font-medium transition-colors`,
                              item.source === opt.value
                                ? `border-orange-300 bg-orange-50 text-orange-700`
                                : `border-input hover:bg-muted/50`,
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Allergies */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Allergies</Label>
                      <div className="flex flex-wrap gap-1">
                        {ALLERGY_PRESETS.map((a) => {
                          const active = (item.allergies || []).includes(a);
                          return (
                            <button
                              key={a}
                              type="button"
                              onClick={() => toggleChip(index, "allergies", a)}
                              className={cn(
                                `rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors`,
                                active
                                  ? "border-red-300 bg-red-50 text-red-700"
                                  : `border-input hover:bg-muted/50`,
                              )}
                            >
                              {active && (
                                <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />
                              )}
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Occasions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Meals</Label>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.occasions.length}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {OCCASION_PRESETS.filter(
                          (p) => !usedPresets.has(p.label),
                        ).map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => addOccasion(index, preset)}
                            className="rounded-full border border-dashed border-orange-300 px-2.5 py-1 text-[11px] text-orange-600 transition-colors hover:bg-orange-50"
                          >
                            <Plus className="mr-0.5 inline h-2.5 w-2.5" />
                            {preset.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOccasion(index)}
                          className="border-input text-muted-foreground hover:bg-muted/50 rounded-full border border-dashed px-2.5 py-1 text-[11px]"
                        >
                          <Plus className="mr-0.5 inline h-2.5 w-2.5" />
                          Custom
                        </button>
                      </div>

                      {item.occasions.map((occ) => {
                        const occExpanded = expandedOcc === occ.id;
                        return (
                          <div
                            key={occ.id}
                            className={cn(
                              "rounded-md border",
                              occExpanded
                                ? "border-orange-200"
                                : "border-input",
                            )}
                          >
                            <div
                              className="flex cursor-pointer items-center justify-between px-3 py-2"
                              onClick={() =>
                                setExpandedOcc(occExpanded ? null : occ.id)
                              }
                            >
                              <span className="text-xs font-medium">
                                {occ.label} — {formatTime(occ.time)} (
                                {occ.components.length} items)
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeOccasion(index, occ.id);
                                  }}
                                >
                                  <X className="size-3" />
                                </Button>
                                {occExpanded ? (
                                  <ChevronUp className="size-3" />
                                ) : (
                                  <ChevronDown className="size-3" />
                                )}
                              </div>
                            </div>
                            {occExpanded && (
                              <div className="space-y-2 border-t px-3 pb-3">
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                  <div className="space-y-1">
                                    <Label className="text-[11px]">Name</Label>
                                    <Input
                                      value={occ.label}
                                      onChange={(e) =>
                                        updateOccasion(index, occ.id, {
                                          label: e.target.value,
                                        })
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[11px]">Time</Label>
                                    <Input
                                      type="time"
                                      value={occ.time}
                                      onChange={(e) =>
                                        updateOccasion(index, occ.id, {
                                          time: e.target.value,
                                        })
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                                {occ.components.map((comp) => (
                                  <div
                                    key={comp.id}
                                    className="grid grid-cols-5 items-end gap-1.5"
                                  >
                                    <Select
                                      value={comp.type}
                                      onValueChange={(v) =>
                                        updateComponent(
                                          index,
                                          occ.id,
                                          comp.id,
                                          { type: v as FoodComponentType },
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-[11px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FOOD_TYPES.map((t) => (
                                          <SelectItem
                                            key={t.value}
                                            value={t.value}
                                          >
                                            {t.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      value={comp.name}
                                      onChange={(e) =>
                                        updateComponent(
                                          index,
                                          occ.id,
                                          comp.id,
                                          { name: e.target.value },
                                        )
                                      }
                                      placeholder="Brand"
                                      className="h-7 text-[11px]"
                                    />
                                    <Input
                                      value={comp.amount}
                                      onChange={(e) =>
                                        updateComponent(
                                          index,
                                          occ.id,
                                          comp.id,
                                          { amount: e.target.value },
                                        )
                                      }
                                      placeholder="Amt"
                                      className="h-7 text-[11px]"
                                    />
                                    <Select
                                      value={comp.unit}
                                      onValueChange={(v) =>
                                        updateComponent(
                                          index,
                                          occ.id,
                                          comp.id,
                                          { unit: v as FoodUnit },
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-[11px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FOOD_UNITS.map((u) => (
                                          <SelectItem
                                            key={u.value}
                                            value={u.value}
                                          >
                                            {u.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-7"
                                      onClick={() =>
                                        removeComponent(index, occ.id, comp.id)
                                      }
                                    >
                                      <X className="size-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-full text-[11px]"
                                  onClick={() => addComponent(index, occ.id)}
                                >
                                  <Plus className="mr-1 size-3" />
                                  Add Component
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Prep + Refusal chips */}
                    <div className="bg-muted/30 space-y-3 rounded-lg p-3">
                      <h5 className="text-muted-foreground text-xs font-medium">
                        Prep Instructions
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {PREP_OPTIONS.map((opt) => {
                          const active = (item.prepInstructions || []).includes(
                            opt.value,
                          );
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                toggleChip(index, "prepInstructions", opt.value)
                              }
                              className={cn(
                                `rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors`,
                                active
                                  ? `border-orange-300 bg-orange-50 text-orange-700`
                                  : `border-input hover:bg-muted/50`,
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <h5 className="text-muted-foreground pt-1 text-xs font-medium">
                        If Refuses Food
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {REFUSAL_OPTIONS.map((opt) => {
                          const active = (item.ifRefuses || []).includes(
                            opt.value,
                          );
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                toggleChip(index, "ifRefuses", opt.value)
                              }
                              className={cn(
                                `rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors`,
                                active
                                  ? `border-amber-300 bg-amber-50 text-amber-700`
                                  : `border-input hover:bg-muted/50`,
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Notes</Label>
                      <Input
                        value={item.notes}
                        onChange={(e) =>
                          update(index, { notes: e.target.value })
                        }
                        placeholder="Additional feeding notes..."
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Button
          type="button"
          variant="outline"
          onClick={add}
          className="w-full"
        >
          <Plus className="mr-2 size-4" />
          Add Feeding Schedule
        </Button>
      </div>
    </div>
  );
}
