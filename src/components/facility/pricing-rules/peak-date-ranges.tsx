"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";
import type { PeakDateRange } from "@/types/boarding";

// ── One rule, as many spans as the busy season actually has ──────────────
//
// `dateRanges` has been read by the evaluator all along — a rule carrying two
// spans surcharges the nights inside either of them — but the editor only ever
// wrote `startDate` and `endDate`, so the only way to author the second span
// was a second rule with the same name.
//
// Which mattered more than duplication once overlapping rules started
// resolving to the highest: two spans of one rule are one price, where two
// rules are two prices competing. The facility's own grouping now survives
// into the pricing.

export function PeakDateRanges({
  value,
  onChange,
}: {
  value: PeakDateRange[];
  onChange: (next: PeakDateRange[]) => void;
}) {
  const { t } = usePricingLabels();
  const ranges = value.length > 0 ? value : [{ start: "", end: "" }];

  const update = (index: number, patch: Partial<PeakDateRange>) => {
    onChange(
      ranges.map((range, each) =>
        each === index ? { ...range, ...patch } : range,
      ),
    );
  };

  return (
    <div className="space-y-3">
      {ranges.map((range, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label>{t("psStartDate")}</Label>
            <Input
              type="date"
              value={range.start}
              onChange={(event) => update(index, { start: event.target.value })}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>{t("psEndDate")}</Label>
            <Input
              type="date"
              value={range.end}
              onChange={(event) => update(index, { end: event.target.value })}
            />
          </div>
          {/* Persistent, not revealed on hover — two of the three contexts
              have no hover at all (§6 rule 11). The first range has no
              remove button because a rule with no dates is not a rule. */}
          {ranges.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="text-destructive"
              aria-label={t("psRemoveRange")}
              onClick={() =>
                onChange(ranges.filter((_, each) => each !== index))
              }
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...ranges, { start: "", end: "" }])}
      >
        <Plus className="size-4" />
        {t("psAddRange")}
      </Button>
    </div>
  );
}
