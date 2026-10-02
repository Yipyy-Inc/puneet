"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  ListChecks,
  NotebookPen,
  Send,
  Split,
  Tag,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CARD_THEME_STYLE } from "@/components/evaluations/card-themes";
import { RadioCards } from "@/components/evaluations/radio-cards";
import { SwitchRow } from "@/components/evaluations/switch-row";
import { useEvaluationCardSettings } from "@/components/evaluations/use-evaluation-card-settings";
import { Playgroup } from "@/components/icons/yipyy-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DELIVERY_MODES,
  REVIEWER_ROLES,
  type DeliveryMode,
} from "@/lib/evaluations/delivery";
import { CARD_THEMES } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";
import type { EvaluationReportCardConfig } from "@/types/facility";

const QuestionsDialog = dynamic(() =>
  import("./questions-dialog").then((m) => m.QuestionsDialog),
);

// ============================================================================
// Setup — the client's mock (2026-10-02): how a finished card reaches the
// owner, who may review it, what it shows; which part of the card each step
// of the form writes, and the facility's own questions; the card's theme.
// Each change saves at once and says so only once the server has it.
// ============================================================================

const MODE_GLYPH: Record<DeliveryMode, LucideIcon> = {
  review: ListChecks,
  auto: Zap,
  autoPass: Split,
};

const FORM_MAP: Array<{ key: string; glyph: typeof Heart | typeof Playgroup }> =
  [
    { key: "temperament", glyph: Heart },
    { key: "play", glyph: Playgroup },
    { key: "behavior", glyph: Tag },
    { key: "notes", glyph: NotebookPen },
    { key: "result", glyph: BadgeCheck },
  ];

export function SetupTab({ mayChange }: { mayChange: boolean }) {
  const { t, fill } = useStaffText("evaluations");
  const settings = useEvaluationCardSettings();
  const [questionsOpen, setQuestionsOpen] = useState(false);

  if (settings.isPending) {
    return (
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-[620px] min-w-0 flex-[1_1_420px] rounded-3xl" />
        <Skeleton className="h-[420px] min-w-0 flex-[1_1_420px] rounded-3xl" />
      </div>
    );
  }

  const { card } = settings;
  const disabled = !mayChange || settings.saving;
  const change = (patch: Partial<EvaluationReportCardConfig>) =>
    settings
      .saveCard(patch)
      .then(() => toast.success(t("setupSaved")))
      .catch((error: unknown) =>
        toast.error(t("setupNotSaved"), {
          description: error instanceof Error ? error.message : undefined,
        }),
      );

  return (
    <div className="flex flex-wrap items-start gap-4">
      <section className="bg-card border-line flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-3xl border p-5">
        <header className="flex items-start gap-3">
          <Send className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <h2 id="ev-delivery" className="text-section text-heading">
              {t("deliveryTitle")}
            </h2>
            <p className="text-meta text-ink-secondary">{t("deliveryHelp")}</p>
          </div>
        </header>

        <RadioCards
          labelledBy="ev-delivery"
          value={card.deliveryMode}
          className="grid-cols-1"
          options={DELIVERY_MODES.map((mode) => ({
            value: mode,
            title: t(`mode_${mode}`),
            help: t(`mode_${mode}_help`),
            glyph: MODE_GLYPH[mode],
          }))}
          onChange={(mode) => {
            if (!disabled && mode !== card.deliveryMode) {
              void change({ deliveryMode: mode });
            }
          }}
        />

        {card.deliveryMode !== "auto" ? (
          <fieldset className="flex flex-col gap-2" disabled={disabled}>
            <legend className="text-body-strong text-body-ink mb-2">
              {t("whoReviews")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {REVIEWER_ROLES.map((role) => (
                <ChoicePill
                  key={role}
                  type="checkbox"
                  checked={card.reviewerRoles.includes(role)}
                  disabled={disabled}
                  onChange={() =>
                    void change({
                      reviewerRoles: card.reviewerRoles.includes(role)
                        ? card.reviewerRoles.filter((r) => r !== role)
                        : [...card.reviewerRoles, role],
                    })
                  }
                >
                  {t(`role_${role}`)}
                </ChoicePill>
              ))}
              <ChoicePill
                type="checkbox"
                checked={card.evaluatorSelfSend}
                disabled={disabled}
                onChange={() =>
                  void change({ evaluatorSelfSend: !card.evaluatorSelfSend })
                }
              >
                {t("selfSend")}
              </ChoicePill>
            </div>
            <p className="text-meta text-ink-tertiary">{t("reviewersNote")}</p>
          </fieldset>
        ) : null}

        <div className="divide-line border-line flex flex-col divide-y border-t">
          {(
            [
              ["includePhoto", "photo"],
              ["bookFirstVisitButton", "book"],
              ["hideInternal", "internal"],
            ] as const
          ).map(([key, copy]) => (
            <div key={key} className="py-3">
              <SwitchRow
                id={`ev-setup-${key}`}
                label={t(`switch_${copy}`)}
                help={t(`switch_${copy}_help`)}
                checked={card[key]}
                disabled={disabled}
                onChange={(checked) => void change({ [key]: checked })}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
        <section className="bg-card border-line flex min-w-0 flex-col rounded-3xl border">
          <header className="border-line flex flex-wrap items-center gap-3 border-b p-5">
            {/* A basis, so a long French button wraps under the title
                rather than squeezing it to a column. */}
            <div className="min-w-0 flex-[1_1_14rem]">
              <h2 className="text-section text-heading">{t("formTitle")}</h2>
              <p className="text-meta text-ink-secondary">{t("formHelp")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!mayChange}
              onClick={() => setQuestionsOpen(true)}
            >
              {fill("editQuestions", {
                count: settings.customQuestions.length,
              })}
            </Button>
          </header>
          <ul className="divide-line divide-y">
            {FORM_MAP.map(({ key, glyph: Glyph }) => (
              <li
                key={key}
                className="flex min-w-0 flex-wrap items-center gap-3 px-5 py-3"
              >
                <Glyph
                  className="text-ink-secondary size-5 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-strong text-body-ink">
                    {t(`form_${key}`)}
                  </p>
                  <p className="text-meta text-ink-secondary">
                    {t(`form_${key}_asks`)}
                  </p>
                </div>
                <ArrowRight
                  className="text-ink-disabled size-4 shrink-0"
                  aria-hidden
                />
                <Badge variant="cancelled" className="h-auto min-h-[26px] py-1">
                  {t(`form_${key}_card`)}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card border-line flex min-w-0 flex-col gap-3 rounded-3xl border p-5">
          <h2 id="ev-theme" className="text-section text-heading">
            {t("themeTitle")}
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="ev-theme"
            className="flex flex-wrap gap-2"
          >
            {CARD_THEMES.map((theme) => {
              const on = card.theme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-on={on}
                  disabled={disabled}
                  onClick={() => {
                    if (!on) void change({ theme });
                  }}
                  className="bg-card border-line-strong hover:border-ink-disabled focus-visible:outline-primary text-body text-body-ink flex min-h-10 items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] max-lg:min-h-12"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-7 shrink-0 rounded-full",
                      CARD_THEME_STYLE[theme].fill,
                    )}
                  />
                  {t(CARD_THEME_STYLE[theme].labelKey)}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {questionsOpen ? (
        <QuestionsDialog
          open={questionsOpen}
          onOpenChange={setQuestionsOpen}
          questions={settings.customQuestions}
          onSave={settings.saveQuestions}
        />
      ) : null}
    </div>
  );
}
