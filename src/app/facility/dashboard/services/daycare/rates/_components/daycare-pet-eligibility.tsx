"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { defaultGroomingConfig } from "@/lib/grooming-config";
import { useSpeciesConfig } from "@/lib/api/facility-settings";
import { useTagCatalogue } from "@/lib/api/tags";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// MoéGo's "Pet Details": who this daycare service is for.
//
// Three questions, each with the same shape — an "everyone" choice and a
// "customise" choice — because that is how MoéGo asks them and it is the
// honest way to express the rule underneath:
//
//   EMPTY MEANS NO RESTRICTION. `daycare_services` stores every one of these
//   as a `text[] not null default '{}'`, and an empty array reads as "any
//   pet". "No restriction" and "not set yet" are the same thing here, so they
//   get one representation — which is why turning a chip off until none is
//   left silently means "all of them" and the copy says so out loud.
//
// ── PET CODES ARE OUR TAGS ────────────────────────────────────────────────
//
// MoéGo calls them Pet Codes; we already have a tag catalogue, and inventing
// a second vocabulary for the same idea would leave a facility maintaining
// both. BLOCKED BEATS ELIGIBLE, stated on the screen rather than left to be
// discovered: a pet carrying a blocked tag cannot book the service even if it
// also carries an eligible one.
// ============================================================================

interface Props {
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  eligibleWeightTiers: string[];
  eligiblePetTags: string[];
  blockedPetTags: string[];
  onChange: (patch: {
    eligibleSpecies?: string[];
    eligibleBreeds?: string[];
    eligibleWeightTiers?: string[];
    eligiblePetTags?: string[];
    blockedPetTags?: string[];
  }) => void;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** A chip row. Nothing selected reads as "all", which is what the table means. */
function ChipRow({
  options,
  selected,
  onToggle,
  emptyMeans,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyMeans: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              // A 2px ring rather than an edge accent or a tint fill: §6 rule 1
              // bans the line and rule 2 bans the wash.
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-medium max-lg:min-h-12",
                "transition-[background-color,box-shadow] duration-150",
                on
                  ? "bg-primary text-primary-foreground border-transparent shadow-[inset_0_0_0_2px_var(--primary)]"
                  : "bg-card hover:bg-muted border-[var(--line)]",
              )}
              aria-pressed={on}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected.length === 0 ? (
        <p className="text-muted-foreground text-[13.5px]">{emptyMeans}</p>
      ) : null}
    </div>
  );
}

export function DaycarePetEligibility({
  eligibleSpecies,
  eligibleBreeds,
  eligibleWeightTiers,
  eligiblePetTags,
  blockedPetTags,
  onChange,
}: Props) {
  const { t } = useStaffText("daycareServices");
  const { config: speciesConfig } = useSpeciesConfig();
  const { tags } = useTagCatalogue();

  // A species is a name the FACILITY typed, so it is its own id and is never
  // put through the locale layer (§5q).
  const speciesOptions = useMemo(
    () => speciesConfig.species.map((name) => ({ id: name, label: name })),
    [speciesConfig.species],
  );

  const weightTiers = useMemo(
    () =>
      (defaultGroomingConfig.petSizeTiers ?? []).map((tier) => ({
        id: tier.id,
        label: tier.maxWeightLbs
          ? `${tier.label} · ${t("underLbs").replace("{n}", String(tier.maxWeightLbs))}`
          : `${tier.label} · ${t("andUp")}`,
      })),
    [t],
  );

  // Only PET tags. A client tag on a pet rule would never match anything.
  const petTags = useMemo(
    () =>
      tags
        .filter((tag) => tag.type === "pet")
        .map((tag) => ({ id: String(tag.id), label: tag.name })),
    [tags],
  );

  return (
    <div className="space-y-6">
      {/* ── Type & breed ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-[15px] font-semibold">{t("typeAndBreed")}</Label>
        <ChipRow
          options={speciesOptions}
          selected={eligibleSpecies}
          onToggle={(id) =>
            onChange({ eligibleSpecies: toggle(eligibleSpecies, id) })
          }
          emptyMeans={t("allTypesAndBreeds")}
        />

        <div className="space-y-2">
          <Label htmlFor="daycare-breeds" className="text-[13.5px]">
            {t("breedsLabel")}
          </Label>
          {/* Free text, comma separated: the breed a client typed is the breed
              on the pet's record, and no fixed list here would match it. */}
          <Input
            id="daycare-breeds"
            value={eligibleBreeds.join(", ")}
            placeholder={t("breedsPlaceholder")}
            onChange={(e) =>
              onChange({
                eligibleBreeds: e.target.value
                  .split(",")
                  .map((b) => b.trim())
                  .filter(Boolean),
              })
            }
          />
          {eligibleBreeds.length === 0 ? (
            <p className="text-muted-foreground text-[13.5px]">
              {t("allBreeds")}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Weight ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-[15px] font-semibold">{t("weight")}</Label>
        <ChipRow
          options={weightTiers}
          selected={eligibleWeightTiers}
          onToggle={(id) =>
            onChange({ eligibleWeightTiers: toggle(eligibleWeightTiers, id) })
          }
          emptyMeans={t("fullWeightRange")}
        />
      </div>

      {/* ── Pet codes ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-[15px] font-semibold">{t("petCodes")}</Label>
          <Badge variant="outline">{t("blockedBeatsEligible")}</Badge>
        </div>

        {petTags.length === 0 ? (
          <p className="text-muted-foreground text-[13.5px]">
            {t("noPetTagsYet")}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-[13.5px]">{t("onlyPetsWith")}</Label>
              <ChipRow
                options={petTags}
                selected={eligiblePetTags}
                onToggle={(id) =>
                  onChange({ eligiblePetTags: toggle(eligiblePetTags, id) })
                }
                emptyMeans={t("noCodeRestriction")}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13.5px]">{t("neverPetsWith")}</Label>
              <ChipRow
                options={petTags}
                selected={blockedPetTags}
                onToggle={(id) =>
                  onChange({ blockedPetTags: toggle(blockedPetTags, id) })
                }
                emptyMeans={t("nothingBlocked")}
              />
            </div>
          </>
        )}
      </div>

      {(eligibleSpecies.length > 0 ||
        eligibleBreeds.length > 0 ||
        eligibleWeightTiers.length > 0 ||
        eligiblePetTags.length > 0 ||
        blockedPetTags.length > 0) && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange({
              eligibleSpecies: [],
              eligibleBreeds: [],
              eligibleWeightTiers: [],
              eligiblePetTags: [],
              blockedPetTags: [],
            })
          }
        >
          {t("openToEveryPet")}
        </Button>
      )}
    </div>
  );
}
