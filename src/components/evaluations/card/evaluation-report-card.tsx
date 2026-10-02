"use client";

import { Check, PawPrint } from "lucide-react";

import { CARD_THEME_STYLE } from "@/components/evaluations/card-themes";
import { EvaluationResultChip } from "@/components/evaluations/result-chip";
import { Badge } from "@/components/ui/badge";
import type { CardOptions } from "@/lib/evaluations/detail-types";
import {
  cardCta,
  type CardCta,
  cardExtras,
  cardHelpWith,
  cardMeters,
  cardStrengths,
  cardThingsToKnow,
  cardUnlocked,
  firstNameOf,
} from "@/lib/evaluations/report-card";
import type {
  Answers,
  CustomQuestion,
  EvaluationResult,
} from "@/lib/evaluations/questions";
import { formatWeekdayDate } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

import { CardSection } from "./card-section";

// ============================================================================
// The evaluation report card — the client's mock (2026-10-02), "built
// automatically from the answers". One component for the evaluator's live
// preview, the reviewer's and the owner's page, so what staff check is what
// the owner gets:
//
//   theme header   facility · EVALUATION REPORT CARD · headline · date ·
//                  "Buddy · Golden Retriever · for Alice Johnson"
//   photo          when Setup includes one and the evaluator took it
//   result chip    and "by Sarah J."
//   TEMPERAMENT    energy, confidence and calm, each on three segments
//   play style · play group
//   WHAT WE LOVED · WE'LL HELP WITH · MORE ABOUT THEM
//   NOTE FROM …    "Hi Alice, …"
//   NOW UNLOCKED   on a pass only
//   the one button the result calls for
//
// The look is Yipyy's: a solid theme header (white on a text-safe ink), no
// tint behind text, glyphs on every chip.
// ============================================================================

export interface ReportCardModel {
  facilityName: string;
  facilityLogoUrl: string | null;
  petName: string;
  petBreed: string | null;
  petSex: "male" | "female" | null;
  ownerName: string;
  evaluatorName: string;
  result: EvaluationResult | null;
  answers: Answers;
  strengths: readonly string[];
  watchFor: readonly string[];
  customQuestions: readonly Pick<
    CustomQuestion,
    "id" | "label" | "type" | "onCard"
  >[];
  ownerNote: string;
  internalNote: string;
  approvedServices: readonly string[];
  photoUrl: string | null;
  /** When it was finished (or now, while it is still being answered). */
  date: string;
  options: CardOptions;
}

function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return name.trim();
  return `${words[0]} ${words[words.length - 1]!.charAt(0)}.`;
}

function pronoun(sex: ReportCardModel["petSex"]): "m" | "f" | "x" {
  return sex === "male" ? "m" : sex === "female" ? "f" : "x";
}

export function EvaluationReportCard({
  card,
  serviceName,
  ctaHref,
}: {
  card: ReportCardModel;
  serviceName: (service: string) => string;
  /** Where the button at the foot goes; without it the button is drawn but
   *  inert, as in the evaluator's preview. */
  ctaHref?: (kind: CardCta) => string;
}) {
  const { t, fill, locale } = useStaffText("evaluations");
  const theme = CARD_THEME_STYLE[card.options.theme];
  const result = card.result;
  const pet = card.petName;
  const sex = pronoun(card.petSex);
  const key = result ?? "pending";
  // french-ok: a catalogue key built from an id
  const headline = fill(`cardHeadline_${key}_${sex}`, { pet });
  // french-ok: a catalogue key built from an id
  const subline = fill(`cardSubline_${key}_${sex}`, { pet });
  const meters = cardMeters(card.answers);
  const strengths = cardStrengths(card.strengths, card.answers);
  const helpWith = cardHelpWith(card.watchFor);
  const extras = cardExtras(
    card.customQuestions.map((q) => ({
      ...q,
      section: 0,
      options: [],
      required: false,
    })) as CustomQuestion[],
    card.answers,
  );
  const unlocked = cardUnlocked(result, card.approvedServices);
  const ctaKind = card.options.bookFirstVisitButton ? cardCta(result) : null;
  const things = cardThingsToKnow({
    hideInternal: card.options.hideInternal,
    watchFor: card.watchFor,
    internalNote: card.internalNote,
    answers: card.answers,
  });
  const evaluatorFirst = firstNameOf(card.evaluatorName);
  const ownerFirst = firstNameOf(card.ownerName);

  const extraValue = (kind: string, value: string) =>
    kind === "yn" || kind === "lmh" ? t(`answer_${value}`) : value;

  return (
    <article className="bg-ground flex min-w-0 flex-col gap-2.5">
      <header
        className={cn(
          "flex flex-col gap-2 rounded-b-3xl px-4 pt-4 pb-5 text-white",
          theme.fill,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {card.facilityLogoUrl ? (
            // A facility's own logo, from its own storage: a plain <img>, as
            // PetAvatar explains for any URL a facility supplied.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.facilityLogoUrl}
              alt=""
              className="bg-card size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="bg-card text-body-ink flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            >
              {card.facilityName
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w.charAt(0).toUpperCase())
                .join("")}
            </span>
          )}
          <span className="text-body-strong min-w-0 truncate">
            {card.facilityName}
          </span>
        </div>
        <p className="text-micro uppercase">{t("cardEyebrow")}</p>
        <h3 className="text-[22px] leading-tight font-bold text-balance">
          {headline}
        </h3>
        <p className="text-meta">
          {subline} · {formatWeekdayDate(card.date, locale)}
        </p>
        <p className="text-meta inline-flex min-w-0 items-center gap-1.5 font-semibold">
          <PawPrint className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">
            {fill("cardFor", {
              pet: [pet, card.petBreed].filter(Boolean).join(" · "),
              owner: card.ownerName,
            })}
          </span>
        </p>
      </header>

      {card.options.includePhoto && card.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.photoUrl}
          alt=""
          className="mx-3 aspect-4/3 w-[calc(100%-1.5rem)] rounded-2xl object-cover"
        />
      ) : null}

      <div className="bg-card mx-3 flex flex-wrap items-center gap-2 rounded-2xl px-3.5 py-3">
        {result ? (
          <EvaluationResultChip result={result} />
        ) : (
          <Badge variant="cancelled">{t("cardPending")}</Badge>
        )}
        {evaluatorFirst ? (
          <span className="text-meta text-ink-secondary">
            {fill("cardBy", { name: shortName(card.evaluatorName) })}
          </span>
        ) : null}
      </div>

      <CardSection title={t("cardTemperament")} ink={theme.ink}>
        <div className="flex flex-col gap-2.5">
          {meters.map((meter) => (
            <div key={meter.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-meta text-body-ink">
                  {t(`meter_${meter.key}`)}
                </span>
                <span className="text-meta text-body-ink font-semibold">
                  {/* french-ok: a catalogue key built from an id */}
                  {meter.value ? t(`meterValue_${meter.value}`) : "—"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1" aria-hidden>
                {[1, 2, 3].map((segment) => (
                  <span
                    key={segment}
                    className={cn(
                      "h-1.5 rounded-full",
                      segment <= meter.level ? theme.fill : "bg-line",
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardSection>

      <div className="bg-card mx-3 grid grid-cols-2 gap-3 rounded-2xl px-3.5 py-3">
        {(["play", "group"] as const).map((field) => (
          <div key={field} className="min-w-0">
            <p className="text-meta text-ink-secondary">
              {t(field === "play" ? "q_play" : "cardPlayGroup")}
            </p>
            <p className="text-body-strong text-body-ink">
              {card.answers[field] ? t(`${field}_${card.answers[field]}`) : "—"}
            </p>
          </div>
        ))}
      </div>

      {strengths.length > 0 ? (
        <CardSection title={t("cardLoved")} ink={theme.ink}>
          <div className="flex flex-wrap gap-1.5">
            {strengths.map((strength) => (
              <Badge key={strength.id} variant="cancelled">
                {t(`strength_${strength.id}`)}
              </Badge>
            ))}
          </div>
        </CardSection>
      ) : null}

      {helpWith.length > 0 ? (
        <CardSection title={t("cardHelpWith")} ink={theme.ink}>
          <ul className="text-body text-body-ink list-disc pl-5">
            {helpWith.map((id) => (
              <li key={id}>{t(`help_${id}`)}</li>
            ))}
          </ul>
        </CardSection>
      ) : null}

      {extras.length > 0 ? (
        <CardSection title={fill("cardMoreAbout", { pet })} ink={theme.ink}>
          <dl className="flex flex-col gap-1.5">
            {extras.map((extra) => (
              <div key={extra.id} className="flex min-w-0 flex-col">
                <dt className="text-meta text-ink-secondary">{extra.label}</dt>
                <dd className="text-body text-body-ink">
                  {extraValue(extra.kind, extra.value)}
                </dd>
              </div>
            ))}
          </dl>
        </CardSection>
      ) : null}

      <CardSection
        title={fill("cardNoteFrom", { name: evaluatorFirst || t("cardTeam") })}
        ink={theme.ink}
      >
        <p className="text-body text-body-ink text-pretty">
          {ownerFirst ? fill("cardHi", { name: ownerFirst }) : null}{" "}
          {card.ownerNote.trim() || t("cardNotePlaceholder")}
        </p>
      </CardSection>

      {things ? (
        <CardSection title={t("cardThingsToKnow")} ink={theme.ink}>
          <div className="flex flex-col gap-1.5">
            {things.tags.length > 0 || things.guarding ? (
              <div className="flex flex-wrap gap-1.5">
                {things.tags.map((tag) => (
                  <Badge key={tag} variant="cancelled">
                    {t(`watch_${tag}`)}
                  </Badge>
                ))}
                {things.guarding && !things.tags.includes("guarder") ? (
                  <Badge variant="cancelled">{t("cardGuarding")}</Badge>
                ) : null}
              </div>
            ) : null}
            {things.note ? (
              <p className="text-body text-body-ink">{things.note}</p>
            ) : null}
          </div>
        </CardSection>
      ) : null}

      {unlocked.length > 0 ? (
        <CardSection title={t("cardUnlocked")} ink={theme.ink}>
          <div className="flex flex-wrap gap-1.5">
            {unlocked.map((service) => (
              <Badge key={service} variant="confirmed">
                <Check aria-hidden />
                {serviceName(service)}
              </Badge>
            ))}
          </div>
        </CardSection>
      ) : null}

      {ctaKind ? (
        ctaHref ? (
          <a
            href={ctaHref(ctaKind)}
            className={cn(
              "text-body-strong mx-3 mb-3 flex min-h-12 items-center justify-center rounded-full px-5 text-center text-white",
              theme.fill,
            )}
          >
            {/* french-ok: a catalogue key built from an id */}
            {fill(`cardCta_${ctaKind}`, { pet })}
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={cn(
              "text-body-strong mx-3 mb-3 flex min-h-12 items-center justify-center rounded-full px-5 text-center text-white disabled:cursor-default",
              theme.fill,
            )}
          >
            {/* french-ok: a catalogue key built from an id */}
            {fill(`cardCta_${ctaKind}`, { pet })}
          </button>
        )
      ) : null}
    </article>
  );
}
