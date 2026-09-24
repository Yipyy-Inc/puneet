"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// SPACE TYPE — the question MoéGo asks about every lodging type, and the one
// everything else about capacity follows from.
//
// Its own words, which are the copy below almost verbatim because they say it
// better than a paraphrase would:
//
//   Room / Kennel — "Capacity is based on individual rooms. Once a pet (or pet
//                    family) is assigned to a lodging, it is considered fully
//                    occupied. (Only one family per room)"
//   Area          — "Capacity is based on the number of pets. An area remains
//                    available until the number of assigned pets reaches the
//                    maximum limit."
//
// ── ONE NUMBER FIELD, TWO MEANINGS, BECAUSE THAT IS WHAT IT IS ────────────
//
// MoéGo shows a single "Max # of pets" whose LABEL changes with the space
// type, and so does this: for a room it is "Max # of Pets (same family) per
// room" and writes `defaultCapacity`; for an area it is "Max # of pets per
// area" and writes `maxPetsPerArea`. Two columns, because the database refuses
// a room that carries an area's maximum — one meaning per stored value.
//
// The choice is a 2px ring and a step of ink, never an edge accent and never a
// tint fill (§6 rules 1 and 2).
// ============================================================================

export type SpaceType = "room" | "area";

/** The two options, in the viewer's language. */
function options(t: (key: string) => string) {
  return [
    { value: "room" as const, label: t("room"), blurb: t("roomBlurb") },
    { value: "area" as const, label: t("area"), blurb: t("areaBlurb") },
  ];
}

export function SpaceTypeField({
  spaceType,
  maxPetsPerArea,
  defaultCapacity,
  onChange,
}: {
  spaceType: SpaceType;
  maxPetsPerArea: number | undefined;
  defaultCapacity: number;
  onChange: (patch: {
    spaceType?: SpaceType;
    maxPetsPerArea?: number | undefined;
    defaultCapacity?: number;
  }) => void;
}) {
  const { t } = useStaffText("lodging");
  const isArea = spaceType === "area";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("spaceType")}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {options(t).map((option) => {
            const chosen = option.value === spaceType;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={chosen}
                onClick={() =>
                  onChange(
                    option.value === "area"
                      ? {
                          spaceType: "area",
                          // Seeded from the room capacity so the number is a
                          // guess the facility can correct, not a blank they
                          // must fill before the form will save.
                          maxPetsPerArea: maxPetsPerArea ?? defaultCapacity,
                        }
                      : { spaceType: "room", maxPetsPerArea: undefined },
                  )
                }
                className={cn(
                  "bg-card min-h-10 rounded-2xl border p-3 text-left max-lg:min-h-12",
                  "transition-[box-shadow,border-color] duration-150",
                  chosen
                    ? "border-transparent shadow-[inset_0_0_0_2px_var(--primary)]"
                    : "border-(--line) hover:border-(--line-strong)",
                )}
              >
                <span className="block text-[14.5px] font-semibold">
                  {option.label}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-[13.5px]">
                  {option.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lodging-max-pets">
          {isArea ? t("maxPerArea") : t("maxPerRoom")}
        </Label>
        <Input
          id="lodging-max-pets"
          type="number"
          min={1}
          value={isArea ? (maxPetsPerArea ?? 1) : defaultCapacity}
          onChange={(event) => {
            const next = Math.max(1, parseInt(event.target.value) || 1);
            onChange(
              isArea ? { maxPetsPerArea: next } : { defaultCapacity: next },
            );
          }}
        />
        <p className="text-muted-foreground text-[13.5px]">
          {isArea ? t("maxPerAreaHint") : t("maxPerRoomHint")}
        </p>
      </div>
    </div>
  );
}
