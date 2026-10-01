"use client";

import { CircleCheck, Info, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatDecimal } from "@/lib/i18n/format";
import {
  fill,
  formatAmount,
  unitWord,
  type Translate,
} from "@/lib/medications/dose";
import { draftDays, draftTimes } from "@/lib/medications/draft";
import { supplyCheck } from "@/lib/medications/schedule";
import { DOSE } from "@/lib/medications/vocabulary";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { AppLocale } from "@/lib/language-settings";

import { AllergyInput } from "./allergy-input";
import { EditorSection, FieldLabel } from "./editor-section";
import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// SUPPLY & NOTES: how much is being brought against what the stay takes,
// drug allergies, special instructions, and keeping the medication on the
// pet's profile for next time.
// ============================================================================

function SupplyStatus({
  step,
  t,
  locale,
}: {
  step: MedicationStepState;
  t: Translate;
  locale: AppLocale;
}) {
  const draft = step.editor!.draft;
  const spec = DOSE[draft.form];
  const doses =
    draftTimes(draft, step.settings).length *
    draftDays(draft, step.stay).length;
  const typed = draft.supply.trim();
  const brought = typed === "" ? null : Number(typed.replace(",", "."));
  const check = supplyCheck({
    doses,
    amount: draft.amount,
    wholeUnits: spec.fraction,
    brought: brought !== null && Number.isFinite(brought) ? brought : null,
  });
  const words = (n: number) =>
    `${formatDecimal(n, locale, 2)} ${unitWord(t, draft.unit, n, locale, draft.customUnit)}`;

  if (check.kind === "unscheduled") {
    return (
      <Badge variant="cancelled" className="h-auto min-h-9 whitespace-normal">
        <Info aria-hidden />
        {t("medsSupplyUnscheduled")}
      </Badge>
    );
  }
  const rounded =
    spec.fraction && check.exact !== check.need
      ? fill(t("medsSupplyRounded"), {
          used: formatAmount(check.exact, true, locale),
        })
      : "";
  if (check.kind === "short") {
    return (
      <Badge variant="pending" className="h-auto min-h-9 whitespace-normal">
        <TriangleAlert aria-hidden />
        {fill(t("medsSupplyShort"), {
          short: words(check.short),
          need: formatDecimal(check.need, locale, 2),
        })}
      </Badge>
    );
  }
  if (check.kind === "enough") {
    return (
      <Badge variant="confirmed" className="h-auto min-h-9 whitespace-normal">
        <CircleCheck aria-hidden />
        {fill(t("medsSupplyEnough"), { need: words(check.need), rounded })}
      </Badge>
    );
  }
  return (
    <Badge variant="cancelled" className="h-auto min-h-9 whitespace-normal">
      <Info aria-hidden />
      {fill(t("medsSupplyNeeded"), { need: words(check.need), rounded })}
    </Badge>
  );
}

export function EditorSupply({
  step,
  petName,
}: {
  step: MedicationStepState;
  petName: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const draft = step.editor!.draft;
  const { show } = step.settings;
  if (!show.supply && !show.allergies && !show.notes && !show.saveToProfile) {
    return null;
  }

  return (
    <EditorSection label={t("medsSectionSupply")}>
      {show.supply ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel htmlFor="meds-supply">{t("medsSupplyLabel")}</FieldLabel>
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="border-line-strong bg-card has-focus-visible:border-primary flex min-h-10 items-center gap-2 rounded-full border px-4 max-lg:min-h-12">
              <input
                id="meds-supply"
                type="number"
                min={0}
                inputMode="decimal"
                value={draft.supply}
                placeholder={(() => {
                  const doses =
                    draftTimes(draft, step.settings).length *
                    draftDays(draft, step.stay).length;
                  const need = supplyCheck({
                    doses,
                    amount: draft.amount,
                    wholeUnits: DOSE[draft.form].fraction,
                    brought: null,
                  });
                  return need.kind === "unscheduled"
                    ? ""
                    : formatDecimal(need.need, locale, 2);
                })()}
                onChange={(event) =>
                  step.update({ supply: event.target.value })
                }
                className="text-body-ink text-body-strong w-16 [appearance:textfield] border-0 bg-transparent tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-body text-ink-tertiary">
                {unitWord(t, draft.unit, 2, locale, draft.customUnit)}
              </span>
            </div>
            <SupplyStatus step={step} t={t} locale={locale} />
          </div>
        </div>
      ) : null}

      {show.allergies ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel htmlFor="meds-allergy">
            {t("medsAllergiesLabel")}
          </FieldLabel>
          <AllergyInput
            id="meds-allergy"
            values={draft.allergies}
            onChange={(allergies) => step.update({ allergies })}
            placeholder={t("medsAllergyPlaceholder")}
            removeLabel={(name) => fill(t("medsRemoveAllergy"), { name })}
          />
        </div>
      ) : null}

      {show.notes ? (
        <div className="flex min-w-0 flex-col gap-2">
          <FieldLabel htmlFor="meds-notes">
            {t("medsNotesLabel")}{" "}
            <span className="text-ink-tertiary font-normal">
              {t("medsOptional")}
            </span>
          </FieldLabel>
          <Textarea
            id="meds-notes"
            rows={3}
            maxLength={1000}
            value={draft.notes}
            placeholder={fill(t("medsNotesPlaceholder"), { pet: petName })}
            onChange={(event) => step.update({ notes: event.target.value })}
          />
        </div>
      ) : null}

      {show.saveToProfile ? (
        <div className="border-line flex items-start gap-3 rounded-xl border px-4 py-3.5">
          <Checkbox
            id="meds-save-profile"
            checked={draft.saveToProfile}
            onCheckedChange={(on) =>
              step.update({ saveToProfile: on === true })
            }
            className="mt-0.5"
          />
          <label
            htmlFor="meds-save-profile"
            className="flex cursor-pointer flex-col gap-0.5"
          >
            <span className="text-body-strong text-body-ink">
              {t("medsSaveToProfile")}
            </span>
            <span className="text-meta text-ink-tertiary">
              {t("medsSaveToProfileHelp")}
            </span>
          </label>
        </div>
      ) : null}
    </EditorSection>
  );
}
