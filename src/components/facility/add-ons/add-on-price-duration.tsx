"use client";

import { DollarSign } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceTaxToggle } from "@/components/facility/pricing/service-tax-toggle";

import type { AddOnDraft, OverrideDraft } from "./add-on-draft";
import { AddOnSection } from "./add-on-section";

const NO_OVERRIDE: OverrideDraft = { price: "", duration: "", tax: "same" };

/**
 * Price & duration — the price, whether tax applies, the minutes it adds to
 * the appointment, and "override by business": a different price, tax or
 * duration at one location. A box left empty keeps the add-on's own value.
 */
export function AddOnPriceDuration({
  index,
  draft,
  patch,
  locations,
  t,
}: {
  index: number;
  draft: AddOnDraft;
  patch: (next: Partial<AddOnDraft>) => void;
  /** More than one, or the override is not offered. */
  locations: { id: string; name: string }[];
  t: (key: string) => string;
}) {
  const setOverride = (locationId: string, next: Partial<OverrideDraft>) =>
    patch({
      overrides: {
        ...draft.overrides,
        [locationId]: {
          ...(draft.overrides[locationId] ?? NO_OVERRIDE),
          ...next,
        },
      },
    });
  const fill = (key: string, location: string) =>
    t(key).replace("{location}", location);

  return (
    <AddOnSection index={index} title={t("secPriceDuration")}>
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="add-on-price">{t("fieldPrice")}</Label>
          <div className="relative w-44">
            <DollarSign
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="add-on-price"
              inputMode="decimal"
              className="pl-9 tabular-nums"
              value={draft.price}
              placeholder="0.00"
              onChange={(e) => patch({ price: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-on-duration">{t("fieldDuration")}</Label>
          <Input
            id="add-on-duration"
            inputMode="numeric"
            className="w-44 tabular-nums"
            value={draft.duration}
            placeholder={t("durationPlaceholder")}
            onChange={(e) => patch({ duration: e.target.value })}
          />
        </div>
      </div>
      <p className="text-muted-foreground -mt-2 text-[13.5px]">
        {t("durationHint")}
      </p>

      <ServiceTaxToggle
        taxable={draft.taxable}
        onChange={(taxable) => patch({ taxable })}
      />

      {locations.length > 1 ? (
        <div className="space-y-3">
          <label className="flex min-h-10 items-center gap-3 max-lg:min-h-12">
            <Checkbox
              checked={draft.overrideByLocation}
              onCheckedChange={(v) => patch({ overrideByLocation: Boolean(v) })}
            />
            <span className="text-[14.5px] font-medium">
              {t("overrideByLocation")}
            </span>
          </label>

          {draft.overrideByLocation ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-[13.5px]">
                {t("overrideHint")}
              </p>
              {locations.map((location) => {
                const o = draft.overrides[location.id] ?? NO_OVERRIDE;
                return (
                  <div
                    key={location.id}
                    className="space-y-2 rounded-2xl border border-(--line) p-3"
                  >
                    <p className="text-[15px] font-semibold">{location.name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-36">
                        <DollarSign
                          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                          aria-hidden
                        />
                        <Input
                          aria-label={fill("overridePrice", location.name)}
                          inputMode="decimal"
                          className="pl-9 tabular-nums"
                          value={o.price}
                          placeholder={draft.price || "0.00"}
                          onChange={(e) =>
                            setOverride(location.id, { price: e.target.value })
                          }
                        />
                      </div>
                      <Input
                        aria-label={fill("overrideDuration", location.name)}
                        inputMode="numeric"
                        className="w-28 tabular-nums"
                        value={o.duration}
                        placeholder={draft.duration || t("durationPlaceholder")}
                        onChange={(e) =>
                          setOverride(location.id, {
                            duration: e.target.value,
                          })
                        }
                      />
                      <Select
                        value={o.tax}
                        onValueChange={(tax) =>
                          setOverride(location.id, {
                            tax: tax as OverrideDraft["tax"],
                          })
                        }
                      >
                        <SelectTrigger
                          className="w-48"
                          aria-label={fill("overrideTax", location.name)}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same">
                            {t("overrideTaxSame")}
                          </SelectItem>
                          <SelectItem value="on">
                            {t("overrideTaxOn")}
                          </SelectItem>
                          <SelectItem value="off">
                            {t("overrideTaxOff")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </AddOnSection>
  );
}
