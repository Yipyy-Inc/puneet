"use client";

import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import { Photo } from "@/components/ui/photo";
import { useEntityNotes } from "@/lib/api/notes";
import { allergiesOf } from "@/lib/bookings/details/service-view";
import { formatWeightFromLb } from "@/lib/i18n/format";
import { calculatePetAge } from "@/lib/pet-utils";
import type { Pet } from "@/types/pet";

import { DetailsCard, DetailsCardHeader } from "../details-card";
import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// The Pet card, as the mock draws it: the pet's photo (the striped circle when
// there is none), its name, breed · species · age · weight, chips for what
// matters — an allergy, whether its vaccines are in order, spayed or neutered
// — and the note staff left about it. A booking with two pets has a block for
// each, under the same card.
// ============================================================================

export function PetCard({ d }: { d: BookingDetails }) {
  const { t } = d.text;
  const client = d.client;
  if (!client || d.pets.length === 0) return null;
  const first = d.pets[0];
  return (
    <DetailsCard>
      <DetailsCardHeader
        title={d.pets.length === 1 ? t("petsOne") : t("cardPets")}
      >
        {d.pets.length === 1 ? (
          <Link
            href={d.portal.href(
              `/facility/dashboard/clients/${client.id}/pets/${first.id}`,
            )}
            className="text-primary hover:text-primary-hover text-[13px] font-semibold"
          >
            {t("petProfile")}
          </Link>
        ) : null}
      </DetailsCardHeader>
      <div className="divide-line-soft flex flex-col divide-y">
        {d.pets.map((pet) => (
          <PetBlock key={pet.id} d={d} pet={pet} />
        ))}
      </div>
    </DetailsCard>
  );
}

function PetBlock({ d, pet }: { d: BookingDetails; pet: Pet }) {
  const { t, fill, locale } = d.text;
  const { notes } = useEntityNotes("pet", pet.id);
  const booking = d.booking;

  const age = (() => {
    const a = calculatePetAge(pet.dateOfBirth, pet.age);
    if (a.years >= 1) {
      return fill(a.years === 1 ? "ageYear" : "ageYears", { n: a.years });
    }
    if (a.months >= 1) return fill("ageMonths", { n: a.months });
    return fill("ageWeeks", { n: Math.max(1, a.weeks) });
  })();
  // A breed as the owner typed it, and the species the record holds, never
  // pass through the locale layer (§5q).
  const facts = [
    pet.breed,
    pet.type,
    age,
    pet.weight ? formatWeightFromLb(pet.weight, locale) : null,
  ].filter(Boolean);

  const allergies = allergiesOf(pet.allergies);
  const gaps = booking ? d.vaccineGaps(booking.service, [pet]) : [];
  const fixed =
    pet.spayedNeutered === true
      ? pet.sex === "male"
        ? t("neutered")
        : pet.sex === "female"
          ? t("spayed")
          : t("spayedOrNeutered")
      : null;

  // The note staff pinned to the pet, else its newest — else what the
  // profile says it needs.
  const note =
    notes.find((n) => n.isPinned)?.content ??
    notes[0]?.content ??
    (pet.specialNeeds && pet.specialNeeds !== "None" ? pet.specialNeeds : "");

  return (
    <div className="flex flex-col gap-3.5 px-5 py-4">
      <div className="flex items-center gap-3">
        <Photo
          src={pet.imageUrl}
          shape="pet"
          label={t("photoSlot")}
          className="size-13 rounded-full"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[16px] font-semibold">{pet.name}</span>
          <span className="text-ink-tertiary text-[13px]">
            {facts.join(" · ")}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allergies.map((allergy) => (
          <Chip key={allergy} tone="bd-danger" size="bd-pet">
            {fill("alertAllergy", { allergy })}
          </Chip>
        ))}
        {gaps.length === 0 ? (
          <Chip tone="success" size="bd-pet">
            {t("vaccinesUpToDate")}
          </Chip>
        ) : (
          <Chip tone="bd-danger" size="bd-pet">
            {fill("vaccinesDue", { vaccines: gaps[0].vaccines.join(", ") })}
          </Chip>
        )}
        {fixed ? (
          <Chip tone="neutral" size="bd-pet">
            {fixed}
          </Chip>
        ) : null}
      </div>
      {note ? (
        <p className="text-ink-secondary text-[13px] leading-normal">{note}</p>
      ) : null}
    </div>
  );
}
