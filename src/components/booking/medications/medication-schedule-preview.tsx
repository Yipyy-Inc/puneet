"use client";

import {
  formatDayRange,
  formatMoney,
  formatStayDay,
  formatTimeOfDay,
  isPluralOne,
} from "@/lib/i18n/format";
import { dayCount, itemWord } from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import { hasCheckoutDay } from "@/lib/medications/schedule";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { cn } from "@/lib/utils";

import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// The stay and its doses, for the pet being looked at: a row per day with its
// doses by time, the total, and what the facility supplies. The client's
// design puts it beside the editor; Yipyy puts it in the booking form's LEFT
// rail, under the steps, and below the editor where there is no rail (below
// 1024px).
// ============================================================================

export function MedicationSchedulePreview({
  step,
  className,
}: {
  step: MedicationStepState;
  className?: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const { stay, panel } = step;
  if (!step.ready || stay.days.length === 0 || !panel.petName) return null;

  const first = stay.days[0];
  const last = stay.days[stay.days.length - 1];
  const overnight = hasCheckoutDay(stay);
  const nights = stay.days.length - 1;
  const length = overnight
    ? fill(
        t(isPluralOne(nights, locale) ? "medsNightsOne" : "medsNightsOther"),
        { count: nights },
      )
    : dayCount(t, stay.days.length, locale);
  const service =
    step.service === "boarding"
      ? t("medsServiceBoarding")
      : step.service === "daycare"
        ? t("medsServiceDaycare")
        : "";

  return (
    <section
      aria-label={fill(t("medsPanelLabel"), { pet: panel.petName })}
      className={cn(
        "border-line bg-card flex flex-col gap-4 rounded-xl border p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-meta text-ink-tertiary">
          {service
            ? fill(t("medsPanelHeading"), { service, pet: panel.petName })
            : panel.petName}
        </span>
        <span className="text-body-strong text-body-ink">
          {fill(t("medsPanelRange"), {
            range: formatDayRange(first, last, locale),
            length,
          })}
        </span>
      </div>

      <ol className="flex flex-col">
        {panel.rows.map((row) => (
          <li
            key={row.day}
            className="border-line grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-t py-2.5"
          >
            <div className="flex flex-col">
              <span className="text-meta text-body-ink font-semibold">
                {formatStayDay(row.day, locale)}
              </span>
              {row.tag ? (
                <span className="text-micro text-ink-tertiary whitespace-nowrap uppercase">
                  {t(
                    row.tag === "check_in"
                      ? "medsTagCheckIn"
                      : "medsTagCheckout",
                  )}
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              {row.doses.length > 0 ? (
                row.doses.map((dose, index) => (
                  <div
                    key={`${dose.time}-${index}`}
                    className="text-meta flex gap-2"
                  >
                    <span className="text-body-ink min-w-17 font-semibold tabular-nums">
                      {formatTimeOfDay(dose.time, locale)}
                    </span>
                    <span className="text-ink-secondary truncate">
                      {dose.name}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-meta text-ink-tertiary">
                  {t("medsNoDoses")}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      <dl className="border-line flex flex-col gap-2 border-t pt-3">
        <div className="text-meta flex justify-between gap-2">
          <dt className="text-ink-tertiary">{t("medsTotalDoses")}</dt>
          <dd className="text-body-ink font-semibold tabular-nums">
            {panel.totalDoses}
          </dd>
        </div>
        {panel.addons.map((addon) => (
          <div key={addon.key} className="text-meta flex justify-between gap-2">
            <dt className="text-ink-tertiary min-w-0">
              {fill(t("medsAddonRow"), {
                count: addon.quantity,
                items: itemWord(t, addon.method, addon.quantity, locale),
                name: addon.medication,
              })}
            </dt>
            <dd className="text-body-ink shrink-0 font-semibold tabular-nums">
              {addon.waived
                ? t("medsWaived")
                : formatMoney(addon.amount, locale)}
            </dd>
          </div>
        ))}
        <div className="border-line-strong text-body flex justify-between gap-2 border-t border-dashed pt-2">
          <dt className="text-body-ink font-medium">{t("medsAddonsTotal")}</dt>
          <dd className="text-body-ink font-bold tabular-nums">
            {formatMoney(panel.addonTotal, locale)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
