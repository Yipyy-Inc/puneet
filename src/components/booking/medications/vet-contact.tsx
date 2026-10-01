"use client";

import { Stethoscope } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { VetContact } from "@/types/booking";

// ============================================================================
// The pet's vet, asked once the pet takes a medication — where the facility
// asks for it (Settings › Feeding & medications › Supply & safety). Started
// from the pet's profile, and saved back to it with the booking.
// ============================================================================

export function VetContactFields({
  petId,
  petName,
  vet,
  onChange,
}: {
  petId: number;
  petName: string;
  vet: VetContact;
  onChange: (patch: Partial<VetContact>) => void;
}) {
  const t = useShellText("booking");
  const titleId = `meds-vet-${petId}`;
  return (
    <section
      aria-labelledby={titleId}
      className="border-line bg-card flex min-w-0 flex-col gap-3.5 rounded-xl border p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Stethoscope
          className="text-ink-secondary mt-0.5 size-5 shrink-0"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 id={titleId} className="text-body-strong text-body-ink">
            {fill(t("medsVetTitle"), { pet: petName })}
          </h4>
          <p className="text-meta text-ink-tertiary">{t("medsVetHelp")}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${titleId}-clinic`}>{t("medsVetClinic")}</Label>
          <Input
            id={`${titleId}-clinic`}
            value={vet.clinic ?? ""}
            maxLength={120}
            autoComplete="organization"
            placeholder={t("medsVetClinicPlaceholder")}
            onChange={(event) => onChange({ clinic: event.target.value })}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${titleId}-phone`}>{t("medsVetPhone")}</Label>
          <Input
            id={`${titleId}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={40}
            value={vet.phone ?? ""}
            onChange={(event) => onChange({ phone: event.target.value })}
            className="tabular-nums"
          />
        </div>
      </div>
    </section>
  );
}
