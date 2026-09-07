"use client";

import { useCallback, useState } from "react";
import { RotateCcw, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
import {
  BRAND_COLOR_PALETTE,
  EMPTY_COLOR_OVERRIDES,
  STATUS_COLOR_MAP,
} from "@/lib/operations-calendar";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import { useSettingsText } from "@/lib/settings/use-settings-text";

/**
 * A calendar status's name, in the viewer's language.
 *
 * `STATUS_COLOR_MAP` is keyed by the ENGLISH status word, and that key is also
 * what an override is stored under — so the key travels and only the label is
 * translated. A status the catalogue does not know keeps the map's own word
 * rather than showing a raw key.
 */
function useCalendarStatusLabel(): (status: string) => string {
  const t = useSettingsText().section("booking-statuses");
  return (status: string) => {
    // french-ok: a catalogue key built from the map's own English key
    const key = `calStatus_${status}`;
    const label = t(key);
    return label === key ? status : label;
  };
}

function StatusColorRow({
  label,
  currentColor,
  defaultColor,
  onColorChange,
  onReset,
  hasOverride,
}: {
  label: string;
  currentColor: string;
  defaultColor: string;
  onColorChange: (hex: string) => void;
  onReset: () => void;
  hasOverride: boolean;
}) {
  const t = useSettingsText().section("booking-statuses");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-100 p-3">
      {/* Collapsed row: name · current colour · edit pencil */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="size-3.5 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: currentColor }}
          />
          {/* `capitalize` title-cased the translated label — "En Attente"
              rather than "En attente". §5q is sentence case everywhere, and
              the catalogue already carries the right casing for both
              languages, so the CSS was only able to make it wrong. */}
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasOverride && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-6 gap-1 px-2 text-xs text-slate-400 hover:text-slate-600"
            >
              <RotateCcw className="size-3" />
              {t("reset")}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={t(
              expanded ? "closeColourPickerNamed" : "editColourNamed",
            ).replace("{name}", label)}
            className={cn(
              "size-6 p-0",
              expanded
                ? "text-slate-700"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded: full swatch picker for this status only */}
      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2.5">
          <RateColorPicker
            value={currentColor}
            onChange={onColorChange}
            label=""
          />
          <p className="px-0.5 text-[10px] text-slate-400">
            {t("defaultIs")}{" "}
            <span className="font-semibold">
              {BRAND_COLOR_PALETTE.find((c) => c.hex === defaultColor)?.name ??
                defaultColor}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export function StatusColorSettings() {
  const t = useSettingsText().section("booking-statuses");
  const statusLabel = useCalendarStatusLabel();
  const { serviceColorOverrides, updateServiceColorOverrides } = useSettings();

  const statusEntries = Object.entries(STATUS_COLOR_MAP).map(
    ([status, color]) => ({
      key: status,
      label: statusLabel(status),
      defaultColor: color,
    }),
  );

  const overrideCount = Object.keys(serviceColorOverrides.statuses).length;

  const updateStatusColor = useCallback(
    (statusLabel: string, hex: string) => {
      updateServiceColorOverrides({
        ...serviceColorOverrides,
        statuses: { ...serviceColorOverrides.statuses, [statusLabel]: hex },
      });
    },
    [serviceColorOverrides, updateServiceColorOverrides],
  );

  const resetStatusColor = useCallback(
    (statusLabel: string) => {
      const next = { ...serviceColorOverrides.statuses };
      delete next[statusLabel];
      updateServiceColorOverrides({ ...serviceColorOverrides, statuses: next });
    },
    [serviceColorOverrides, updateServiceColorOverrides],
  );

  const resetAll = useCallback(() => {
    updateServiceColorOverrides({
      ...serviceColorOverrides,
      statuses: EMPTY_COLOR_OVERRIDES.statuses,
    });
  }, [serviceColorOverrides, updateServiceColorOverrides]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("coloursTitle")}</CardTitle>
            <CardDescription>{t("coloursHelp")}</CardDescription>
          </div>
          {overrideCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              className="h-8 gap-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="size-3" />
              {t("resetAll")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusEntries.map((entry) => {
          const overridden = serviceColorOverrides.statuses[entry.key];
          return (
            <StatusColorRow
              key={entry.key}
              label={entry.label}
              currentColor={overridden ?? entry.defaultColor}
              defaultColor={entry.defaultColor}
              hasOverride={Boolean(overridden)}
              onColorChange={(hex) => updateStatusColor(entry.key, hex)}
              onReset={() => resetStatusColor(entry.key)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
