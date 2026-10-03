"use client";

import { Button } from "@/components/ui/button";
import { usePetGroomingPreferences } from "@/lib/api/pet-grooming-preferences";
import type { Pet } from "@/types/pet";

import { DetailsCard, DetailsCardHeader, DetailsRow } from "../details-card";
import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// Groom preferences, as the mock draws them: Cut, Face, Ears, Shampoo and
// Behavior — the PET's (`pet_grooming_preferences`), carried from groom to
// groom, so the next booking shows what this groomer settled on. Edit opens
// the form; a preference nobody has set reads "—".
// ============================================================================

const FIELDS = ["cut", "face", "ears", "shampoo", "behavior"] as const;
const LABEL: Record<(typeof FIELDS)[number], string> = {
  cut: "prefCut",
  face: "prefFace",
  ears: "prefEars",
  shampoo: "prefShampoo",
  behavior: "prefBehavior",
};

export function GroomPrefsCard({
  d,
  onEdit,
}: {
  d: BookingDetails;
  /** Edit one pet's preferences; absent for a viewer who may not. */
  onEdit?: (pet: Pet) => void;
}) {
  const { t } = d.text;
  if (d.pets.length === 0) return null;
  return (
    <DetailsCard>
      <DetailsCardHeader title={t("cardGroomPrefs")}>
        {onEdit && d.pets.length === 1 ? (
          <Button
            variant="quiet"
            size="bd-34"
            onClick={() => onEdit(d.pets[0])}
          >
            {t("edit")}
          </Button>
        ) : null}
      </DetailsCardHeader>
      {d.pets.map((pet) => (
        <PrefsBlock
          key={pet.id}
          d={d}
          pet={pet}
          onEdit={d.pets.length > 1 ? onEdit : undefined}
        />
      ))}
    </DetailsCard>
  );
}

function PrefsBlock({
  d,
  pet,
  onEdit,
}: {
  d: BookingDetails;
  pet: Pet;
  onEdit?: (pet: Pet) => void;
}) {
  const { t } = d.text;
  const { data: prefs } = usePetGroomingPreferences(pet.id);
  return (
    <div className="flex flex-col px-5 pt-2 pb-3.5">
      {onEdit ? (
        <div className="flex items-center justify-between gap-3 pt-1.5">
          <span className="text-ink-secondary text-[13px] font-semibold">
            {pet.name}
          </span>
          <Button variant="quiet" size="bd-34" onClick={() => onEdit(pet)}>
            {t("edit")}
          </Button>
        </div>
      ) : null}
      <dl className="flex flex-col">
        {FIELDS.map((field) => (
          <DetailsRow key={field} label={t(LABEL[field])}>
            {prefs?.[field]?.trim() || "—"}
          </DetailsRow>
        ))}
      </dl>
    </div>
  );
}
