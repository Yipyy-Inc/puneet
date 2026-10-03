"use client";

import { useState } from "react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { optionLabel } from "@/lib/feeding/labels";
import { fill } from "@/lib/medications/dose";
import { newRowId, type CareOption } from "@/lib/settings/care-setup";
import {
  FEEDING_OPTION_LISTS,
  FEEDING_OPTION_VOCABULARY,
  type FeedingOptionList,
} from "@/lib/settings/feeding-instructions";

import { SetupCard } from "./setup-card";

// ============================================================================
// FEEDING OPTIONS: the quick picks the booking form's Feeding step shows —
// feeding styles, eating habits, what to do when a meal is skipped, and the
// common allergies. Tap one to take it off the form; add the facility's own
// with Enter, and take those away again, with an Undo.
// ============================================================================

const TITLE_KEY: Record<FeedingOptionList, string> = {
  styles: "listStyles",
  habits: "listHabits",
  skip: "listSkip",
  allergies: "listAllergies",
};

type Lists = Record<FeedingOptionList, CareOption[]>;

function OptionList({
  list,
  rows,
  onChange,
  removed,
  t,
  bt,
}: {
  list: FeedingOptionList;
  rows: CareOption[];
  onChange: (change: (rows: CareOption[]) => CareOption[]) => void;
  removed: (name: string, undo: () => void) => void;
  t: (key: string) => string;
  bt: (key: string) => string;
}) {
  const [draft, setDraft] = useState("");
  const title = t(TITLE_KEY[list]);
  const builtIn = FEEDING_OPTION_VOCABULARY[list];
  const nameOf = (row: CareOption) => optionLabel(bt, list, row);

  const add = () => {
    const label = draft.trim();
    setDraft("");
    if (!label) return;
    const known = rows.some(
      (row) => nameOf(row).toLowerCase() === label.toLowerCase(),
    );
    if (known) return;
    const row: CareOption = { id: newRowId("custom"), label, on: true };
    onChange((current) => [...current, row]);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5 border-t border-(--row-line) px-5 py-[18px] first:border-t-0 sm:px-6">
      <span
        id={`f-options-${list}`}
        className="text-body-ink text-[14px] font-medium"
      >
        {title}
      </span>
      <div
        role="group"
        aria-labelledby={`f-options-${list}`}
        className="flex flex-wrap items-center gap-2"
      >
        {rows.map((row, index) => {
          const name = nameOf(row);
          const own = !builtIn.includes(row.id);
          const pill = (
            <ChoicePill
              type="checkbox"
              value={row.id}
              checked={row.on}
              onChange={() =>
                onChange((current) =>
                  current.map((candidate) =>
                    candidate.id === row.id
                      ? { ...candidate, on: !candidate.on }
                      : candidate,
                  ),
                )
              }
            >
              {name}
            </ChoicePill>
          );
          if (!own) return <span key={row.id}>{pill}</span>;
          return (
            <span key={row.id} className="inline-flex items-center gap-1">
              {pill}
              <button
                type="button"
                className="bg-surface-inset-2 text-ink-tertiary focus-visible:outline-primary grid size-[22px] place-items-center rounded-full text-[15px] focus-visible:outline-2"
                aria-label={fill(t("removeNamed"), { name })}
                onClick={() => {
                  onChange((current) =>
                    current.filter((candidate) => candidate.id !== row.id),
                  );
                  removed(name, () =>
                    onChange((current) =>
                      current.some((candidate) => candidate.id === row.id)
                        ? current
                        : [
                            ...current.slice(0, index),
                            row,
                            ...current.slice(index),
                          ],
                    ),
                  );
                }}
              >
                <span aria-hidden>×</span>
              </button>
            </span>
          );
        })}
        <Input
          value={draft}
          maxLength={60}
          placeholder={t("addOptionPlaceholder")}
          aria-label={fill(t("addOptionLabel"), { list: title })}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="h-10! w-[170px] max-w-full rounded-full! border-[1.5px] border-dashed border-(--care-dash-2) px-3.5! text-[14px]!"
        />
      </div>
    </div>
  );
}

export function OptionListsCard({
  lists,
  onChange,
  changed,
  onReset,
  removed,
  t,
  bt,
}: {
  lists: Lists;
  onChange: (
    list: FeedingOptionList,
    change: (rows: CareOption[]) => CareOption[],
  ) => void;
  changed: boolean;
  onReset: () => void;
  removed: (name: string, undo: () => void) => void;
  t: (key: string) => string;
  bt: (key: string) => string;
}) {
  return (
    <SetupCard
      id="f-options"
      title={t("optionsTitle")}
      help={t("optionsHelp")}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="flex flex-col">
        {FEEDING_OPTION_LISTS.map((list) => (
          <OptionList
            key={list}
            list={list}
            rows={lists[list]}
            onChange={(change) => onChange(list, change)}
            removed={removed}
            t={t}
            bt={bt}
          />
        ))}
      </div>
    </SetupCard>
  );
}
