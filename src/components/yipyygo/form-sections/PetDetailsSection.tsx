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
    if (!values.name.trim()) list.push("Name");
    if (!values.breed.trim()) list.push("Breed");
    if (!values.weight.trim() || Number(values.weight) <= 0)
      list.push("Weight");
    if (!values.age.trim()) list.push("Age");
    return list;
  }, [values]);

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
            <CardTitle>Verify {pet.name}&apos;s details</CardTitle>
            <CardDescription>
              Prefilled from your pet&apos;s profile. Update anything that has
              changed since the last stay.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {missing.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Please fill in: <strong>{missing.join(", ")}</strong>.
            </AlertDescription>
          </Alert>
        )}
        {missing.length === 0 && (
          <Alert>
            <CheckCircle2 className="size-4 text-green-600" />
            <AlertDescription>
              {pet.name}&apos;s profile looks complete. Full profile in{" "}
              <Link
                href={`/customer/pets/${pet.id}`}
                className="text-primary underline"
              >
                My Pets
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pet-name">Name</Label>
            <Input
              id="pet-name"
              value={values.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-breed">Breed</Label>
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
              placeholder="e.g., Black &amp; white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-microchip">Microchip #</Label>
            <Input
              id="pet-microchip"
              value={values.microchip}
              onChange={(e) => update({ microchip: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="pet-allergies">Allergies</Label>
            <Input
              id="pet-allergies"
              value={values.allergies}
              onChange={(e) => update({ allergies: e.target.value })}
              placeholder="None / list allergies"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="pet-special">Special needs</Label>
            <Input
              id="pet-special"
              value={values.specialNeeds}
              onChange={(e) => update({ specialNeeds: e.target.value })}
              placeholder="None / e.g., Anxiety around fireworks"
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!canContinue}>
            Next: Booking details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
