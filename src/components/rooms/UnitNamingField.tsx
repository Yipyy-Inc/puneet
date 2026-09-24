"use client";

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { generateUnits } from "@/lib/api/lodging-units";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// ADD LODGING — how many units, called what.
//
// MoéGo: "Input total unit quantity… Prefix: Refers to the initial part of the
// unit name, such as 'Room' in 'Room001', and includes the starting number for
// auto-generated room codes (e.g., Room 101, Room 102, etc.)."
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// The field was "Number of Units" alone, and the names were the CATEGORY's
// name plus a zero-padded counter that always began at one: "Deluxe Suite 01".
// A facility whose kennels are 101-116, or simply 1-3, could not say so — they
// renamed every unit afterwards.
//
// ── THE PREVIEW IS THE REAL FUNCTION, NOT A DESCRIPTION OF IT ─────────────
//
// It calls `generateUnits`, the same code the route calls, so what the screen
// promises and what the database gets cannot drift. The old hint described the
// naming in prose and would have gone stale the moment either changed.
// ============================================================================

export function UnitNamingField({
  count,
  prefix,
  start,
  onChange,
}: {
  count: number;
  prefix: string;
  start: number;
  onChange: (patch: {
    count?: number;
    prefix?: string;
    start?: number;
  }) => void;
}) {
  const { t } = useStaffText("lodging");
  const preview = useMemo(
    () => generateUnits({ count, prefix, start }, "preview"),
    [count, prefix, start],
  );

  const shown = preview.slice(0, 3).map((unit) => unit.name);
  const last = preview.at(-1)?.name;

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="lodging-unit-count">
            {t("units")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lodging-unit-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(event) =>
              onChange({
                count: Math.max(
                  1,
                  Math.min(50, parseInt(event.target.value) || 1),
                ),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lodging-unit-prefix">{t("prefix")}</Label>
          <Input
            id="lodging-unit-prefix"
            value={prefix}
            placeholder={t("prefixPlaceholder")}
            onChange={(event) => onChange({ prefix: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lodging-unit-start">{t("startsAt")}</Label>
          <Input
            id="lodging-unit-start"
            type="number"
            min={0}
            value={start}
            onChange={(event) =>
              onChange({
                start: Math.max(0, parseInt(event.target.value) || 0),
              })
            }
          />
        </div>
      </div>

      {/* The real names, from the real function. */}
      <p className="text-muted-foreground text-[13.5px]">
        {preview.length === 0
          ? t("createsNone")
          : preview.length <= 3
            ? t("creates").replace("{list}", shown.join(", "))
            : t("createsMore")
                .replace("{list}", shown.join(", "))
                .replace("{last}", last ?? "")}
      </p>
    </div>
  );
}
