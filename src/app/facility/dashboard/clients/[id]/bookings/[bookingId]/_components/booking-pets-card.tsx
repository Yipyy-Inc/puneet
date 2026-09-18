"use client";

import Link from "next/link";
import { AlertTriangle, PawPrint, ShieldCheck } from "lucide-react";

import { TagList } from "@/components/shared/TagList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { formatWeightFromLb } from "@/lib/i18n/format";
import { calculatePetAge } from "@/lib/pet-utils";
import { usePortalHref } from "@/lib/nav/use-portal-href";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Pet } from "@/types/pet";

// ============================================================================
// The pets on the booking. Moved out of the page as it was translated; on the
// way the avatar became PetAvatar — the ring every pet wears (§2b), with the
// dot while the pet is on the premises — the weight reads kilograms first
// (§5q; `pets.weight` is stored in pounds), and the age and sex are words in
// the viewer's language rather than "3 yrs" and "male".
// ============================================================================

export function BookingPetsCard({
  pets,
  clientId,
  onSite,
}: {
  pets: Pet[];
  clientId: number;
  /** The booking's pets are on the premises now. */
  onSite: boolean;
}) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const portal = usePortalHref();
  if (pets.length === 0) return null;

  const age = (pet: Pet) => {
    const a = calculatePetAge(pet.dateOfBirth, pet.age);
    if (a.years >= 1) {
      return fill(a.years === 1 ? "ageYear" : "ageYears", { n: a.years });
    }
    if (a.months >= 1) return fill("ageMonths", { n: a.months });
    return fill("ageWeeks", { n: Math.max(1, a.weeks) });
  };
  const sex = (value?: string) =>
    value?.toLowerCase() === "male"
      ? t("sexMale")
      : value?.toLowerCase() === "female"
        ? t("sexFemale")
        : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-ink-tertiary flex items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
          <PawPrint className="size-4" />
          {pets.length === 1
            ? t("petsOne")
            : fill("petsMany", { n: pets.length })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-1 pb-4">
        {pets.map((pet) => {
          const href = portal.href(
            `/facility/dashboard/clients/${clientId}/pets/${pet.id}`,
          );
          const facts = [
            // A breed as the owner typed it never passes through the locale
            // layer (§5q); nor does the species the record holds.
            pet.breed,
            pet.type,
            age(pet),
            pet.weight ? formatWeightFromLb(pet.weight, locale) : null,
            sex(pet.sex),
          ].filter(Boolean);
          return (
            <div
              key={pet.id}
              className="border-line flex min-w-0 items-center gap-3 rounded-2xl border p-3"
            >
              <Link href={href} className="shrink-0" tabIndex={-1}>
                <PetAvatar
                  name={pet.name}
                  src={pet.imageUrl}
                  size="lg"
                  present={onSite}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={href}
                    className="text-body-ink text-sm font-semibold hover:underline"
                  >
                    {pet.name}
                  </Link>
                  <TagList
                    entityType="pet"
                    entityId={pet.id}
                    compact
                    maxVisible={2}
                  />
                </div>
                <p className="text-ink-secondary mt-0.5 text-xs">
                  {facts.join(" · ")}
                </p>
                {((pet.allergies && pet.allergies !== "None") ||
                  (pet.specialNeeds && pet.specialNeeds !== "None")) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {pet.allergies && pet.allergies !== "None" && (
                      <span className="bg-wash-error text-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
                        <ShieldCheck className="size-4 shrink-0" />
                        {pet.allergies}
                      </span>
                    )}
                    {pet.specialNeeds && pet.specialNeeds !== "None" && (
                      <span className="bg-wash-primary text-info inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
                        <AlertTriangle className="size-4 shrink-0" />
                        {pet.specialNeeds}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
