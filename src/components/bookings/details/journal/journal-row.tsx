"use client";

import { Chip } from "@/components/ui/chip";
import { ChoicePill } from "@/components/ui/choice-pill";
import type { JournalRow as Row } from "@/lib/bookings/details/journal-plan";
import {
  isConcerning,
  journalOptions,
} from "@/lib/bookings/details/service-view";
import { formatTimeOfDay } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// One entry of the journal, as the mock draws it: its time and a chip of its
// kind on the left; what it is and the detail; once logged, the result in
// green (amber when somebody should notice) and who logged it, when; and the
// answers as pills — one tap logs it, a tap on the same answer takes it back.
// The answers are one radio group, so arrow keys move between them.
// ============================================================================

const KIND_KEY = {
  meal: "kindMeal",
  med: "kindMed",
  potty: "kindPotty",
  activity: "kindActivity",
} as const;

/** An answer's words, by kind — "Refused" is "Didn't eat" for a meal. */
export function optionLabel(
  t: (key: string) => string,
  kind: Row["kind"],
  outcome: string,
): string {
  if (kind === "meal" && outcome === "refused") return t("optionDidntEat");
  const key: Record<string, string> = {
    ate_all: "journalOutcomeAteAll",
    ate_most: "journalOutcomeAteMost",
    ate_some: "journalOutcomeAteSome",
    ate_little: "journalOutcomeAteLittle",
    refused: "journalOutcomeRefused",
    given: "journalOutcomeGiven",
    skipped: "journalOutcomeSkipped",
    pee: "optionPee",
    poop: "optionPoop",
    both: "journalOutcomeBoth",
    nothing: "journalOutcomeNothing",
    completed: "optionDone",
    vomited: "journalOutcomeVomited",
    served: "journalOutcomeServed",
    issue_reported: "journalOutcomeIssue",
  };
  return key[outcome] ? t(key[outcome]) : outcome.replace(/_/g, " ");
}

export function JournalRowView({
  row,
  t,
  locale,
  petName,
  canLog,
  busy,
  onAnswer,
}: {
  row: Row;
  t: (key: string) => string;
  locale: AppLocale;
  /** Said when the booking has more than one pet. */
  petName: string | null;
  /** Logging is offered while the pet is here and the day is not ahead. */
  canLog: boolean;
  busy: boolean;
  onAnswer: (row: Row, outcome: string) => void;
}) {
  const logged = row.entry;
  const options = journalOptions(row.kind);
  const group = `journal-${row.key}`;
  return (
    <li
      data-unlogged={canLog && !logged && row.planned ? "true" : undefined}
      className="border-line-soft grid grid-cols-[76px_minmax(0,1fr)] gap-3.5 border-b px-5 py-3.5"
    >
      <span className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">
          {formatTimeOfDay(row.time, locale)}
        </span>
        <Chip data-kind={row.kind} tone="kind" size="bd-kind">
          {t(KIND_KEY[row.kind])}
        </Chip>
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-medium">
              {[petName, row.title].filter(Boolean).join(" · ")}
            </span>
            {row.detail ? (
              <span className="text-ink-tertiary text-[13px]">
                {row.detail}
              </span>
            ) : null}
          </span>
          {logged ? (
            <span className="flex items-center gap-2">
              <Chip
                tone={isConcerning(logged.outcome) ? "warning" : "success"}
                size="bd-13"
              >
                {optionLabel(t, row.kind, logged.outcome)}
              </Chip>
              <span className="text-ink-disabled text-[12px]">
                {[
                  logged.recordedByName,
                  formatTimeOfDay(logged.executedAt.slice(0, 5), locale),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          ) : null}
        </div>
        {canLog ? (
          <div
            role="radiogroup"
            aria-label={row.title}
            className="flex flex-wrap gap-1.5"
          >
            {options.map((outcome) => (
              <ChoicePill
                key={outcome}
                type="radio"
                name={group}
                value={outcome}
                checked={logged?.outcome === outcome}
                disabled={busy}
                onChange={() => onAnswer(row, outcome)}
                // A second tap on the chosen answer takes the log back.
                onReselect={() => onAnswer(row, outcome)}
              >
                {optionLabel(t, row.kind, outcome)}
              </ChoicePill>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
