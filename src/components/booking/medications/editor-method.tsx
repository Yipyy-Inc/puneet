"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { ChoicePill } from "@/components/ui/choice-pill";
import { formatMoney } from "@/lib/i18n/format";
import { dayCount, itemWord, methodName } from "@/lib/medications/describe";
import { fill, round2 } from "@/lib/medications/dose";
import { draftDays, draftTimes } from "@/lib/medications/draft";
import { asksForSide, METHODS_BY_FORM } from "@/lib/medications/vocabulary";
import {
  isCustomMethod,
  methodRow,
  providedFor,
} from "@/lib/settings/medication-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { MedSide } from "@/types/base";

import {
  EditorSection,
  FieldLabel,
} from "@/components/booking/care/editor-section";
import { OptionCards } from "@/components/booking/care/option-cards";
import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// HOW IT'S GIVEN: the ways that suit the form — and the facility's own, which
// suit every form — which side for drops, and, where the facility sells what
// it is given with, who supplies it, what that adds to the booking, and
// staff's waiver.
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

  const own = settings.methods.filter(
    (row) => row.on && isCustomMethod(row.id),
  );
  const methods: { id: string; label: string }[] = [
    ...METHODS_BY_FORM[draft.form]
      .filter(
        (id) => methodRow(settings, id)?.on === true || id === draft.method,
      )
      .map((id) => ({ id, label: methodName(t, id) })),
    ...own.map((row) => ({
      id: row.id,
      label: methodName(t, row.id, row.label),
    })),
  ];
  // One the facility has since switched off or deleted stays while picked.
  if (
    isCustomMethod(draft.method) &&
    !methods.some((method) => method.id === draft.method)
  ) {
    methods.push({
      id: draft.method,
      label: methodName(t, draft.method, draft.methodLabel),
    });
  }
  if (methods.length === 0) return null;

  const supplied = providedFor(settings, draft.method || undefined);
  const items = (count: number) =>
    supplied ? itemWord(t, supplied.id, count, locale, supplied.label) : "";
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
          const canProvide = providedFor(settings, method.id) !== undefined;
          return (
            <ChoicePill
              key={method.id}
              type="radio"
              name="meds-method"
              value={method.id}
              checked={draft.method === method.id}
              onChange={() =>
                step.update({
                  method: method.id,
                  methodLabel: isCustomMethod(method.id) ? method.label : "",
                })
              }
              className={canProvide ? "pr-2" : undefined}
            >
              <span>{method.label}</span>
              {canProvide ? (
                <span className="bg-wash-success text-success rounded-full px-2 py-[3px] text-[12px] font-semibold whitespace-nowrap">
                  {t("medsFacilityCanProvide")}
                </span>
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
        <div className="border-line bg-surface-inset flex flex-col gap-3.5 rounded-[16px] border p-[18px]">
          <p className="text-body-ink text-[15px] font-semibold">
            {fill(t("medsWhoSupplies"), { items: items(2) })}
          </p>
          <OptionCards
            label={fill(t("medsWhoSupplies"), { items: items(2) })}
            value={draft.source}
            columns="sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
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
            <div className="border-line bg-card flex flex-col gap-2.5 rounded-[12px] border px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body-ink text-[15px] font-semibold">
                    {fill(t("medsItemCount"), {
                      count: quantity,
                      items: items(quantity),
                    })}
                  </span>
                  <span className="text-ink-tertiary text-[13px]">
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
                    className="text-body-ink data-[waived=true]:text-ink-disabled text-[20px] font-bold tabular-nums data-[waived=true]:line-through"
                  >
                    {formatMoney(total, locale)}
                  </span>
                  <span className="text-ink-tertiary text-[12px]">
                    {draft.waived
                      ? t("medsWaivedByStaff")
                      : t("medsAddedToBooking")}
                  </span>
                </div>
              </div>
              <p className="text-success flex items-center gap-1.5 text-[13px]">
                <span
                  aria-hidden
                  className="bg-success size-1.5 shrink-0 rounded-full"
                />
                {t("medsQuantityUpdates")}
              </p>
              {staff ? (
                <div className="flex items-center gap-2.5 border-t border-(--row-line) pt-2">
                  <Checkbox
                    id="meds-waive"
                    checked={draft.waived}
                    onCheckedChange={(on) =>
                      step.update({ waived: on === true })
                    }
                  />
                  <label
                    htmlFor="meds-waive"
                    className="text-ink-secondary cursor-pointer text-[14px]"
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
