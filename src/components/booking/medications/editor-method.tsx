"use client";

import { CircleCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoicePill } from "@/components/ui/choice-pill";
import { formatMoney } from "@/lib/i18n/format";
import { dayCount, itemWord, methodLabel } from "@/lib/medications/describe";
import { fill, round2 } from "@/lib/medications/dose";
import { draftDays, draftTimes } from "@/lib/medications/draft";
import {
  asksForSide,
  METHODS_BY_FORM,
  type MedMethod,
} from "@/lib/medications/vocabulary";
import { providedFor } from "@/lib/settings/medication-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { MedSide } from "@/types/base";

import {
  EditorSection,
  FieldLabel,
} from "@/components/booking/care/editor-section";
import { OptionCards } from "@/components/booking/care/option-cards";
import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// HOW IT'S GIVEN: the ways that suit the form, which side for drops, and —
// where the facility supplies what it is given with — who supplies it, what
// that adds to the booking, and staff's waiver.
// ============================================================================

const SIDES: MedSide[] = ["left", "right", "both"];
const SIDE_KEY: Record<MedSide, string> = {
  left: "medsSideLeft",
  right: "medsSideRight",
  both: "medsSideBoth",
};

export function EditorMethod({ step }: { step: MedicationStepState }) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const draft = step.editor!.draft;
  const { settings, stay, staff } = step;

  const methods: MedMethod[] = METHODS_BY_FORM[draft.form].filter(
    (method) => settings.methods.includes(method) || method === draft.method,
  );
  if (methods.length === 0) return null;

  const supplied = providedFor(settings, draft.method || undefined);
  const perDay = draftTimes(draft, settings).length;
  const days = draftDays(draft, stay).length;
  const quantity = supplied
    ? supplied.per === "day"
      ? days
      : days * perDay
    : 0;
  const price = supplied ? formatMoney(supplied.price, locale) : "";
  const total = supplied ? round2(quantity * supplied.price) : 0;

  return (
    <EditorSection label={t("medsSectionGiven")}>
      <div
        role="radiogroup"
        aria-label={t("medsSectionGiven")}
        className="flex flex-wrap gap-2"
      >
        {methods.map((method) => {
          const canProvide = providedFor(settings, method) !== undefined;
          return (
            <ChoicePill
              key={method}
              type="radio"
              name="meds-method"
              value={method}
              checked={draft.method === method}
              onChange={() => step.update({ method })}
              className={canProvide ? "pr-2" : undefined}
            >
              <span>{methodLabel(t, method)}</span>
              {canProvide ? (
                <Badge variant="confirmed">
                  <CircleCheck aria-hidden />
                  {t("medsFacilityCanProvide")}
                </Badge>
              ) : null}
            </ChoicePill>
          );
        })}
      </div>

      {asksForSide(draft.method) ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <FieldLabel id="meds-side-label">{t("medsWhichSide")}</FieldLabel>
          <div
            role="radiogroup"
            aria-labelledby="meds-side-label"
            className="flex flex-wrap gap-2"
          >
            {SIDES.map((side) => (
              <ChoicePill
                key={side}
                type="radio"
                name="meds-side"
                value={side}
                checked={draft.side === side}
                onChange={() => step.update({ side })}
              >
                {t(SIDE_KEY[side])}
              </ChoicePill>
            ))}
          </div>
        </div>
      ) : null}

      {supplied ? (
        <div className="border-line flex flex-col gap-3.5 rounded-xl border p-4">
          <p className="text-body-strong text-body-ink">
            {fill(t("medsWhoSupplies"), {
              items: itemWord(t, supplied.method, 2, locale),
            })}
          </p>
          <OptionCards
            label={fill(t("medsWhoSupplies"), {
              items: itemWord(t, supplied.method, 2, locale),
            })}
            value={draft.source}
            columns="sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]"
            options={[
              {
                value: "own",
                title: t("medsBringOwn"),
                hint: t("medsNoCharge"),
              },
              {
                value: "facility",
                title: t("medsFacilityProvides"),
                hint: fill(
                  t(
                    supplied.per === "day"
                      ? "medsPricePerDayLong"
                      : "medsPricePerDoseLong",
                  ),
                  { price },
                ),
                trailing: fill(
                  t(
                    supplied.per === "day"
                      ? "medsPricePerDayShort"
                      : "medsPricePerDoseShort",
                  ),
                  { price },
                ),
              },
            ]}
            onChange={(source) => step.update({ source })}
          />
          {draft.source === "facility" ? (
            <div className="border-line bg-card flex flex-col gap-2.5 rounded-xl border px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body-strong text-body-ink">
                    {fill(t("medsItemCount"), {
                      count: quantity,
                      items: itemWord(t, supplied.method, quantity, locale),
                    })}
                  </span>
                  <span className="text-meta text-ink-tertiary">
                    {supplied.per === "day"
                      ? fill(t("medsCalcPerDay"), {
                          days: dayCount(t, days, locale),
                          price,
                        })
                      : fill(t("medsCalcPerDose"), {
                          days: dayCount(t, days, locale),
                          perDay,
                          price,
                        })}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    data-waived={draft.waived}
                    className="text-body-ink text-section data-[waived=true]:text-ink-tertiary tabular-nums data-[waived=true]:line-through"
                  >
                    {formatMoney(total, locale)}
                  </span>
                  <span className="text-meta text-ink-tertiary">
                    {draft.waived
                      ? t("medsWaivedByStaff")
                      : t("medsAddedToBooking")}
                  </span>
                </div>
              </div>
              <p className="text-meta text-success flex items-center gap-2">
                <span
                  aria-hidden
                  className="bg-success-dot size-[7px] shrink-0 rounded-full"
                />
                {t("medsQuantityUpdates")}
              </p>
              {staff ? (
                <div className="border-line flex items-center gap-2.5 border-t pt-2.5">
                  <Checkbox
                    id="meds-waive"
                    checked={draft.waived}
                    onCheckedChange={(on) =>
                      step.update({ waived: on === true })
                    }
                  />
                  <label
                    htmlFor="meds-waive"
                    className="text-body text-ink-secondary cursor-pointer"
                  >
                    {t("medsWaiveLabel")}
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </EditorSection>
  );
}
