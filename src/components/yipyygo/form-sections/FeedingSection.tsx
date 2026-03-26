"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FeedingInstruction,
  YipyyGoFormSectionProps,
} from "@/types/yipyygo";
import type {
  FeedingOccasion,
  MealComponent,
  FoodComponentType,
  FoodUnit,
  FoodSource,
  PrepInstruction,
  RefusalAction,
} from "@/types/booking";

type FeedingSectionProps = Omit<YipyyGoFormSectionProps, "isSubmitting">;

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
  { value: "toppers", label: "Toppers / Extras" },
  { value: "prescription", label: "Prescription Diet" },
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

const SOURCE_OPTIONS: {
  value: FoodSource;
  label: string;
  description: string;
}[] = [
  {
    value: "parent_brings",
    label: "I bring all food",
    description: "You will provide food for your pet's stay",
  },
  {
    value: "facility_provides",
    label: "Facility provides",
    description: "The facility will provide meals",
  },
  {
    value: "mix",
    label: "Mix",
    description: "Some food from you, some from the facility",
  },
];

const PREP_OPTIONS: { value: PrepInstruction; label: string }[] = [
  { value: "soak", label: "Soak kibble for 5 min" },
  { value: "microwave", label: "Microwave 10 seconds" },
  { value: "mix_powder", label: "Mix powder into wet first" },
  { value: "serve_separately", label: "Serve items separately" },
  { value: "warm_water", label: "Add warm water" },
];

const REFUSAL_OPTIONS: { value: RefusalAction; label: string }[] = [
  { value: "plain_kibble", label: "Offer plain kibble only" },
  { value: "warm_water", label: "Add warm water and retry" },
  { value: "skip_notify", label: "Skip meal and notify me" },
  { value: "call_parent", label: "Call me" },
  { value: "try_again_1hr", label: "Try again in 1 hour" },
  { value: "add_toppers", label: "Add toppers" },
];

const ALLERGY_PRESETS = [
  "Chicken",
  "Grain-free only",
  "No beef",
  "Sensitive stomach",
  "No dairy",
  "No pork",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeOccasionId() {
  return `occ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeComponentId() {
  return `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

// ── Component ──────────────────────────────────────────────────────────────────

export function FeedingSection({
  formData,
  updateFormData,
  onNext,
  onBack,
  isLastSection,
}: FeedingSectionProps) {
  const feeding = formData.feedingInstructions || {
    foodType: "",
    portionSize: "",
    portionUnit: "cups" as const,
    feedingSchedule: [],
    occasions: [],
    source: "parent_brings" as FoodSource,
    prepInstructions: [],
    ifRefuses: [],
    allergies: [],
  };

  const occasions: FeedingOccasion[] = feeding.occasions || [];
  const [expandedOccasion, setExpandedOccasion] = useState<string | null>(
    occasions.length > 0 ? occasions[0].id : null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customAllergy, setCustomAllergy] = useState("");

  const handleUpdate = (updates: Partial<FeedingInstruction>) => {
    updateFormData({
      feedingInstructions: { ...feeding, ...updates },
    });
  };

  // ── Occasion CRUD ──

  const addOccasion = (preset?: { label: string; time: string }) => {
    const occ: FeedingOccasion = {
      id: makeOccasionId(),
      label: preset?.label || "Meal",
      time: preset?.time || "08:00",
      components: [],
    };
    const updated = [...occasions, occ];
    handleUpdate({ occasions: updated });
    setExpandedOccasion(occ.id);
  };

  const removeOccasion = (id: string) => {
    handleUpdate({ occasions: occasions.filter((o) => o.id !== id) });
    if (expandedOccasion === id) setExpandedOccasion(null);
  };

  const updateOccasion = (id: string, patch: Partial<FeedingOccasion>) => {
    handleUpdate({
      occasions: occasions.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  };

  // ── Component CRUD (inside an occasion) ──

  const addComponent = (occasionId: string) => {
    const occ = occasions.find((o) => o.id === occasionId);
    if (!occ) return;
    const comp: MealComponent = {
      id: makeComponentId(),
      type: "kibble",
      name: "",
      amount: "1",
      unit: "cups",
    };
    updateOccasion(occasionId, { components: [...occ.components, comp] });
  };

  const updateComponent = (
    occasionId: string,
    compId: string,
    patch: Partial<MealComponent>,
  ) => {
    const occ = occasions.find((o) => o.id === occasionId);
    if (!occ) return;
    updateOccasion(occasionId, {
      components: occ.components.map((c) =>
        c.id === compId ? { ...c, ...patch } : c,
      ),
    });
  };

  const removeComponent = (occasionId: string, compId: string) => {
    const occ = occasions.find((o) => o.id === occasionId);
    if (!occ) return;
    updateOccasion(occasionId, {
      components: occ.components.filter((c) => c.id !== compId),
    });
  };

  // ── Multi-select toggles ──

  const togglePrep = (val: PrepInstruction) => {
    const current = feeding.prepInstructions || [];
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    handleUpdate({ prepInstructions: updated });
  };

  const toggleRefusal = (val: RefusalAction) => {
    const current = feeding.ifRefuses || [];
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    handleUpdate({ ifRefuses: updated });
  };

  const toggleAllergy = (val: string) => {
    const current = feeding.allergies || [];
    const updated = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    handleUpdate({ allergies: updated });
  };

  const addCustomAllergy = () => {
    if (!customAllergy.trim()) return;
    const current = feeding.allergies || [];
    if (!current.includes(customAllergy.trim())) {
      handleUpdate({ allergies: [...current, customAllergy.trim()] });
    }
    setCustomAllergy("");
  };

  // Used presets (occasions already added)
  const usedPresets = new Set(occasions.map((o) => o.label));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
            <Utensils className="h-4.5 w-4.5 text-orange-600" />
          </div>
          <div>
            <CardTitle>Feeding Instructions</CardTitle>
            <CardDescription>
              Build {formData.petName}&apos;s meal plan for their stay
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Food Source ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Who provides the food?</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleUpdate({ source: opt.value })}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  (feeding.source || "parent_brings") === opt.value
                    ? "border-orange-300 bg-orange-50"
                    : `border-input hover:bg-muted/50`,
                )}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {opt.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Allergy Tags ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Food allergies or restrictions
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGY_PRESETS.map((allergy) => {
              const active = (feeding.allergies || []).includes(allergy);
              return (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggleAllergy(allergy)}
                  className={cn(
                    `rounded-full border px-3 py-1 text-xs font-medium transition-colors`,
                    active
                      ? "border-red-300 bg-red-50 text-red-700"
                      : `border-input text-muted-foreground hover:bg-muted/50`,
                  )}
                >
                  {active && <AlertTriangle className="mr-1 inline size-3" />}
                  {allergy}
                </button>
              );
            })}
            {(feeding.allergies || [])
              .filter((a) => !ALLERGY_PRESETS.includes(a))
              .map((allergy) => (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggleAllergy(allergy)}
                  className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                >
                  <AlertTriangle className="mr-1 inline size-3" />
                  {allergy}
                  <X className="ml-1 inline size-3" />
                </button>
              ))}
          </div>
          <div className="mt-1 flex gap-2">
            <Input
              value={customAllergy}
              onChange={(e) => setCustomAllergy(e.target.value)}
              placeholder="Add custom allergy..."
              className="h-8 max-w-[200px] text-sm"
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addCustomAllergy())
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={addCustomAllergy}
            >
              Add
            </Button>
          </div>
        </div>

        {/* ── Meal Occasions ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Meal Schedule</Label>
            <Badge variant="secondary" className="text-xs">
              {occasions.length} {occasions.length === 1 ? "meal" : "meals"}
            </Badge>
          </div>

          {/* Quick-add preset chips */}
          <div className="flex flex-wrap gap-2">
            {OCCASION_PRESETS.filter((p) => !usedPresets.has(p.label)).map(
              (preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => addOccasion(preset)}
                  className="rounded-full border border-dashed border-orange-300 px-3 py-1.5 text-sm text-orange-600 transition-colors hover:bg-orange-50"
                >
                  <Plus className="mr-1 inline size-3" />
                  {preset.label}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => addOccasion()}
              className="border-input text-muted-foreground hover:bg-muted/50 rounded-full border border-dashed px-3 py-1.5 text-sm transition-colors"
            >
              <Plus className="mr-1 inline size-3" />
              Custom Meal
            </button>
          </div>

          {/* Occasion cards */}
          <div className="space-y-2">
            {occasions.map((occ) => {
              const isExpanded = expandedOccasion === occ.id;
              return (
                <div
                  key={occ.id}
                  className={cn(
                    "rounded-lg border transition-colors",
                    isExpanded
                      ? "border-orange-200 bg-orange-50/30"
                      : "border-input",
                  )}
                >
                  {/* Occasion header */}
                  <div
                    className="flex cursor-pointer items-center justify-between px-4 py-3"
                    onClick={() =>
                      setExpandedOccasion(isExpanded ? null : occ.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-orange-100">
                        <Utensils className="size-3.5 text-orange-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{occ.label}</span>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Clock className="size-3" />
                          {formatTime(occ.time)}
                          {occ.components.length > 0 && (
                            <span className="ml-1">
                              &middot; {occ.components.length}{" "}
                              {occ.components.length === 1 ? "item" : "items"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOccasion(occ.id);
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="text-muted-foreground size-4" />
                      ) : (
                        <ChevronDown className="text-muted-foreground size-4" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="space-y-4 border-t border-orange-100 px-4 pb-4">
                      {/* Occasion name + time */}
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Meal Name</Label>
                          <Input
                            value={occ.label}
                            onChange={(e) =>
                              updateOccasion(occ.id, { label: e.target.value })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Time</Label>
                          <Input
                            type="time"
                            value={occ.time}
                            onChange={(e) =>
                              updateOccasion(occ.id, { time: e.target.value })
                            }
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Food components */}
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs font-medium">
                          Food Components
                        </Label>
                        {occ.components.map((comp) => (
                          <div
                            key={comp.id}
                            className="space-y-2 rounded-md border bg-white p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <Label className="text-xs">Type</Label>
                                  <Select
                                    value={comp.type}
                                    onValueChange={(v) =>
                                      updateComponent(occ.id, comp.id, {
                                        type: v as FoodComponentType,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
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
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    Brand / Name
                                  </Label>
                                  <Input
                                    value={comp.name}
                                    onChange={(e) =>
                                      updateComponent(occ.id, comp.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="e.g., Royal Canin"
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Amount</Label>
                                  <Input
                                    value={comp.amount}
                                    onChange={(e) =>
                                      updateComponent(occ.id, comp.id, {
                                        amount: e.target.value,
                                      })
                                    }
                                    placeholder="1"
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Unit</Label>
                                  <Select
                                    value={comp.unit}
                                    onValueChange={(v) =>
                                      updateComponent(occ.id, comp.id, {
                                        unit: v as FoodUnit,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
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
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive ml-2 size-7 shrink-0"
                                onClick={() => removeComponent(occ.id, comp.id)}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                            {(comp.type === "supplement" ||
                              comp.type === "toppers") && (
                              <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs">
                                  Mix with
                                </Label>
                                <Input
                                  value={comp.mixWith || ""}
                                  onChange={(e) =>
                                    updateComponent(occ.id, comp.id, {
                                      mixWith: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., Wet food"
                                  className="h-8 max-w-[200px] text-xs"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => addComponent(occ.id)}
                        >
                          <Plus className="mr-1 size-3" />
                          Add Food Component
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Pre-portioned bags (kept from v1) ── */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm">Pre-portioned bags</Label>
            <p className="text-muted-foreground text-xs">
              Bringing bagged meals?
            </p>
          </div>
          <div className="flex items-center gap-2">
            {feeding.prePortionedBagCount != null &&
              feeding.prePortionedBagCount > 0 && (
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={feeding.prePortionedBagCount}
                  onChange={(e) =>
                    handleUpdate({
                      prePortionedBagCount:
                        parseInt(e.target.value, 10) || undefined,
                    })
                  }
                  className="h-8 w-16 text-center"
                />
              )}
            <Switch
              checked={
                feeding.prePortionedBagCount != null &&
                feeding.prePortionedBagCount > 0
              }
              onCheckedChange={(checked) =>
                handleUpdate({ prePortionedBagCount: checked ? 1 : undefined })
              }
            />
          </div>
        </div>

        {/* ── Prep Instructions ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Prep Instructions</Label>
          <p className="text-muted-foreground text-xs">Select all that apply</p>
          <div className="flex flex-wrap gap-1.5">
            {PREP_OPTIONS.map((opt) => {
              const active = (feeding.prepInstructions || []).includes(
                opt.value,
              );
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePrep(opt.value)}
                  className={cn(
                    `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors`,
                    active
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : `border-input text-muted-foreground hover:bg-muted/50`,
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Input
            value={feeding.prepNotes || ""}
            onChange={(e) => handleUpdate({ prepNotes: e.target.value })}
            placeholder="Other prep instructions..."
            className="h-8 text-sm"
          />
        </div>

        {/* ── If Dog Refuses ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            If {formData.petName} refuses to eat
          </Label>
          <p className="text-muted-foreground text-xs">
            What should staff do? Select all that apply
          </p>
          <div className="flex flex-wrap gap-1.5">
            {REFUSAL_OPTIONS.map((opt) => {
              const active = (feeding.ifRefuses || []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleRefusal(opt.value)}
                  className={cn(
                    `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors`,
                    active
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : `border-input text-muted-foreground hover:bg-muted/50`,
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Input
            value={feeding.refusalNotes || ""}
            onChange={(e) => handleUpdate({ refusalNotes: e.target.value })}
            placeholder="Other instructions if food is refused..."
            className="h-8 text-sm"
          />
        </div>

        {/* ── Advanced Toggle ── */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          {showAdvanced ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
          Advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div className="space-y-2">
              <Label className="text-sm">Feeding Notes</Label>
              <Input
                value={feeding.notes || ""}
                onChange={(e) => handleUpdate({ notes: e.target.value })}
                placeholder="e.g., Eats less the day before pickup, gets raw only on weekends..."
              />
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>{isLastSection ? "Review" : "Next"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
