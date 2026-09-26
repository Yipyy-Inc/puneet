"use client";

import { Checkbox } from "@/components/ui/checkbox";

import type { AddOnDraft } from "./add-on-draft";
import { AddOnSection } from "./add-on-section";

/**
 * 2 · Locations — which of the facility's locations offer the add-on. Every
 * box ticked is stored as NO restriction (the empty list), so a location added
 * next year offers it too, the way every other menu here behaves.
 */
export function AddOnLocations({
  draft,
  patch,
  locations,
  t,
}: {
  draft: AddOnDraft;
  patch: (next: Partial<AddOnDraft>) => void;
  locations: { id: string; name: string }[];
  t: (key: string) => string;
}) {
  const all = locations.map((l) => l.id);
  const current = draft.locationIds.length === 0 ? all : draft.locationIds;

  return (
    <AddOnSection
      index={2}
      title={t("secLocations")}
      hint={t("secLocationsHint")}
    >
      <div className="space-y-1">
        {locations.map((location) => (
          <label
            key={location.id}
            className="flex min-h-10 items-center gap-3 max-lg:min-h-12"
          >
            <Checkbox
              checked={current.includes(location.id)}
              onCheckedChange={() => {
                const next = current.includes(location.id)
                  ? current.filter((id) => id !== location.id)
                  : [...current, location.id];
                patch({ locationIds: next.length === all.length ? [] : next });
              }}
            />
            <span className="text-[14.5px]">{location.name}</span>
          </label>
        ))}
      </div>
    </AddOnSection>
  );
}
