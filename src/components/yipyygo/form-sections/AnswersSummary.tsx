"use client";

import type { ReactNode } from "react";

import {
  formatDateLong,
  formatList,
  formatNumber,
  formatTimeOfDay,
} from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import {
  ANXIETY_TRIGGER_KEYS,
  BELONGING_KEYS,
  ENERGY_LEVEL_KEYS,
  FOOD_TYPE_KEYS,
  FOOD_UNIT_KEYS,
  MED_FREQUENCY_KEYS,
  WITH_DOGS_KEYS,
  WITH_PEOPLE_KEYS,
  answerLabel,
} from "@/lib/yipyy-go/answer-labels";
import {
  calendarDay,
  type YipyyGoCustomAnswer,
  type YipyyGoCustomAnswers,
} from "@/lib/yipyy-go/owner-form";
import type {
  CustomQuestion,
  FeedingInstruction,
  YipyyGoSectionFormData,
} from "@/types/yipyygo";

// ============================================================================
// What one pet's form says — read by the owner before sending it, and read
// back once it has closed.
//
// No money. What a form puts on the bill is the server's to say
// (yipyy_go_charges); the review this replaces added invented add-on prices
// and a tip to the stay in the browser and called the sum a total.
// ============================================================================

interface AnswersSummaryProps {
  formData: YipyyGoSectionFormData;
  questions: CustomQuestion[];
  customAnswers: YipyyGoCustomAnswers;
  /** The care steps this form has. One it does not have is not summarised. */
  show: { feeding: boolean; medications: boolean; behavior: boolean };
}

export function AnswersSummary({
  formData,
  questions,
  customAnswers,
  show,
}: AnswersSummaryProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const behavior = formData.behaviorNotes;
  const feeding = formData.feedingInstructions;
  const answered = questions.filter(
    (question) => customAnswers[question.id] !== undefined,
  );

  return (
    <dl className="divide-line divide-y">
      <Group label={t("belongings")}>
        {formData.belongings.length > 0 ? (
          <ul className="space-y-1">
            {formData.belongings.map((item) => (
              <li key={item.id}>
                {[answerLabel(BELONGING_KEYS, item.type, t), item.notes]
                  .filter(Boolean)
                  .join(" · ")}
                {item.quantity
                  ? ` × ${formatNumber(item.quantity, locale)}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-tertiary">{t("noBelongingsListed")}</p>
        )}
        {formData.belongingsPhotoId && <p>{t("photoAttached")}</p>}
      </Group>

      {show.feeding && feeding && (
        <Group label={t("feedingInstructions")}>
          <FeedingLines feeding={feeding} locale={locale} t={t} />
        </Group>
      )}

      {show.medications && (
        <Group label={t("medications")}>
          {formData.noMedications || formData.medications.length === 0 ? (
            <p>{t("noMedications")}</p>
          ) : (
            <ul className="space-y-1">
              {formData.medications.map((med) => (
                <li key={med.id}>
                  {[
                    med.name,
                    med.dosage,
                    med.frequency
                      ? answerLabel(MED_FREQUENCY_KEYS, med.frequency, t)
                      : "",
                    med.photoId ? t("photoAttached") : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </li>
              ))}
            </ul>
          )}
        </Group>
      )}

      {show.behavior && behavior && (
        <Group label={t("behaviorNotes")}>
          <p>
            {t("behaviorSummary")
              .replace("{energy}", () =>
                answerLabel(ENERGY_LEVEL_KEYS, behavior.energyLevel, t),
              )
              .replace("{dogs}", () =>
                answerLabel(WITH_DOGS_KEYS, behavior.socialization.withDogs, t),
              )
              .replace("{humans}", () =>
                answerLabel(
                  WITH_PEOPLE_KEYS,
                  behavior.socialization.withHumans,
                  t,
                ),
              )}
          </p>
          {(behavior.anxietyTriggers?.length ?? 0) > 0 && (
            <p>
              {t("triggersSummary").replace("{triggers}", () =>
                formatList(
                  (behavior.anxietyTriggers ?? []).map((value) =>
                    answerLabel(ANXIETY_TRIGGER_KEYS, value, t),
                  ),
                  locale,
                ),
              )}
            </p>
          )}
          {behavior.specialNotes?.trim() && (
            <p className="whitespace-pre-line">{behavior.specialNotes}</p>
          )}
        </Group>
      )}

      {answered.length > 0 && (
        <Group label={t("moreQuestions")}>
          <dl className="space-y-2">
            {answered.map((question) => (
              <div key={question.id}>
                <dt className="text-ink-secondary text-[13.5px]">
                  {question.label}
                </dt>
                <dd className="whitespace-pre-line">
                  {customAnswerText(
                    question,
                    customAnswers[question.id],
                    locale,
                    t,
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Group>
      )}
    </dl>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <dt className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
        {label}
      </dt>
      <dd className="text-body-ink space-y-1 text-[14.5px]">{children}</dd>
    </div>
  );
}

function FeedingLines({
  feeding,
  locale,
  t,
}: {
  feeding: FeedingInstruction;
  locale: AppLocale;
  t: (key: string) => string;
}) {
  const occasions = feeding.occasions ?? [];
  if (occasions.length === 0) {
    const portion = [
      feeding.portionSize,
      feeding.portionUnit
        ? answerLabel(FOOD_UNIT_KEYS, feeding.portionUnit, t)
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <p>
        {[
          feeding.foodType
            ? answerLabel(FOOD_TYPE_KEYS, feeding.foodType, t)
            : "",
          portion,
        ]
          .filter(Boolean)
          .join(" · ") || "—"}
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {occasions.map((occasion) => {
        const food = formatList(
          occasion.components.map((component) => {
            const what =
              component.name?.trim() ||
              answerLabel(FOOD_TYPE_KEYS, component.type, t);
            const unit = answerLabel(FOOD_UNIT_KEYS, component.unit, t);
            return `${what} (${component.amount} ${unit})`;
          }),
          locale,
        );
        return (
          <li key={occasion.id}>
            {[occasion.label, formatTimeOfDay(occasion.time, locale), food]
              .filter(Boolean)
              .join(" · ")}
          </li>
        );
      })}
    </ul>
  );
}

function customAnswerText(
  question: CustomQuestion,
  value: YipyyGoCustomAnswer | undefined,
  locale: AppLocale,
  t: (key: string) => string,
): string {
  const optionLabel = (option: string) =>
    question.options?.find((candidate) => candidate.value === option)?.label ??
    option;
  if (typeof value === "boolean") return value ? t("answerYes") : t("answerNo");
  if (typeof value === "number")
    return formatNumber(value, locale, Number.isInteger(value) ? 0 : 2);
  if (Array.isArray(value)) return formatList(value.map(optionLabel), locale);
  if (typeof value !== "string") return "";
  // A photo question keeps the photo’s id, which means nothing to read.
  if (question.type === "file_upload") return t("photoAttached");
  if (question.type === "date")
    return formatDateLong(calendarDay(value), locale);
  if (question.type === "dropdown") return optionLabel(value);
  return value;
}
