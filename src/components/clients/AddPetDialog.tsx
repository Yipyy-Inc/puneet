"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BreedCombobox } from "@/components/shared/BreedCombobox";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePet } from "@/lib/api/client";
import { calculatePetAge } from "@/lib/pet-utils";
import { localToday } from "@/lib/vaccinations";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Add a pet to a client who is already on file.
//
// The profile's "Add pet" and "Add first pet" buttons had no handler; the only
// way to give a client a pet was to create the client again. This posts to
// /api/pets with the owner's ref — the database stamps the facility from the
// owner — and the client's nested pets refresh with the roster.
//
// The field labels are the create-client form's own (`createClient` area), so
// the two forms cannot drift into calling the same thing two names. Only name
// and species are required: at the desk, a pet exists before its paperwork.
// ============================================================================

type Sex = "" | "male" | "female";
type Fixed = "" | "yes" | "no";

export function AddPetDialog({
  open,
  onOpenChange,
  clientRef,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientRef: number;
  clientName: string;
}) {
  const { t: formT } = useStaffText("createClient");
  const { t, fill } = useStaffText("clientProfile");
  const createPet = useCreatePet();

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Dog");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState<Sex>("");
  const [fixed, setFixed] = useState<Fixed>("");
  const [color, setColor] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [allergies, setAllergies] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && !createPet.isPending;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    try {
      await createPet.mutateAsync({
        clientId: clientRef,
        name: trimmed,
        type: species,
        breed: breed.trim(),
        dateOfBirth: dateOfBirth || undefined,
        age: dateOfBirth ? calculatePetAge(dateOfBirth).years : undefined,
        weight: weight ? Number(weight) || 0 : undefined,
        sex: sex || undefined,
        spayedNeutered: fixed ? fixed === "yes" : undefined,
        color: color.trim(),
        microchip: microchip.trim(),
        allergies: allergies.trim() || undefined,
        specialNeeds: specialNeeds.trim() || undefined,
      });
      toast.success(
        fill("petAddedToast", { pet: trimmed, client: clientName }),
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(t("petAddFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {fill("addPetTitle", { client: clientName })}
          </DialogTitle>
          <DialogDescription>{t("addPetDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-name">{formT("petName")}</Label>
              <Input
                id="pet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-species">{formT("species")}</Label>
              <Select
                value={species}
                onValueChange={(v) => {
                  setSpecies(v);
                  setBreed("");
                }}
              >
                <SelectTrigger id="pet-species">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dog">{formT("speciesDog")}</SelectItem>
                  <SelectItem value="Cat">{formT("speciesCat")}</SelectItem>
                  <SelectItem value="Other">{formT("speciesOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{formT("breed")}</Label>
            <BreedCombobox
              species={species}
              value={breed}
              onChange={setBreed}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-dob">{formT("dateOfBirth")}</Label>
              <DatePicker
                id="pet-dob"
                value={dateOfBirth}
                onValueChange={setDateOfBirth}
                max={localToday()}
                placeholder={formT("selectDateOfBirth")}
                displayMode="dialog"
                showQuickPresets={false}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-weight">{formT("weightLbs")}</Label>
              <Input
                id="pet-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-sex">{formT("sex")}</Label>
              <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
                <SelectTrigger id="pet-sex">
                  <SelectValue placeholder={formT("select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{formT("sexMale")}</SelectItem>
                  <SelectItem value="female">{formT("sexFemale")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-fixed">{formT("spayedNeutered")}</Label>
              <Select value={fixed} onValueChange={(v) => setFixed(v as Fixed)}>
                <SelectTrigger id="pet-fixed">
                  <SelectValue placeholder={formT("select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{formT("yes")}</SelectItem>
                  <SelectItem value="no">{formT("no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-color">{formT("colorMarkings")}</Label>
              <Input
                id="pet-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pet-chip">{formT("microchipNumber")}</Label>
              <Input
                id="pet-chip"
                value={microchip}
                onChange={(e) => setMicrochip(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet-allergies">{formT("allergies")}</Label>
            <Input
              id="pet-allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pet-needs">{t("specialNeedsLabel")}</Label>
            <Input
              id="pet-needs"
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createPet.isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {createPet.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {trimmed
                ? fill("addPetNamed", { pet: trimmed })
                : t("addPetButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
