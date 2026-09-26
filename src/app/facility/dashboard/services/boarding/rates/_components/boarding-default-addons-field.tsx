"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import { formatMoney } from "@/lib/i18n/format";
import {
  canBeDefault,
  DEFAULT_ADD_ON_WHENS,
  type BoardingDefaultAddOn,
  type DefaultAddOnWhen,
} from "@/lib/pricing/boarding-default-addons";
import { addOnsForService } from "@/lib/settings/addons";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// A BOARDING SERVICE'S DEFAULT ADD-ONS — what a stay of it gets by its length.
//
// `boarding_service_default_addons` existed from the menu's first migration
// and nothing wrote or read it. Each row is an add-on from the facility's own
// catalogue, the days of the stay it covers, how many on each of those days,
// and optionally the shortest stay it starts at. The days are counted in ONE
// place — `lib/pricing/boarding-default-addons.ts` — for this screen's words,
// the booking form's total and the customer's quote alike.
//
// Only boarding add-ons, and not one priced as a percentage of the booking:
// a quantity of days multiplied into a percentage is not a price anybody set.
// The remove control is always shown (§6 rule 11: two of three contexts have
// no hover), and each field has its own label rather than a column heading
// that stops meaning anything once the row wraps at 599px.
// ============================================================================

const WHEN_KEYS: Record<DefaultAddOnWhen, string> = {
  every_day: "whenEveryDay",
  except_checkout: "whenExceptCheckout",
  except_checkin: "whenExceptCheckin",
  last_day: "whenLastDay",
};

/** A positive whole number from a field, or null when it is empty or not one. */
function wholeOrNull(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== "" && Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * A count that holds what is being typed until the field is left: bound
 * straight to the number, clearing "1" to type "3" was impossible, because an
 * empty field is not a count and the old value came straight back.
 */
function CountInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: number | null;
  placeholder?: string;
  /** Called with every whole number typed, and with null when cleared. */
  onChange: (value: number | null) => void;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      className="tabular-nums"
      placeholder={placeholder}
      value={typing ?? (value === null ? "" : String(value))}
      onChange={(e) => {
        setTyping(e.target.value);
        const n = wholeOrNull(e.target.value);
        if (n !== null || e.target.value.trim() === "") onChange(n);
      }}
      onBlur={() => setTyping(null)}
    />
  );
}

export function BoardingDefaultAddOnsField({
  value,
  onChange,
}: {
  value: BoardingDefaultAddOn[];
  onChange: (next: BoardingDefaultAddOn[]) => void;
}) {
  const { t, fill, locale } = useStaffText("boardingServices");
  const { addOns } = useServiceAddOns();
  const candidates = addOnsForService(addOns, "boarding").filter(canBeDefault);

  const update = (index: number, patch: Partial<BoardingDefaultAddOn>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const add = () => {
    // The first add-on not already attached every day, so a second press does
    // not produce a row the table's unique key would refuse.
    const next =
      candidates.find(
        (a) =>
          !value.some((r) => r.addOnId === a.id && r.appliesOn === "every_day"),
      ) ?? candidates[0];
    if (!next) return;
    onChange([
      ...value,
      {
        addOnId: next.id,
        appliesOn: "every_day",
        quantityPerDay: 1,
        minNights: null,
      },
    ]);
  };

  if (candidates.length === 0 && value.length === 0) {
    return (
      <p className="text-muted-foreground text-[13.5px]">
        {t("defaultsNoAddOns")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {value.map((row, index) => {
        const addOn = addOns.find((a) => a.id === row.addOnId);
        const name = addOn?.name ?? t("defaultsRemovedAddOn");
        const id = `bsv-default-${index}`;
        return (
          <div
            key={`${row.addOnId}-${row.appliesOn}-${index}`}
            className="space-y-3 rounded-xl border border-(--line) p-4"
          >
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor={`${id}-addon`} className="text-[13.5px]">
                  {t("defaultsAddOn")}
                </Label>
                <Select
                  value={row.addOnId}
                  onValueChange={(addOnId) => update(index, { addOnId })}
                >
                  <SelectTrigger id={`${id}-addon`}>
                    <SelectValue placeholder={name} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} · {formatMoney(a.price, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={fill("defaultsRemove", { name })}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${id}-when`} className="text-[13.5px]">
                  {t("defaultsWhen")}
                </Label>
                <Select
                  value={row.appliesOn}
                  onValueChange={(appliesOn) =>
                    update(index, { appliesOn: appliesOn as DefaultAddOnWhen })
                  }
                >
                  <SelectTrigger id={`${id}-when`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_ADD_ON_WHENS.map((when) => (
                      <SelectItem key={when} value={when}>
                        {t(WHEN_KEYS[when])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${id}-qty`} className="text-[13.5px]">
                  {t("defaultsPerDay")}
                </Label>
                <CountInput
                  id={`${id}-qty`}
                  value={row.quantityPerDay}
                  // An empty field keeps the last count: a rule that adds none
                  // each day is not a rule, and removing it is the bin's job.
                  onChange={(n) => {
                    if (n !== null) update(index, { quantityPerDay: n });
                  }}
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${id}-min`} className="text-[13.5px]">
                  {t("defaultsMinNights")}
                </Label>
                <CountInput
                  id={`${id}-min`}
                  value={row.minNights}
                  placeholder={t("defaultsEveryStay")}
                  onChange={(minNights) => update(index, { minNights })}
                />
              </div>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        disabled={candidates.length === 0}
      >
        <Plus aria-hidden />
        {t("defaultsAdd")}
      </Button>
    </div>
  );
}
