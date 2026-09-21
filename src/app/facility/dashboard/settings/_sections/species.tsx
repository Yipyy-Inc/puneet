"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsBlock } from "@/components/ui/settings-block";
import {
  useSaveFacilitySetting,
  useSpeciesConfig,
} from "@/lib/api/facility-settings";
import { sameSpecies, type SpeciesConfig } from "@/lib/settings/species";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// WHICH ANIMALS THIS FACILITY TAKES.
//
// A fixture until 2026-09-21 — `facilitySpeciesConfig` in src/data/settings.ts,
// `["Dog", "Cat"]` for every facility in the product, with no screen. It is a
// settings domain now because a daycare rate can say which animals it is for,
// and that is only a real question if a facility can say which it takes.
//
// ── THE LIST IS THE FACILITY'S OWN WORDS ──────────────────────────────────
//
// Free text, never a fixed menu. A facility that boards rabbits is not a data
// error, and `pets.species` has always been free text — which is also why
// nothing here compares species with `===`: Pawradise already holds one pet
// recorded "dog" and another "Dog". `sameSpecies` folds case, and it is the
// only comparison anything should use.
// ============================================================================

export function SpeciesSection() {
  const t = useSettingsText().section("species");
  const { config } = useSpeciesConfig();
  const save = useSaveFacilitySetting();

  return (
    <SettingsBlock<SpeciesConfig>
      title={t("title")}
      description={t("description")}
      data={config}
      onSave={(next) =>
        save.mutateAsync({ domain: "species_config", value: next })
      }
    >
      {(isEditing, local, setLocal) => (
        <SpeciesEditor
          isEditing={isEditing}
          value={local}
          onChange={setLocal}
          t={t}
        />
      )}
    </SettingsBlock>
  );
}

function SpeciesEditor({
  isEditing,
  value,
  onChange,
  t,
}: {
  isEditing: boolean;
  value: SpeciesConfig;
  onChange: (next: SpeciesConfig) => void;
  t: (key: string) => string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    // Case-folded, because "dog" and "Dog" are one species and a list holding
    // both would offer staff the same animal twice.
    if (value.species.some((s) => sameSpecies(s, name))) {
      setDraft("");
      return;
    }
    onChange({ ...value, species: [...value.species, name] });
    setDraft("");
  };

  const remove = (name: string) =>
    onChange({
      ...value,
      species: value.species.filter((s) => !sameSpecies(s, name)),
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("nounLabel")}</Label>
        <Input
          value={value.petNounPlural}
          readOnly={!isEditing}
          onChange={(e) =>
            onChange({ ...value, petNounPlural: e.target.value })
          }
          placeholder={t("nounPlaceholder")}
        />
        <p className="text-ink-tertiary text-[13.5px]">{t("nounHelp")}</p>
      </div>

      <div className="space-y-2">
        <Label>{t("speciesLabel")}</Label>
        <ul className="space-y-2">
          {value.species.map((name) => (
            <li
              key={name.toLowerCase()}
              className="bg-muted/50 flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 max-lg:min-h-12"
            >
              <span className="text-[14.5px] font-medium">{name}</span>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${t("remove")} ${name}`}
                  onClick={() => remove(name)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {/* An empty list is never right — it would mean the facility takes no
            animals, and would hide every species-limited rate from every pet.
            Said plainly rather than enforced, because a facility mid-edit is
            allowed to have removed both before adding theirs. */}
        {value.species.length === 0 && (
          <p className="text-warning text-[13.5px]">{t("emptyWarning")}</p>
        )}

        {isEditing && (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder={t("speciesPlaceholder")}
            />
            <Button type="button" variant="outline" onClick={add}>
              <Plus className="mr-1 size-4" />
              {t("add")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
