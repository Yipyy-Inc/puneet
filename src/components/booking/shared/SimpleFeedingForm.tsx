"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertTriangle,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedingScheduleItem, FoodSource } from "@/types/booking";

interface PetOption {
  id: number;
  name: string;
  type?: string;
}

interface SimpleFeedingFormProps {
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (schedule: FeedingScheduleItem[]) => void;
  selectedPets: PetOption[];
}

const MEAL_PRESETS = [
  { label: "Breakfast", time: "07:00" },
  { label: "Lunch", time: "12:00" },
  { label: "Dinner", time: "17:00" },
  { label: "Snack", time: "15:00" },
];

const SOURCE_OPTIONS: { value: FoodSource; label: string }[] = [
  { value: "parent_brings", label: "Owner brings" },
  { value: "facility_provides", label: "Facility provides" },
  { value: "mix", label: "Both" },
];

const FOOD_TYPES = ["Kibble", "Wet food", "Raw", "Prescription"];
const ALLERGY_PRESETS = ["Chicken", "Beef", "Grain-free", "Sensitive stomach"];

function makeId() {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function fmtTime(t: string) {
  try {
    return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return t;
  }
}

export function SimpleFeedingForm({
  feedingSchedule,
  setFeedingSchedule,
  selectedPets,
}: SimpleFeedingFormProps) {
  const [customAllergyInput, setCustomAllergyInput] = useState("");
  const [otherFoodInputs, setOtherFoodInputs] = useState<
    Record<string, string>
  >({});

  // #5 — multi-pet: one schedule item per pet
  const isMultiPet = selectedPets.length > 1;

  const getOrCreateItem = (petId?: number): FeedingScheduleItem => {
    const existing = feedingSchedule.find((i) => i.petId === petId);
    if (existing) return existing;
    return {
      id: makeId(),
      petId,
      occasions: [],
      source: "parent_brings",
      prepInstructions: [],
      ifRefuses: [],
      frequency: "daily",
      allergies: [],
      notes: "",
    };
  };

  const saveItem = (updated: FeedingScheduleItem) => {
    const idx = feedingSchedule.findIndex((i) => i.id === updated.id);
    if (idx === -1) {
      setFeedingSchedule([...feedingSchedule, updated]);
    } else {
      const next = [...feedingSchedule];
      next[idx] = updated;
      setFeedingSchedule(next);
    }
  };

  // Build per-pet items for multi-pet, or a single shared item
  const petItems = isMultiPet
    ? selectedPets.map((p) => ({ pet: p, item: getOrCreateItem(p.id) }))
    : [
        {
          pet: selectedPets[0] ?? { id: 0, name: "Pet" },
          item: getOrCreateItem(
            selectedPets.length === 1 ? selectedPets[0].id : undefined,
          ),
        },
      ];

  const addMeal = (
    item: FeedingScheduleItem,
    preset: { label: string; time: string },
  ) => {
    if (item.occasions.some((o) => o.label === preset.label)) return;
    saveItem({
      ...item,
      occasions: [
        ...item.occasions,
        {
          id: makeId(),
          label: preset.label,
          time: preset.time,
          components: [
            {
              id: makeId(),
              type: "kibble" as const,
              name: "",
              amount: "1",
              unit: "cups" as const,
            },
          ],
        },
      ],
    });
  };

  const removeMeal = (item: FeedingScheduleItem, occId: string) => {
    saveItem({
      ...item,
      occasions: item.occasions.filter((o) => o.id !== occId),
    });
  };

  const updateMealFood = (
    item: FeedingScheduleItem,
    occId: string,
    name: string,
  ) => {
    saveItem({
      ...item,
      occasions: item.occasions.map((o) =>
        o.id === occId
          ? {
              ...o,
              components:
                o.components.length > 0
                  ? o.components.map((c, i) => (i === 0 ? { ...c, name } : c))
                  : [
                      {
                        id: makeId(),
                        type: "kibble" as const,
                        name,
                        amount: "1",
                        unit: "cups" as const,
                      },
                    ],
            }
          : o,
      ),
    });
  };

  const updateMealAmount = (
    item: FeedingScheduleItem,
    occId: string,
    amount: string,
  ) => {
    saveItem({
      ...item,
      occasions: item.occasions.map((o) =>
        o.id === occId
          ? {
              ...o,
              components:
                o.components.length > 0
                  ? o.components.map((c, i) => (i === 0 ? { ...c, amount } : c))
                  : [
                      {
                        id: makeId(),
                        type: "kibble" as const,
                        name: "",
                        amount,
                        unit: "cups" as const,
                      },
                    ],
            }
          : o,
      ),
    });
  };

  const toggleAllergy = (item: FeedingScheduleItem, a: string) => {
    const current = item.allergies ?? [];
    const next = current.includes(a)
      ? current.filter((v) => v !== a)
      : [...current, a];
    saveItem({ ...item, allergies: next });
  };

  const renderPetSection = (
    pet: PetOption,
    item: FeedingScheduleItem,
    showPetLabel: boolean,
  ) => {
    const usedPresets = new Set(item.occasions.map((o) => o.label));
    const hasMeals = item.occasions.length > 0;

    return (
      <div key={pet.id} className="space-y-4">
        {/* #5 — pet label for multi-pet */}
        {showPetLabel && (
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-bold">
              {pet.name[0]}
            </span>
            <span className="text-sm font-semibold">{pet.name}</span>
            {pet.type && (
              <span className="text-muted-foreground text-xs">
                ({pet.type})
              </span>
            )}
          </div>
        )}

        {/* Quick-add meal buttons */}
        <div className="flex flex-wrap gap-2">
          {MEAL_PRESETS.filter((p) => !usedPresets.has(p.label)).map(
            (preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => addMeal(item, preset)}
                className="border-border flex items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-2 text-xs font-medium transition-colors hover:border-orange-300 hover:bg-orange-50"
              >
                <Plus className="size-3 text-orange-500" />
                {preset.label}
                <span className="text-muted-foreground">
                  {fmtTime(preset.time)}
                </span>
              </button>
            ),
          )}
        </div>

        {/* #1 — empty state */}
        {!hasMeals && (
          <div className="rounded-xl border border-dashed px-4 py-5 text-center">
            <UtensilsCrossed className="text-muted-foreground/30 mx-auto mb-1.5 size-6" />
            <p className="text-muted-foreground text-xs">
              No meals added yet — tap a preset above to get started
            </p>
          </div>
        )}

        {/* Added meals — #6: replaced raw time input with time display from preset */}
        {hasMeals && (
          <div className="space-y-2">
            {item.occasions.map((occ) => {
              const comp = occ.components[0];
              const foodName = comp?.name || "";
              const isOther = foodName === "Other";
              const otherVal = otherFoodInputs[occ.id] ?? "";

              return (
                <div key={occ.id} className="rounded-xl border p-3">
                  {/* Row 1: meal label + time + delete */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-700">
                        {occ.label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {fmtTime(occ.time)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-6"
                      onClick={() => removeMeal(item, occ.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  {/* Row 2: food type + amount */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={isOther ? "Other" : foodName}
                      onValueChange={(v) => {
                        if (v === "Other") {
                          updateMealFood(item, occ.id, "Other");
                        } else {
                          updateMealFood(item, occ.id, v);
                          setOtherFoodInputs((prev) => {
                            const next = { ...prev };
                            delete next[occ.id];
                            return next;
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 min-w-[110px] flex-1 text-xs">
                        <SelectValue placeholder="Food type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* #4 — "Other" text input */}
                    {isOther && (
                      <Input
                        value={otherVal}
                        onChange={(e) =>
                          setOtherFoodInputs((prev) => ({
                            ...prev,
                            [occ.id]: e.target.value,
                          }))
                        }
                        onBlur={() => {
                          if (otherVal.trim()) {
                            updateMealFood(item, occ.id, otherVal.trim());
                            setOtherFoodInputs((prev) => {
                              const next = { ...prev };
                              delete next[occ.id];
                              return next;
                            });
                          }
                        }}
                        placeholder="Describe food"
                        className="h-8 flex-1 text-xs"
                        autoFocus
                      />
                    )}

                    <Input
                      value={comp?.amount || ""}
                      onChange={(e) =>
                        updateMealAmount(item, occ.id, e.target.value)
                      }
                      placeholder="1 cup"
                      className="h-8 w-20 shrink-0 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Food source */}
        <div>
          <Label className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wide uppercase">
            Who provides the food?
          </Label>
          <div className="flex gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => saveItem({ ...item, source: opt.value })}
                className={cn(
                  "rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all",
                  item.source === opt.value
                    ? "border-orange-400 bg-orange-50 text-orange-700"
                    : "border-border hover:border-orange-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <Label className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wide uppercase">
            Allergies / restrictions
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGY_PRESETS.map((a) => {
              const active = (item.allergies ?? []).includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAllergy(item, a)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border-2 px-2.5 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-border hover:border-red-200",
                  )}
                >
                  {active && <AlertTriangle className="size-3" />}
                  {a}
                </button>
              );
            })}
            <form
              className="flex items-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (customAllergyInput.trim()) {
                  toggleAllergy(item, customAllergyInput.trim());
                  setCustomAllergyInput("");
                }
              }}
            >
              <Input
                value={customAllergyInput}
                onChange={(e) => setCustomAllergyInput(e.target.value)}
                placeholder="+ Other"
                className="h-8 w-24 text-xs"
              />
            </form>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wide uppercase">
            Additional notes
          </Label>
          <Textarea
            value={item.notes}
            onChange={(e) => saveItem({ ...item, notes: e.target.value })}
            placeholder="e.g., picky eater, needs kibble soaked in warm water..."
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100">
          <Utensils className="size-4 text-orange-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Feeding</h4>
          {/* #2 — skip affordance */}
          <p className="text-muted-foreground text-xs">
            Tap a meal to add it. Leave blank if the pet won&apos;t be fed
            during this visit.
          </p>
        </div>
      </div>

      {/* Render per-pet sections or a single shared section */}
      {petItems.map(({ pet, item }) => renderPetSection(pet, item, isMultiPet))}

      {/* Multi-pet separator hint */}
      {isMultiPet && petItems.length > 1 && (
        <p className="text-muted-foreground text-center text-[10px]">
          Each pet has their own feeding schedule above
        </p>
      )}
    </div>
  );
}
