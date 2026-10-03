"use client";

import { useQuery } from "@tanstack/react-query";

import { Tick } from "@/components/ui/tick";
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
    <div className="flex max-w-[1000px] flex-col gap-[18px]">
      <div className="flex min-w-0 flex-col gap-[3px]">
        <h3 className="text-body-ink text-[17px] font-semibold">
          {t("wizChooseProgram")}
        </h3>
        <p className="text-ink-tertiary text-[13.5px]">
          {t("wizPricesPerPet")}
        </p>
      </div>

      {programs.length === 0 && isPending ? (
        <div
          aria-hidden
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3.5"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-line bg-card yy-skel flex h-[150px] flex-col gap-3 rounded-[22px] border-[1.5px] p-5"
            >
              <span className="bg-surface-inset h-4 w-2/5 rounded-full" />
              <span className="bg-surface-inset h-3 w-3/5 rounded-full" />
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <p className="border-line-strong text-ink-secondary rounded-[20px] border-[1.5px] border-dashed px-6 py-8 text-center text-[13.5px]">
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
                className="mk-pick bg-card focus-visible:outline-primary relative flex min-w-0 flex-col gap-2.5 rounded-[22px] p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="text-body-ink pr-7 text-[16.5px] font-semibold">
                  {program.name}
                </span>
                {program.description ? (
                  <span className="text-ink-tertiary line-clamp-3 flex-1 text-[13px] text-pretty">
                    {program.description}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
                <span className="border-line-soft flex items-center justify-between gap-2 border-t pt-2.5">
                  <span className="text-body-ink text-[15px] font-bold tabular-nums">
                    {priceLabel(program)}
                  </span>
                  <span className="text-ink-tertiary text-[12.5px] tabular-nums">
                    {metaLabel(program)}
                  </span>
                </span>
                {on ? (
                  <Tick size={24} className="top-[18px] right-[18px]" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {chosen && packs.length > 1 ? (
        <div className="flex flex-col gap-2.5">
          <span className="text-ink-tertiary text-[11.5px] font-semibold tracking-[0.07em] uppercase">
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
                  className="mk-opt text-body-ink focus-visible:outline-primary flex flex-col items-start gap-0.5 rounded-[16px] px-4 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="text-[14px] font-semibold">
                    {pack.sessions === 1
                      ? t("wizSingleSession")
                      : fill(t("wizSessionPack"), { count: pack.sessions })}
                  </span>
                  <span className="text-ink-tertiary text-[12px] tabular-nums">
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
          <p className="text-ink-tertiary text-[12.5px]">{t("wizPackNote")}</p>
        </div>
      ) : null}
    </div>
  );
}
