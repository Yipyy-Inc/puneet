"use client";

import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FormStatusChip,
  formChipStatusOf,
} from "@/components/yipyygo/form-status-chip";
import type { YipyyGoSubmission } from "@/lib/api/mappers/yipyy-go";
import { formatNumber } from "@/lib/i18n/format";
import { useShellText } from "@/lib/shell/use-shell-text";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  BELONGING_KEYS,
  MED_FREQUENCY_KEYS,
  answerLabel,
} from "@/lib/yipyy-go/answer-labels";

export const SATISFIED = new Set([
  "submitted",
  "approved",
  "completed_by_staff",
]);

export interface PetCheck {
  medicationsConfirmed: boolean;
  belongingsConfirmed: boolean;
  overrideReason: string;
}

// One dog at the desk: where its form stands, the medications and belongings
// it says the dog came with, a box for each that staff confirm in hand, and —
// where the facility requires the form and none was sent — why the dog is
// checked in anyway, which the desk check keeps.
export function PetCheckSection({
  pet,
  required,
  check,
  reasonMissing,
  onChange,
}: {
  pet: { ref: number; name: string; submission: YipyyGoSubmission | null };
  /** Whether the facility requires the form; null when it asks for none. */
  required: boolean | null;
  check: PetCheck;
  reasonMissing: boolean;
  onChange: (next: Partial<PetCheck>) => void;
}) {
  const { t, fill, locale } = useStaffText("kiosk");
  const shell = useShellText("yipyygo");
  const answers = pet.submission?.answers;
  const medications =
    answers && !answers.noMedications ? answers.medications : [];
  const belongings = answers?.belongings ?? [];
  const needsReason =
    required === true && !SATISFIED.has(pet.submission?.status ?? "");
  const id = `kiosk-pet-${pet.ref}`;
  const box = "flex min-h-10 items-start gap-3 max-lg:min-h-12";

  return (
    <section
      aria-labelledby={`${id}-name`}
      className="border-line bg-card space-y-3 rounded-2xl border p-[18px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`${id}-name`}
          className="text-body-ink text-[15px] font-semibold"
        >
          {pet.name}
        </h3>
        {required !== null && (
          <FormStatusChip
            status={formChipStatusOf(pet.submission, required)}
            mandatory={required}
          />
        )}
      </div>

      {answers && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <dt className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
              {t("medications")}
            </dt>
            <dd className="text-body-ink space-y-0.5 text-[14.5px]">
              {medications.length === 0
                ? t("noMedications")
                : medications.map((med) => (
                    <p key={med.id}>
                      {[
                        med.name,
                        med.dosage,
                        med.frequency
                          ? answerLabel(
                              MED_FREQUENCY_KEYS,
                              med.frequency,
                              shell,
                            )
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ))}
            </dd>
          </div>
          <div className="min-w-0 space-y-1">
            <dt className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
              {t("belongings")}
            </dt>
            <dd className="text-body-ink space-y-0.5 text-[14.5px]">
              {belongings.length === 0
                ? t("noBelongings")
                : belongings.map((item) => (
                    <p key={item.id}>
                      {[
                        answerLabel(BELONGING_KEYS, item.type, shell),
                        item.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {item.quantity
                        ? ` × ${formatNumber(item.quantity, locale)}`
                        : ""}
                    </p>
                  ))}
            </dd>
          </div>
        </dl>
      )}

      {medications.length > 0 && (
        <div className={box}>
          <Checkbox
            id={`${id}-medications`}
            checked={check.medicationsConfirmed}
            onCheckedChange={(value) =>
              onChange({ medicationsConfirmed: value === true })
            }
            className="mt-0.5"
          />
          <Label htmlFor={`${id}-medications`} className="text-body/snug">
            {fill("confirmMedications", { pet: pet.name })}
          </Label>
        </div>
      )}
      {belongings.length > 0 && (
        <div className={box}>
          <Checkbox
            id={`${id}-belongings`}
            checked={check.belongingsConfirmed}
            onCheckedChange={(value) =>
              onChange({ belongingsConfirmed: value === true })
            }
            className="mt-0.5"
          />
          <Label htmlFor={`${id}-belongings`} className="text-body/snug">
            {fill("confirmBelongings", { pet: pet.name })}
          </Label>
        </div>
      )}

      {needsReason && (
        <div className="space-y-2">
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>
              {fill("formMissingTitle", { pet: pet.name })}
            </AlertTitle>
          </Alert>
          <Label htmlFor={`${id}-reason`}>
            {fill("overrideLabel", { pet: pet.name })}
          </Label>
          <Textarea
            id={`${id}-reason`}
            rows={2}
            maxLength={1000}
            value={check.overrideReason}
            placeholder={t("overridePlaceholder")}
            aria-invalid={reasonMissing || undefined}
            aria-describedby={reasonMissing ? `${id}-reason-note` : undefined}
            onChange={(event) =>
              onChange({ overrideReason: event.target.value })
            }
          />
          {reasonMissing && (
            <p
              id={`${id}-reason-note`}
              className="text-destructive text-[13px] font-medium"
            >
              {fill("overrideRequired", { pet: pet.name })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
