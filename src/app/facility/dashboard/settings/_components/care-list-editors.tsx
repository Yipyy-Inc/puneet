"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimeOfDay } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type { MealTime } from "@/lib/settings/feeding-instructions";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The Feeding instructions card's list editors: a category shown as its
// values, and edited in place — rename, reorder, remove, add. Rebuilt on the
// design system's controls (40px, 48px below 1024px; §6 rule 7) from the
// card they came from, whose 32px inputs and 12px arrows were too small to
// tap standing at a desk.
// ============================================================================

function move<T>(items: T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** One category: its name and count, its values, and Edit / Done. */
export function CategoryGroup({
  id,
  label,
  count,
  editing,
  onToggle,
  children,
  editor,
}: {
  id: string;
  label: string;
  count: number;
  editing: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  editor: React.ReactNode;
}) {
  const t = useSettingsText().section("care-tasks");
  return (
    <section className="space-y-2" aria-labelledby={`${id}-label`}>
      <div className="flex items-center justify-between gap-3">
        <h4
          id={`${id}-label`}
          className="text-micro text-ink-tertiary flex items-center gap-2 uppercase"
        >
          {label}
          <span className="text-meta text-ink-secondary font-semibold tracking-normal normal-case tabular-nums">
            {count}
          </span>
        </h4>
        <Button type="button" variant="ghost" onClick={onToggle}>
          {editing ? (
            <Check className="size-4" />
          ) : (
            <Pencil className="size-4" />
          )}
          {editing ? t("done") : t("edit")}
        </Button>
      </div>
      {editing ? editor : children}
    </section>
  );
}

/** A category's values, read only. */
export function ValueTags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="border-line text-body-ink text-meta rounded-full border px-3 py-1"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Meal times, read only. */
export function MealTimeTags({
  items,
  locale,
}: {
  items: MealTime[];
  locale: AppLocale;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li
          key={item.id ?? index}
          className="border-line text-body-ink text-meta flex items-center gap-1.5 rounded-full border px-3 py-1"
        >
          <Clock className="text-ink-tertiary size-4" aria-hidden />
          {item.label}
          <span className="text-ink-tertiary tabular-nums">
            {formatTimeOfDay(item.time, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RowControls({
  label,
  index,
  count,
  onMove,
  onRemove,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useSettingsText().section("care-tasks");
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("moveUpNamed").replace("{name}", label)}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("moveDownNamed").replace("{name}", label)}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("removeNamed").replace("{name}", label)}
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </>
  );
}

/** A list of words: rename, reorder, remove, add. */
export function ListEditor({
  id,
  items,
  onChange,
  placeholder,
}: {
  id: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const t = useSettingsText().section("care-tasks");
  const [adding, setAdding] = useState("");
  const add = () => {
    const value = adding.trim();
    if (value && !items.includes(value)) onChange([...items, value]);
    setAdding("");
  };
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <Input
            aria-label={t("valueNamed").replace("{n}", String(index + 1))}
            value={item}
            maxLength={80}
            onChange={(event) =>
              onChange(
                items.map((x, i) => (i === index ? event.target.value : x)),
              )
            }
            className="min-w-0 flex-1"
          />
          <RowControls
            label={item}
            index={index}
            count={items.length}
            onMove={(by) => onChange(move(items, index, by))}
            onRemove={() => onChange(items.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          id={`${id}-add`}
          aria-label={placeholder}
          value={adding}
          maxLength={80}
          placeholder={placeholder}
          onChange={(event) => setAdding(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!adding.trim()}
          onClick={add}
        >
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>
    </div>
  );
}

/** Meal times: a label and a time each. */
export function MealTimeEditor({
  items,
  onChange,
}: {
  items: MealTime[];
  onChange: (items: MealTime[]) => void;
}) {
  const t = useSettingsText().section("care-tasks");
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("08:00");
  const patch = (index: number, change: Partial<MealTime>) =>
    onChange(items.map((x, i) => (i === index ? { ...x, ...change } : x)));
  const add = () => {
    if (!label.trim()) return;
    onChange([
      ...items,
      { id: `meal-${crypto.randomUUID()}`, label: label.trim(), time },
    ]);
    setLabel("");
    setTime("08:00");
  };
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id ?? index}
          className="flex flex-wrap items-center gap-1"
        >
          <Input
            aria-label={t("mealNameNamed").replace("{n}", String(index + 1))}
            value={item.label}
            maxLength={60}
            placeholder={t("label")}
            onChange={(event) => patch(index, { label: event.target.value })}
            className="min-w-0 flex-1"
          />
          <Input
            type="time"
            aria-label={t("mealTimeNamed").replace("{name}", item.label)}
            value={item.time}
            onChange={(event) => patch(index, { time: event.target.value })}
            className="w-32 tabular-nums"
          />
          <RowControls
            label={item.label}
            index={index}
            count={items.length}
            onMove={(by) => onChange(move(items, index, by))}
            onRemove={() => onChange(items.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t("phSchedule")}
          value={label}
          maxLength={60}
          placeholder={t("phSchedule")}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="min-w-0 flex-1"
        />
        <Input
          type="time"
          aria-label={t("newMealTime")}
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="w-32 tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!label.trim()}
          onClick={add}
        >
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>
    </div>
  );
}
