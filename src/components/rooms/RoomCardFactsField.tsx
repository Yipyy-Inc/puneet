"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cleanFeatures,
  MAX_DIMENSIONS_LENGTH,
  MAX_FEATURE_LENGTH,
  MAX_FEATURES,
} from "@/lib/rooms/room-facts";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// What the booking wizard's room card says about this lodging type (the
// client's mock, 2026-10-01; 20261002122808):
//
//   4 × 4 ft · pets up to 11.3 kg (25 lb)
//   [Raised bed] [Climate control] [2 potty breaks]
//
// The size words and the chips, in the facility's own words. The weight half
// of that line is not typed here: it is read from the eligibility rules below,
// which are what the booking actually enforces.
// ============================================================================

export function RoomCardFactsField({
  dimensions,
  features,
  onChange,
}: {
  dimensions: string;
  features: readonly string[];
  onChange: (patch: { dimensionsLabel?: string; features?: string[] }) => void;
}) {
  const { t, fill } = useStaffText("lodging");
  const [draft, setDraft] = useState("");
  const full = features.length >= MAX_FEATURES;

  const add = () => {
    const next = cleanFeatures([...features, draft]);
    if (next.length !== features.length) onChange({ features: next });
    setDraft("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="lodging-card-size">{t("cardSize")}</Label>
        <Input
          id="lodging-card-size"
          value={dimensions}
          maxLength={MAX_DIMENSIONS_LENGTH}
          placeholder={t("cardSizePlaceholder")}
          onChange={(event) =>
            onChange({ dimensionsLabel: event.target.value })
          }
        />
        <p className="text-meta text-ink-tertiary">{t("cardSizeHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lodging-card-feature">{t("cardFeatures")}</Label>
        <div className="flex gap-2">
          <Input
            id="lodging-card-feature"
            value={draft}
            maxLength={MAX_FEATURE_LENGTH}
            disabled={full}
            placeholder={t("cardFeaturePlaceholder")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              add();
            }}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={full || !draft.trim()}
            onClick={add}
          >
            <Plus aria-hidden className="size-4" />
            {t("cardFeatureAdd")}
          </Button>
        </div>
        <p className="text-meta text-ink-tertiary">
          {fill("cardFeaturesHint", { max: MAX_FEATURES })}
        </p>
        {features.length > 0 ? (
          <ul className="flex flex-wrap gap-2 pt-1">
            {features.map((feature) => (
              <li key={feature}>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={fill("cardFeatureRemove", { feature })}
                  onClick={() =>
                    onChange({
                      features: features.filter((f) => f !== feature),
                    })
                  }
                >
                  {feature}
                  <X aria-hidden className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
