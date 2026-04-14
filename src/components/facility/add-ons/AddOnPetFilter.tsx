"use client";

import type { PetTypeFilter } from "@/types/facility";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const PET_TYPES = [
  "Dog",
  "Cat",
  "Rabbit",
  "Bird",
  "Guinea Pig",
  "Hamster",
  "Reptile",
];

const DOG_BREEDS = [
  "Labrador Retriever",
  "Golden Retriever",
  "French Bulldog",
  "German Shepherd",
  "Poodle",
  "Bulldog",
  "Beagle",
  "Rottweiler",
  "Dachshund",
  "Shih Tzu",
  "Husky",
  "Boxer",
  "Border Collie",
  "Cocker Spaniel",
  "Mixed / Other",
];

const CAT_BREEDS = [
  "Persian",
  "Siamese",
  "Maine Coon",
  "Ragdoll",
  "Bengal",
  "British Shorthair",
  "Sphynx",
  "Scottish Fold",
  "Mixed / Other",
];

const COAT_TYPES = [
  "Short",
  "Medium",
  "Long",
  "Curly / Wavy",
  "Double Coat",
  "Wire / Rough",
  "Hairless",
];

type Mode = "all" | "custom";

interface Props {
  value: PetTypeFilter | undefined;
  onChange: (v: PetTypeFilter | undefined) => void;
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function AddOnPetFilter({ value, onChange }: Props) {
  const [typeMode, setTypeMode] = useState<Mode>(
    value?.types?.length ? "custom" : "all",
  );
  const [weightMode, setWeightMode] = useState<Mode>(
    value?.weightMin !== undefined || value?.weightMax !== undefined
      ? "custom"
      : "all",
  );
  const [coatMode, setCoatMode] = useState<Mode>(
    value?.coatTypes?.length ? "custom" : "all",
  );
  const [breedsOpen, setBreedsOpen] = useState(false);

  function patch(partial: Partial<PetTypeFilter>) {
    const next = { ...(value ?? {}), ...partial };
    const isEmpty =
      !next.types?.length &&
      !next.breeds?.length &&
      next.weightMin === undefined &&
      next.weightMax === undefined &&
      !next.coatTypes?.length;
    onChange(isEmpty ? undefined : next);
  }

  const selectedTypes = value?.types ?? [];
  const selectedBreeds = value?.breeds ?? [];
  const selectedCoats = value?.coatTypes ?? [];

  function setTypeMode_(mode: Mode) {
    setTypeMode(mode);
    if (mode === "all") patch({ types: undefined, breeds: undefined });
  }
  function setWeightMode_(mode: Mode) {
    setWeightMode(mode);
    if (mode === "all") patch({ weightMin: undefined, weightMax: undefined });
  }
  function setCoatMode_(mode: Mode) {
    setCoatMode(mode);
    if (mode === "all") patch({ coatTypes: undefined });
  }

  const availableBreeds =
    selectedTypes.includes("Dog") && selectedTypes.includes("Cat")
      ? [...DOG_BREEDS, ...CAT_BREEDS]
      : selectedTypes.includes("Dog")
        ? DOG_BREEDS
        : selectedTypes.includes("Cat")
          ? CAT_BREEDS
          : [];

  return (
    <div className="space-y-4">
      {/* Type & Breed */}
      <div className="bg-card/50 space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            Type &amp; Breed
          </p>
          {typeMode === "custom" && selectedTypes.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {selectedTypes.join(", ")}
            </Badge>
          )}
        </div>
        <ModeSelector
          mode={typeMode}
          onChange={setTypeMode_}
          allLabel="All Types and Breeds"
          customLabel="Customize"
        />
        {typeMode === "custom" && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap gap-2">
              {PET_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    patch({
                      types: toggle(selectedTypes, type),
                      breeds: undefined,
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    selectedTypes.includes(type)
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            {availableBreeds.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setBreedsOpen((o) => !o)}
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-slate-700"
                >
                  {breedsOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Specific breeds
                  {selectedBreeds.length > 0 && (
                    <span className="text-primary ml-1">
                      {selectedBreeds.length} selected
                    </span>
                  )}
                </button>
                {breedsOpen && (
                  <div className="bg-muted/20 mt-2 grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border p-3">
                    {availableBreeds.map((breed) => (
                      <label
                        key={breed}
                        className="group flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={selectedBreeds.includes(breed)}
                          onCheckedChange={() =>
                            patch({ breeds: toggle(selectedBreeds, breed) })
                          }
                        />
                        <span className="text-xs transition-colors group-hover:text-slate-900">
                          {breed}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weight */}
      <div className="bg-card/50 space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold text-slate-800">Weight</p>
        <ModeSelector
          mode={weightMode}
          onChange={setWeightMode_}
          allLabel="Full Range"
          customLabel="Customize"
        />
        {weightMode === "custom" && (
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-muted-foreground text-xs">Min (lbs)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={value?.weightMin ?? ""}
                onChange={(e) =>
                  patch({
                    weightMin: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="h-8 text-sm"
              />
            </div>
            <span className="text-muted-foreground mt-5 text-sm">–</span>
            <div className="flex-1 space-y-1">
              <Label className="text-muted-foreground text-xs">Max (lbs)</Label>
              <Input
                type="number"
                min={0}
                placeholder="No limit"
                value={value?.weightMax ?? ""}
                onChange={(e) =>
                  patch({
                    weightMax: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Coat Type */}
      <div className="bg-card/50 space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold text-slate-800">Coat Type</p>
        <ModeSelector
          mode={coatMode}
          onChange={setCoatMode_}
          allLabel="All Coat Types"
          customLabel="Selected Coat Types"
        />
        {coatMode === "custom" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {COAT_TYPES.map((coat) => (
              <button
                key={coat}
                type="button"
                onClick={() =>
                  patch({ coatTypes: toggle(selectedCoats, coat) })
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  selectedCoats.includes(coat)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {coat}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeSelector({
  mode,
  onChange,
  allLabel,
  customLabel,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  allLabel: string;
  customLabel: string;
}) {
  return (
    <div className="flex gap-2">
      {(["all", "custom"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all",
            mode === m
              ? "border-primary bg-primary/8 text-primary"
              : "hover:bg-muted/50 text-muted-foreground hover:border-slate-300",
          )}
        >
          {m === "all" ? allLabel : customLabel}
        </button>
      ))}
    </div>
  );
}
