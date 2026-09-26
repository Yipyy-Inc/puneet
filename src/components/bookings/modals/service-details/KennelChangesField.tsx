"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  kennelStretches,
  type KennelChange,
} from "@/lib/boarding/kennel-changes";
import { todayIso } from "@/lib/care-log-scheduler";
import { formatCalendarDayLong } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { RoomCategory } from "@/types/rooms";

// ============================================================================
// Kennel changes, planned with the booking.
//
// The room step puts the pets in a lodging type for the whole stay; this adds
// "from this night, that type". Each stretch of nights becomes a free kennel
// of its type when the booking is saved (`planKennels`), and the booking and
// its moves are made in one transaction — so a kennel taken on those nights
// refuses the save, rather than leaving half a plan behind.
// ============================================================================

/** At most this many changes; a stay moved more often is moved on its page. */
const MAX_CHANGES = 3;

/** Every night after the first, up to the night before check-out. */
function laterNights(start: string, end: string): string[] {
  const nights: string[] = [];
  const day = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  day.setDate(day.getDate() + 1);
  while (day < last && nights.length < 366) {
    nights.push(todayIso(day));
    day.setDate(day.getDate() + 1);
  }
  return nights;
}

export function KennelChangesField({
  startDate,
  endDate,
  first,
  defaultType,
  labelOf,
  categories,
  value,
  onChange,
}: {
  /** The stay's first night and check-out day, YYYY-MM-DD. */
  startDate: string;
  endDate: string;
  /** The lodging type (or room) the step placed the pets in. */
  first: string;
  /** The type a new change starts on — the first kennel's. */
  defaultType: string;
  /** A type's or a room's name. */
  labelOf: (id: string) => string;
  categories: RoomCategory[];
  value: KennelChange[];
  onChange: (changes: KennelChange[]) => void;
}) {
  const { t, fill, locale } = useStaffText("kennelMoves");
  const nights = laterNights(startDate, endDate);
  if (nights.length === 0) return null;

  const changes = value.filter((c) => nights.includes(c.from));
  const stretches = kennelStretches({ startDate, endDate, first, changes });
  const day = (value: string) => formatCalendarDayLong(value, locale);

  const update = (index: number, patch: Partial<KennelChange>) =>
    onChange(changes.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const add = () => {
    const taken = new Set(changes.map((c) => c.from));
    const from = nights.find((n) => !taken.has(n));
    if (!from) return;
    onChange([...changes, { from, roomId: defaultType }]);
  };

  return (
    <section className="space-y-3" aria-labelledby="kennel-changes-title">
      <div>
        <h4 id="kennel-changes-title" className="text-sm font-semibold">
          {t("changesTitle")}
        </h4>
        <p className="text-ink-tertiary mt-1 text-sm">{t("changesHelp")}</p>
      </div>

      {changes.map((change, index) => (
        <div
          key={index}
          // Narrow: the night takes the first row and the type shares the
          // second with its remove button, so the × stays beside the change
          // it removes instead of sitting alone under the fields.
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
            <Label htmlFor={`kennel-change-${index}-from`}>
              {t("fromLabel")}
            </Label>
            <Select
              value={change.from}
              onValueChange={(from) => update(index, { from })}
            >
              <SelectTrigger
                id={`kennel-change-${index}-from`}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nights.map((night) => (
                  <SelectItem key={night} value={night}>
                    {day(night)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor={`kennel-change-${index}-type`}>
              {t("changeType")}
            </Label>
            <Select
              value={change.roomId}
              onValueChange={(roomId) => update(index, { roomId })}
            >
              <SelectTrigger
                id={`kennel-change-${index}-type`}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={fill("removeChange", { date: day(change.from) })}
            onClick={() => onChange(changes.filter((_, i) => i !== index))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      {changes.length > 0 && (
        <ol className="space-y-1 text-sm">
          {stretches.map((stretch) => (
            <li
              key={stretch.from}
              className="flex flex-wrap justify-between gap-x-4"
            >
              <span className="text-ink-tertiary">
                {fill("nights", {
                  from: day(stretch.from),
                  to: day(stretch.to),
                })}
              </span>
              <span className="text-body-ink min-w-0 font-semibold">
                {labelOf(stretch.roomId)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {changes.length < Math.min(MAX_CHANGES, nights.length) && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          {t("addChange")}
        </Button>
      )}
    </section>
  );
}
