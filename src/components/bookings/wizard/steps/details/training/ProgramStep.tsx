"use client";

import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { fetchTrainingPrograms } from "@/lib/api/training-book";
import { formatMoney, isPluralOne } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import {
  bookablePrograms,
  packOptions,
  programFormat,
  programMinutes,
} from "@/lib/training/program-offer";
import type { TrainingPackage } from "@/types/training";

// ============================================================================
// Training's "Program" screen (the client's mock, 2026-10-01): "Choose a
// program" — the facility's programs as cards:
//
//   Private lesson                Group class              Behaviour consult
//   One-on-one with a trainer     Weekly class series      Assessment and plan
//   $95 / session      60 min     $280 / series  6 weeks   $140          90 min
//
//   SESSIONS  [Single session $95] [3-session pack $270 · save $15] [5-…]
//   You'll book the first session now — the rest can be scheduled from the
//   booking page.
//
// Prices are per pet. A lesson's packs are sold as a prepaid package of that
// many sessions; the first is booked now.
// ============================================================================

const NO_PROGRAMS: TrainingPackage[] = [];

export interface ProgramChoice {
  programId: string | null;
  /** Sessions in the pack: 1 is a single session. */
  pack: number;
}

export function ProgramStep({
  isCustomer,
  value,
  onChange,
}: {
  isCustomer: boolean;
  value: ProgramChoice;
  onChange: (next: ProgramChoice) => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const audience = isCustomer ? "customer" : "staff";
  const { data = NO_PROGRAMS, isPending } = useQuery({
    queryKey: ["training", "packages", audience] as const,
    queryFn: () => fetchTrainingPrograms(audience),
  });
  const programs = bookablePrograms(data);
  const chosen = programs.find((p) => p.id === value.programId) ?? null;
  const packs = chosen ? packOptions(chosen) : [];
  const money = (amount: number) =>
    formatMoney(amount, locale, { whole: Number.isInteger(amount) });

  const priceLabel = (program: TrainingPackage) => {
    const format = programFormat(program);
    if (format === "group")
      return fill(t("wizPricePerSeries"), { price: money(program.price) });
    if (format === "lesson")
      return fill(t("wizPricePerSession"), { price: money(program.price) });
    return money(program.price);
  };
  const metaLabel = (program: TrainingPackage) => {
    if (programFormat(program) === "group") {
      const weeks = program.sessions;
      return fill(
        t(isPluralOne(weeks, locale) ? "wizWeeksOne" : "wizWeeksOther"),
        { count: weeks },
      );
    }
    return fill(t("wizMinutes"), { count: programMinutes(program) });
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-section text-body-ink">{t("wizChooseProgram")}</h3>
        <p className="text-meta text-ink-tertiary">{t("wizPricesPerPet")}</p>
      </div>

      {programs.length === 0 && isPending ? (
        <div
          aria-hidden
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3.5"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-line bg-card yy-skel flex h-[150px] flex-col gap-3 rounded-2xl border px-5 py-[18px]"
            >
              <span className="bg-surface-inset h-4 w-2/5 rounded-full" />
              <span className="bg-surface-inset h-3 w-3/5 rounded-full" />
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <p className="border-line-strong text-meta text-ink-secondary rounded-2xl border border-dashed px-6 py-8 text-center">
          {t("wizNoPrograms")}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3.5">
          {programs.map((program) => {
            const on = value.programId === program.id;
            return (
              <button
                key={program.id}
                type="button"
                aria-pressed={on}
                data-on={on}
                onClick={() => onChange({ programId: program.id, pack: 1 })}
                className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary relative flex min-w-0 flex-col gap-2.5 rounded-2xl border px-5 py-[18px] text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
              >
                <span className="text-section text-body-ink pr-8">
                  {program.name}
                </span>
                {program.description ? (
                  <span className="text-meta text-ink-tertiary line-clamp-3 flex-1 text-pretty">
                    {program.description}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
                <span className="border-line flex items-baseline justify-between gap-2 border-t pt-2.5">
                  <span className="text-body-strong text-body-ink tabular-nums">
                    {priceLabel(program)}
                  </span>
                  <span className="text-meta text-ink-tertiary tabular-nums">
                    {metaLabel(program)}
                  </span>
                </span>
                {on ? (
                  <span
                    aria-hidden
                    className="bg-primary text-primary-foreground absolute top-4 right-4 flex size-6 items-center justify-center rounded-full"
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {chosen && packs.length > 1 ? (
        <div className="flex flex-col gap-2.5">
          <span className="text-micro text-ink-tertiary uppercase">
            {t("wizSessions")}
          </span>
          <div
            role="radiogroup"
            aria-label={t("wizSessions")}
            className="flex flex-wrap gap-2"
          >
            {packs.map((pack) => {
              const on = value.pack === pack.sessions;
              return (
                <button
                  key={pack.sessions}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-on={on}
                  onClick={() =>
                    onChange({ programId: chosen.id, pack: pack.sessions })
                  }
                  className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary flex min-h-12 flex-col justify-center rounded-xl border px-4 py-2 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
                >
                  <span className="text-body-strong text-body-ink">
                    {pack.sessions === 1
                      ? t("wizSingleSession")
                      : fill(t("wizSessionPack"), { count: pack.sessions })}
                  </span>
                  <span className="text-meta text-ink-tertiary tabular-nums">
                    {pack.saves > 0
                      ? fill(t("wizPackSaves"), {
                          price: money(pack.price),
                          saves: money(pack.saves),
                        })
                      : money(pack.price)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-meta text-ink-tertiary">{t("wizPackNote")}</p>
        </div>
      ) : null}
    </div>
  );
}
