"use client";

import { useState } from "react";
import { Loader2, Syringe } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useVaccinationRules } from "@/lib/api/facility-settings";
import { useVaccinationMutations } from "@/lib/api/vaccinations";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// A staff member records a vaccination they have in front of them.
//
// Not the customer's upload modal: that one asks an owner for expiry dates
// against the facility's list and "uploaded" its proof to a blob URL that
// died with the tab. At the desk the certificate is already in someone's hand,
// so this takes the fields on it and — when the box is ticked — approves it
// as it is entered, stamped with the person who looked.
//
// The facility's own requirements are offered as quick picks; a vaccine the
// list does not name can still be typed.
// ============================================================================

export function AddVaccinationDialog({
  open,
  onOpenChange,
  petRef,
  petName,
  petSpecies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petRef: number;
  petName: string;
  petSpecies: string;
}) {
  const { t, fill } = useStaffText("vaccinations");
  const { rules } = useVaccinationRules();
  const { add } = useVaccinationMutations();

  const [name, setName] = useState("");
  const [given, setGiven] = useState("");
  const [expires, setExpires] = useState("");
  const [vet, setVet] = useState("");
  const [clinic, setClinic] = useState("");
  const [notes, setNotes] = useState("");
  const [approve, setApprove] = useState(true);

  const picks = rules
    .filter((r) => r.species.toLowerCase() === petSpecies.toLowerCase())
    .map((r) => r.vaccineName);

  const reset = () => {
    setName("");
    setGiven("");
    setExpires("");
    setVet("");
    setClinic("");
    setNotes("");
    setApprove(true);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const expiryBeforeGiven = Boolean(given && expires && expires < given);
  const canSave =
    name.trim().length > 0 && !expiryBeforeGiven && !add.isPending;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    try {
      await add.mutateAsync({
        petRef,
        vaccineName: name.trim(),
        administeredDate: given || undefined,
        expiryDate: expires || undefined,
        veterinarianName: vet.trim() || undefined,
        veterinaryClinic: clinic.trim() || undefined,
        notes: notes.trim() || undefined,
        status: approve ? "approved" : "pending_review",
      });
      toast.success(fill("addedToast", { vaccine: name.trim(), pet: petName }));
      close(false);
    } catch (error) {
      toast.error(t("addFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fill("addTitle", { pet: petName })}</DialogTitle>
          <DialogDescription>{t("addDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vax-name">{t("vaccineLabel")}</Label>
            <Input
              id="vax-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("vaccinePlaceholder")}
              autoComplete="off"
            />
            {picks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {picks.map((pick) => (
                  <Button
                    key={pick}
                    type="button"
                    variant="outline"
                    size="sm"
                    data-selected={name === pick ? "" : undefined}
                    className="data-selected:ring-primary data-selected:ring-2"
                    onClick={() => setName(pick)}
                  >
                    <Syringe aria-hidden className="size-4" />
                    {pick}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="vax-given">{t("givenLabel")}</Label>
              <DatePicker
                id="vax-given"
                value={given}
                onValueChange={setGiven}
                placeholder={t("datePlaceholder")}
                displayMode="dialog"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="vax-expires">{t("expiresLabel")}</Label>
              <DatePicker
                id="vax-expires"
                value={expires}
                onValueChange={setExpires}
                placeholder={t("datePlaceholder")}
                displayMode="dialog"
              />
            </div>
          </div>
          {expiryBeforeGiven && (
            <p className="text-destructive text-sm" role="alert">
              {t("expiryBeforeGiven")}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="vax-vet">{t("vetLabel")}</Label>
              <Input
                id="vax-vet"
                value={vet}
                onChange={(e) => setVet(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="vax-clinic">{t("clinicLabel")}</Label>
              <Input
                id="vax-clinic"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vax-notes">{t("notesLabel")}</Label>
            <Textarea
              id="vax-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={approve}
              onCheckedChange={(v) => setApprove(v === true)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">{t("approveNowLabel")}</span>
              <span className="text-ink-tertiary block">
                {t("approveNowHelp")}
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
              disabled={add.isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {add.isPending && <Loader2 className="size-4 animate-spin" />}
              {fill("saveFor", { pet: petName })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
