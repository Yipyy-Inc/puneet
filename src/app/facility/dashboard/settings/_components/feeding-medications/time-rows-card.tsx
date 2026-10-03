"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fill } from "@/lib/medications/dose";
import { newRowId, type CareTime } from "@/lib/settings/care-setup";

import { SetupCard, SetupRow } from "./setup-card";

// ============================================================================
// MEAL TIMES / DOSE TIMES: the times the booking form offers with one tap.
// Each on or off, named — a built-in one by its translation until the
// facility renames it, and back to it when the name is cleared — at a time,
// and pre-selected or not for a new plan or medication. The facility adds its
// own; those it can remove, with an Undo.
// ============================================================================

export function TimeRowsCard({
  id,
  title,
  help,
  rows,
  builtIn,
  builtInName,
  prefix,
  newName,
  addLabel,
  onChange,
  customTimes,
  changed,
  onReset,
  removed,
  t,
}: {
  id: string;
  title: string;
  help: string;
  rows: CareTime[];
  builtIn: readonly string[];
  /** A built-in row's name in the reader's words. */
  builtInName: (id: string) => string;
  prefix: "meal" | "dose";
  newName: string;
  addLabel: string;
  /** Changes the rows as they are then — an Undo restores into the current list. */
  onChange: (change: (rows: CareTime[]) => CareTime[]) => void;
  /** "Allow custom times" — the dose rounds have it, the meal times do not. */
  customTimes?: { checked: boolean; onChange: (checked: boolean) => void };
  changed: boolean;
  onReset: () => void;
  removed: (name: string, undo: () => void) => void;
  t: (key: string) => string;
}) {
  const update = (id: string, patch: Partial<CareTime>) =>
    onChange((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const nameOf = (row: CareTime) =>
    builtIn.includes(row.id)
      ? (row.label ?? builtInName(row.id))
      : (row.label ?? "");

  return (
    <SetupCard
      id={id}
      title={title}
      help={help}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="flex flex-col">
        {rows.map((row, index) => {
          const own = !builtIn.includes(row.id);
          const name = nameOf(row);
          const shown = name.trim() || builtInName(row.id) || row.time;
          return (
            <SetupRow key={row.id}>
              <Switch
                size="sm"
                checked={row.on}
                onCheckedChange={(on) => update(row.id, { on })}
                aria-label={fill(t("rowOn"), { name: shown })}
              />
              <Input
                value={name}
                maxLength={40}
                aria-label={fill(t("rowName"), { n: index + 1 })}
                aria-invalid={own && !name.trim() ? true : undefined}
                onChange={(event) => {
                  const value = event.target.value;
                  update(row.id, {
                    // A built-in name typed back is the translation again.
                    label:
                      !own && value === builtInName(row.id) ? undefined : value,
                  });
                }}
                onBlur={() => {
                  if (!own && !row.label?.trim()) {
                    update(row.id, { label: undefined });
                  }
                }}
                className="w-[180px] min-w-40 flex-1 sm:flex-none"
              />
              <Input
                type="time"
                value={row.time}
                required
                aria-label={fill(t("rowTime"), { name: shown })}
                onChange={(event) => {
                  if (event.target.value) {
                    update(row.id, { time: event.target.value });
                  }
                }}
                className="w-36 tabular-nums"
              />
              <label className="text-ink-secondary flex min-w-40 flex-1 cursor-pointer items-center gap-2 text-[14px]">
                <Checkbox
                  checked={row.preselected}
                  onCheckedChange={(checked) =>
                    update(row.id, { preselected: checked === true })
                  }
                />
                {t("preselected")}
              </label>
              {own ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="setup"
                  className="text-bad hover:text-bad px-2.5 font-normal"
                  aria-label={fill(t("removeNamed"), { name: shown })}
                  onClick={() => {
                    onChange((current) =>
                      current.filter((candidate) => candidate.id !== row.id),
                    );
                    removed(shown, () =>
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
                  {t("remove")}
                </Button>
              ) : null}
            </SetupRow>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--row-line) px-5 pt-3 pb-[18px] sm:px-6">
        <Button
          type="button"
          variant="quiet"
          size="setup"
          className="text-primary gap-1 border-[1.5px] border-dashed border-(--cs-line) font-semibold"
          disabled={rows.length >= 12}
          onClick={() => {
            const row: CareTime = {
              id: newRowId(prefix),
              label: newName,
              time: "15:00",
              on: true,
              preselected: false,
            };
            onChange((current) => [...current, row]);
          }}
        >
          <span aria-hidden>+</span>
          {addLabel}
        </Button>
        {customTimes ? (
          <label className="text-ink-secondary flex cursor-pointer items-center gap-2 text-[14px]">
            <Checkbox
              checked={customTimes.checked}
              onCheckedChange={(checked) =>
                customTimes.onChange(checked === true)
              }
            />
            {t("allowCustomTimes")}
          </label>
        ) : null}
      </div>
    </SetupCard>
  );
}
