"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Dog } from "lucide-react";
import type { YipyyGoFormSectionProps } from "@/types/yipyygo";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatList } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

type PetForm = {
  name: string;
  breed: string;
  age: string;
  weight: string;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
};

type PetDetailsSectionProps = YipyyGoFormSectionProps;

export function PetDetailsSection({
  pet,
  onNext,
  onBack,
}: PetDetailsSectionProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const [values, setValues] = useState<PetForm>(() => ({
    name: pet.name ?? "",
    breed: pet.breed ?? "",
    age: pet.age != null ? String(pet.age) : "",
    weight: pet.weight != null ? String(pet.weight) : "",
    color: pet.color ?? "",
    microchip: pet.microchip ?? "",
    allergies: pet.allergies ?? "",
    specialNeeds: pet.specialNeeds ?? "",
  }));

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!values.name.trim()) list.push(t("name"));
    if (!values.breed.trim()) list.push(t("breed"));
    if (!values.weight.trim() || Number(values.weight) <= 0)
      list.push(t("weight"));
    if (!values.age.trim()) list.push(t("age"));
    return list;
  }, [values, t]);

  const update = (updates: Partial<PetForm>) =>
    setValues((v) => ({ ...v, ...updates }));

  const canContinue = missing.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          {pet.imageUrl ? (
            <Image
              src={pet.imageUrl}
              alt={pet.name}
              width={56}
              height={56}
              className="size-14 rounded-full object-cover"
            />
          ) : (
            <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
              <Dog className="text-primary size-7" />
            </div>
          )}
          <div>
            <CardTitle>
              {t("verifyPetDetails").replace("{pet}", pet.name)}
            </CardTitle>
            <CardDescription>{t("prefilledFromPetProfile")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {missing.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              {rich(t("fillIn"), {
                fields: <strong>{formatList(missing, locale)}</strong>,
              })}
            </AlertDescription>
          </Alert>
        )}
        {missing.length === 0 && (
          <Alert>
            <CheckCircle2 className="size-4 text-green-600" />
            <AlertDescription>
              {rich(t("profileLooksComplete"), {
                pet: pet.name,
                link: (
                  <Link
                    href={`/customer/pets/${pet.id}`}
                    className="text-primary underline"
                  >
                    {t("myPets")}
                  </Link>
                ),
              })}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pet-name">{t("name")}</Label>
            <Input
              id="pet-name"
              value={values.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-breed">{t("breed")}</Label>
            <Input
              id="pet-breed"
              value={values.breed}
              onChange={(e) => update({ breed: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-age">Age (years)</Label>
            <Input
              id="pet-age"
              type="number"
              min={0}
              step={0.5}
              value={values.age}
              onChange={(e) => update({ age: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-weight">Weight (lbs)</Label>
            <Input
              id="pet-weight"
              type="number"
              min={0}
              step={0.5}
              value={values.weight}
              onChange={(e) => update({ weight: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-color">Color / markings</Label>
            <Input
              id="pet-color"
              value={values.color}
              onChange={(e) => update({ color: e.target.value })}
              placeholder={t("eGBlackWhite")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-microchip">Microchip #</Label>
            <Input
              id="pet-microchip"
              value={values.microchip}
              onChange={(e) => update({ microchip: e.target.value })}
              placeholder={t("optional")}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="pet-allergies">{t("allergies")}</Label>
            <Input
              id="pet-allergies"
              value={values.allergies}
              onChange={(e) => update({ allergies: e.target.value })}
              placeholder={t("noneListAllergies")}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="pet-special">{t("specialNeeds")}</Label>
            <Input
              id="pet-special"
              value={values.specialNeeds}
              onChange={(e) => update({ specialNeeds: e.target.value })}
              placeholder={t("noneEGAnxietyAround")}
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            {t("back")}
          </Button>
          <Button onClick={onNext} disabled={!canContinue}>
            {t("nextBookingDetails")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
