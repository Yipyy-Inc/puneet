"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { formatNumber, formatWeightFromLb } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { Pet } from "@/types/pet";

import { OnFileRow } from "./OnFileRow";

// ============================================================================
// The pet's profile, as the facility has it on file.
//
// Read-only, for the reason ContactInfoSection gives: the old step's eight
// fields saved nowhere, so a weight corrected here never reached the team
// weighing the dog. The pet's own profile page is where it changes.
// ============================================================================

export function PetDetailsSection({ pet }: { pet: Pet }) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const name = () => pet.name;
  const age =
    pet.age > 0
      ? t(pet.age === 1 ? "ageYearOne" : "ageYearsOther").replace("{n}", () =>
          formatNumber(pet.age, locale),
        )
      : "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <PetAvatar name={pet.name} src={pet.imageUrl} size="xl" />
          <div className="min-w-0 space-y-1.5">
            <CardTitle>
              {t("verifyPetDetails").replaceAll("{pet}", name)}
            </CardTitle>
            <CardDescription>
              {t("petOnFileHint").replaceAll("{pet}", name)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="divide-line divide-y">
          <OnFileRow label={t("breed")} value={pet.breed} />
          <OnFileRow label={t("age")} value={age} />
          <OnFileRow
            label={t("weight")}
            value={pet.weight ? formatWeightFromLb(pet.weight, locale) : ""}
          />
          <OnFileRow label={t("colorMarkings")} value={pet.color} />
          <OnFileRow label={t("microchip")} value={pet.microchip} />
          <OnFileRow label={t("allergies")} value={pet.allergies} />
          <OnFileRow label={t("specialNeeds")} value={pet.specialNeeds} />
        </dl>

        <Button variant="outline" asChild>
          <Link href={`/customer/pets/${pet.id}`}>
            {t("openPetProfile").replaceAll("{pet}", name)}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
