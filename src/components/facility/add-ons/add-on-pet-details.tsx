"use client";

import { useQuery } from "@tanstack/react-query";

import { ChipRow } from "@/components/facility/services/pet-eligibility";
import { breedQueries } from "@/lib/api/breeds";
import { useSpeciesConfig } from "@/lib/api/facility-settings";
import { formatWeightFromLb } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { sameSpecies } from "@/lib/settings/species";
import {
  ADD_ON_COAT_TYPES,
  ADD_ON_WEIGHT_TIERS,
  type AddOnCoatType,
  type AddOnWeightTier,
} from "@/types/add-on";

import type { AddOnDraft } from "./add-on-draft";
import { AddOnBreedPicker } from "./add-on-breed-picker";
import { AddOnOptionCards } from "./add-on-option-cards";
import { AddOnSection } from "./add-on-section";

/** The size tiers' pound bands — the same four every menu here prices by. */
const TIER_BANDS: Record<AddOnWeightTier, { from: number; to: number | null }> =
  {
    small: { from: 0, to: 15 },
    medium: { from: 15, to: 35 },
    large: { from: 35, to: 70 },
    giant: { from: 70, to: null },
  };

const TIER_LABEL: Record<AddOnWeightTier, string> = {
  small: "sizeSmall",
  medium: "sizeMedium",
  large: "sizeLarge",
  giant: "sizeGiant",
};

const COAT_LABEL: Record<AddOnCoatType, string> = {
  short: "coatShort",
  medium: "coatMedium",
  long: "coatLong",
  wire: "coatWire",
  curly: "coatCurly",
  hairless: "coatHairless",
};

/** Stable: a fresh `[]` every render is what check:query-default-loops is for. */
const NO_BREEDS: { name: string; species: string }[] = [];

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/**
 * Pet details — who the add-on is for, in the reference's three choices, each
 * "all" or customised: type & breed, weight, coat type. The options come from
 * the facility's own settings (species) and breed list.
 */
export function AddOnPetDetails({
  index,
  draft,
  patch,
  t,
  locale,
}: {
  index: number;
  draft: AddOnDraft;
  patch: (next: Partial<AddOnDraft>) => void;
  t: (key: string) => string;
  locale: AppLocale;
}) {
  const { config } = useSpeciesConfig();
  const { data: breeds = NO_BREEDS } = useQuery(breedQueries.all());

  const species = config.species.length > 0 ? config.species : ["Dog", "Cat"];
  const breedsOf = (kind: string) =>
    breeds
      .filter((b) => sameSpecies(b.species, kind))
      .map((b) => b.name)
      .sort((a, b) => a.localeCompare(b));

  const tierLabel = (tier: AddOnWeightTier) => {
    const band = TIER_BANDS[tier];
    const name = t(TIER_LABEL[tier]);
    if (band.from === 0) {
      return t("tierUpTo")
        .replace("{tier}", name)
        .replace("{weight}", formatWeightFromLb(band.to!, locale));
    }
    if (band.to === null) {
      return t("tierOver")
        .replace("{tier}", name)
        .replace("{weight}", formatWeightFromLb(band.from, locale));
    }
    return t("tierBetween")
      .replace("{tier}", name)
      .replace("{from}", formatWeightFromLb(band.from, locale))
      .replace("{to}", formatWeightFromLb(band.to, locale));
  };

  return (
    <AddOnSection index={index} title={t("secPetDetails")}>
      {/* ── Type & breed ── */}
      <div className="space-y-3">
        <p className="text-[15px] font-semibold">{t("typeBreed")}</p>
        <AddOnOptionCards
          label={t("typeBreed")}
          value={draft.allTypes ? "all" : "custom"}
          onChange={(value) => patch({ allTypes: value === "all" })}
          options={[
            { value: "all", title: t("allTypesBreeds") },
            { value: "custom", title: t("customize") },
          ]}
        />
        {!draft.allTypes ? (
          <div className="space-y-4">
            <ChipRow
              options={species.map((s) => ({ id: s, label: s }))}
              selected={draft.eligibleSpecies}
              onToggle={(kind) => {
                const next = toggle(draft.eligibleSpecies, kind);
                // A type taken off takes its breeds with it.
                const kept = next.flatMap((k) => breedsOf(k));
                patch({
                  eligibleSpecies: next,
                  eligibleBreeds: draft.eligibleBreeds.filter((b) =>
                    kept.includes(b),
                  ),
                });
              }}
            />
            {draft.eligibleSpecies.map((kind) => {
              const own = breedsOf(kind);
              return (
                <AddOnBreedPicker
                  key={kind}
                  species={kind}
                  breeds={own}
                  selected={draft.eligibleBreeds.filter((b) => own.includes(b))}
                  onChange={(next) =>
                    patch({
                      eligibleBreeds: [
                        ...draft.eligibleBreeds.filter((b) => !own.includes(b)),
                        ...next,
                      ],
                    })
                  }
                  t={t}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ── Weight ── */}
      <div className="space-y-3">
        <p className="text-[15px] font-semibold">{t("weight")}</p>
        <AddOnOptionCards
          label={t("weight")}
          value={draft.fullWeightRange ? "all" : "custom"}
          onChange={(value) => patch({ fullWeightRange: value === "all" })}
          options={[
            { value: "all", title: t("fullRange") },
            { value: "custom", title: t("customize") },
          ]}
        />
        {!draft.fullWeightRange ? (
          <ChipRow
            options={ADD_ON_WEIGHT_TIERS.map((tier) => ({
              id: tier,
              label: tierLabel(tier),
            }))}
            selected={draft.eligibleWeightTiers}
            onToggle={(tier) =>
              patch({
                eligibleWeightTiers: toggle(
                  draft.eligibleWeightTiers,
                  tier as AddOnWeightTier,
                ),
              })
            }
          />
        ) : null}
      </div>

      {/* ── Coat type ── */}
      <div className="space-y-3">
        <p className="text-[15px] font-semibold">{t("coatType")}</p>
        <AddOnOptionCards
          label={t("coatType")}
          value={draft.allCoats ? "all" : "custom"}
          onChange={(value) => patch({ allCoats: value === "all" })}
          options={[
            { value: "all", title: t("allCoats") },
            { value: "custom", title: t("selectedCoats") },
          ]}
        />
        {!draft.allCoats ? (
          <ChipRow
            options={ADD_ON_COAT_TYPES.map((coat) => ({
              id: coat,
              label: t(COAT_LABEL[coat]),
            }))}
            selected={draft.eligibleCoatTypes}
            onToggle={(coat) =>
              patch({
                eligibleCoatTypes: toggle(
                  draft.eligibleCoatTypes,
                  coat as AddOnCoatType,
                ),
              })
            }
          />
        ) : null}
      </div>
    </AddOnSection>
  );
}
