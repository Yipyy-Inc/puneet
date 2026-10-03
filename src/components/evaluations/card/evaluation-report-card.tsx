"use client";

import { PawPrint } from "lucide-react";

import { CARD_THEME_STYLE } from "@/components/evaluations/card-themes";
import { EvaluationResultChip } from "@/components/evaluations/result-chip";
import { LookScope } from "@/components/look/look-context";
import { Chip } from "@/components/ui/chip";
import { Photo } from "@/components/ui/photo";
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
    <LookScope name="eval-module">
      <article className="bg-ground flex min-w-0 flex-col">
        <header
          className={cn(
            // The mock's header: the theme's colour under a dotted texture, a
            // tail the first card overlaps.
            "flex flex-col bg-[radial-gradient(rgba(255,255,255,0.18)_1.5px,transparent_1.6px)] bg-size-[16px_16px] px-[18px] pt-5 pb-[54px] text-white",
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
                className="bg-card size-[26px] shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="bg-card text-body-ink flex size-[26px] shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold"
              >
                {card.facilityName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase())
                  .join("")}
              </span>
            )}
            <span className="min-w-0 truncate text-[13px] font-bold">
              {card.facilityName}
            </span>
          </div>
          <p className="mt-3.5 text-[11px] font-bold tracking-widest uppercase opacity-85">
            {t("cardEyebrow")}
          </p>
          <h3 className="mt-1 text-[23px] leading-[1.15] font-extrabold text-balance">
            {headline}
          </h3>
          <p className="mt-1 text-[13px] opacity-85">
            {subline} · {formatWeekdayDate(card.date, locale)}
          </p>
          <p className="mt-2.5 inline-flex max-w-full min-w-0 items-center gap-1.5 self-start rounded-full bg-white/18 px-2.5 py-[5px] text-[12px] font-bold">
            <PawPrint className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
              {fill("cardFor", {
                pet: [pet, card.petBreed].filter(Boolean).join(" · "),
                owner: card.ownerName,
              })}
            </span>
          </p>
        </header>

        <div className="relative -mt-10 flex flex-col gap-2.5 px-3 pb-4">
          {card.options.includePhoto ? (
            // The photo, or — none yet — the mock's warm stripes in its place.
            <Photo
              src={card.photoUrl}
              shape="band"
              tone="warm"
              label={t("cardPhotoSlot")}
              className="h-[150px] rounded-[18px] border-[5px] border-white"
            />
          ) : null}

          <div className="bg-card flex flex-wrap items-center gap-2 rounded-[16px] px-3.5 py-3">
            {result ? (
              <EvaluationResultChip result={result} />
            ) : (
              <Chip tone="neutral" size="sm" className="px-2.5 py-1 font-bold">
                {t("cardPending")}
              </Chip>
            )}
            {evaluatorFirst ? (
              <span className="text-ink-tertiary text-[12px]">
                {fill("cardBy", { name: shortName(card.evaluatorName) })}
              </span>
            ) : null}
          </div>

          <CardSection title={t("cardTemperament")} ink={theme.ink}>
            <div className="flex flex-col gap-2.5">
              {meters.map((meter) => (
                <div key={meter.key} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-ink-secondary text-[12.5px]">
                      {t(`meter_${meter.key}`)}
                    </span>
                    <span className="text-body-ink text-[12.5px] font-bold">
                      {/* french-ok: a catalogue key built from an id */}
                      {meter.value ? t(`meterValue_${meter.value}`) : "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1" aria-hidden>
                    {[1, 2, 3].map((segment) => (
                      <span
                        key={segment}
                        className={cn(
                          "h-[7px] rounded-full",
                          segment <= meter.level
                            ? theme.fill
                            : "bg-surface-inset-2",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardSection>

          <div className="bg-card grid grid-cols-2 gap-2 rounded-[16px] px-3.5 py-3">
            {(["play", "group"] as const).map((field) => (
              <div key={field} className="min-w-0">
                <p className="text-ink-tertiary text-[11px]">
                  {t(field === "play" ? "q_play" : "cardPlayGroup")}
                </p>
                <p className="text-body-ink text-[13.5px] font-bold">
                  {card.answers[field]
                    ? t(`${field}_${card.answers[field]}`)
                    : "—"}
                </p>
              </div>
            ))}
          </div>

          {strengths.length > 0 ? (
            <CardSection title={t("cardLoved")} ink={theme.ink}>
              <div className="flex flex-wrap gap-1.5">
                {strengths.map((strength) => (
                  <Chip
                    key={strength.id}
                    tone="neutral"
                    size="sm"
                    className="text-body-ink px-2.5 py-1"
                  >
                    {t(`strength_${strength.id}`)}
                  </Chip>
                ))}
              </div>
            </CardSection>
          ) : null}

          {helpWith.length > 0 ? (
            <CardSection title={t("cardHelpWith")} ink={theme.ink}>
              <ul className="text-body-ink list-disc pl-5 text-[13px]">
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
                    <dt className="text-ink-secondary text-[12.5px]">
                      {extra.label}
                    </dt>
                    <dd className="text-body-ink text-[12.5px] font-bold">
                      {extraValue(extra.kind, extra.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardSection>
          ) : null}

          <CardSection
            title={fill("cardNoteFrom", {
              name: evaluatorFirst || t("cardTeam"),
            })}
            ink={theme.ink}
          >
            <p className="text-body-ink text-[13px] leading-normal text-pretty">
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
                      <Chip
                        key={tag}
                        tone="neutral"
                        size="sm"
                        className="text-body-ink px-2.5 py-1"
                      >
                        {t(`watch_${tag}`)}
                      </Chip>
                    ))}
                    {things.guarding && !things.tags.includes("guarder") ? (
                      <Chip
                        tone="neutral"
                        size="sm"
                        className="text-body-ink px-2.5 py-1"
                      >
                        {t("cardGuarding")}
                      </Chip>
                    ) : null}
                  </div>
                ) : null}
                {things.note ? (
                  <p className="text-body-ink text-[13px]">{things.note}</p>
                ) : null}
              </div>
            </CardSection>
          ) : null}

          {unlocked.length > 0 ? (
            <CardSection title={t("cardUnlocked")} ink={theme.ink}>
              <div className="flex flex-wrap gap-1.5">
                {unlocked.map((service) => (
                  <Chip
                    key={service}
                    tone="success"
                    size="sm"
                    className="px-2.5 py-1 font-bold"
                  >
                    {serviceName(service)}
                  </Chip>
                ))}
              </div>
            </CardSection>
          ) : null}

          {ctaKind ? (
            ctaHref ? (
              <a
                href={ctaHref(ctaKind)}
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-full px-5 text-center text-[15px] font-bold text-white",
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
                  "flex min-h-12 items-center justify-center rounded-full px-5 text-center text-[15px] font-bold text-white disabled:cursor-default",
                  theme.fill,
                )}
              >
                {/* french-ok: a catalogue key built from an id */}
                {fill(`cardCta_${ctaKind}`, { pet })}
              </button>
            )
          ) : null}
        </div>
      </article>
    </LookScope>
  );
}
