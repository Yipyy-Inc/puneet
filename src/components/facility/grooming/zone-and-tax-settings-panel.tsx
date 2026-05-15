"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPinned, Receipt, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import type { TravelZone, ZipTaxRate } from "@/types/grooming";

/**
 * Zone-based pricing + ZIP-code tax settings. Rendered inside the mobile-
 * grooming settings page. Both tables are facility-level config; the
 * booking dialog reads them through the same context.
 */
export function ZoneAndTaxSettingsPanel() {
  const {
    travelZones,
    zipTaxRates,
    upsertTravelZone,
    deleteTravelZone,
    upsertZipTaxRate,
    deleteZipTaxRate,
    setDefaultZipTaxRate,
  } = useMobileGrooming();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TravelZonesCard
        zones={travelZones}
        onUpsert={upsertTravelZone}
        onDelete={deleteTravelZone}
      />
      <ZipTaxCard
        rates={zipTaxRates}
        onUpsert={upsertZipTaxRate}
        onDelete={deleteZipTaxRate}
        onSetDefault={setDefaultZipTaxRate}
      />
    </div>
  );
}

// ─── Travel zones ────────────────────────────────────────────────────────────

function TravelZonesCard({
  zones,
  onUpsert,
  onDelete,
}: {
  zones: TravelZone[];
  onUpsert: (zone: TravelZone) => void;
  onDelete: (id: string) => void;
}) {
  const sorted = [...zones].sort((a, b) => a.maxMiles - b.maxMiles);

  function addZone() {
    const nextMax =
      sorted.length === 0
        ? 5
        : Math.max(...sorted.map((z) => z.maxMiles)) + 10;
    const next: TravelZone = {
      id: `zone-${Date.now()}`,
      label: `Zone ${sorted.length + 1}`,
      maxMiles: nextMax,
      surchargeMode: "flat",
      surchargeAmount: 10,
      active: true,
    };
    onUpsert(next);
    toast.success(`${next.label} added`);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPinned className="size-4 text-sky-600" />
          Travel Zones
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Distance from the facility base · adds a surcharge as its own
          invoice line. Tightest matching zone wins.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && (
          <p className="rounded-md border border-dashed bg-muted/10 px-3 py-3 text-center text-xs text-muted-foreground">
            No zones configured.
          </p>
        )}
        {sorted.map((zone) => (
          <TravelZoneRow
            key={zone.id}
            zone={zone}
            onChange={onUpsert}
            onDelete={onDelete}
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full text-xs"
          onClick={addZone}
        >
          <Plus className="mr-1.5 size-3" />
          Add zone
        </Button>
      </CardContent>
    </Card>
  );
}

function TravelZoneRow({
  zone,
  onChange,
  onDelete,
}: {
  zone: TravelZone;
  onChange: (zone: TravelZone) => void;
  onDelete: (id: string) => void;
}) {
  function patch(p: Partial<TravelZone>) {
    onChange({ ...zone, ...p });
  }
  return (
    <div className="rounded-md border bg-card px-2.5 py-2">
      <div className="flex items-center gap-2">
        <Input
          value={zone.label}
          onChange={(e) => patch({ label: e.target.value })}
          className="h-7 flex-1 text-xs font-semibold"
        />
        <button
          type="button"
          onClick={() => {
            if (zones_confirm(`Delete ${zone.label}?`)) {
              onDelete(zone.id);
              toast.success(`${zone.label} removed`);
            }
          }}
          className="text-destructive hover:text-destructive/80 shrink-0"
          aria-label="Delete zone"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 items-end gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Max miles
          </Label>
          <Input
            type="number"
            min={0}
            value={zone.maxMiles}
            onChange={(e) =>
              patch({ maxMiles: Math.max(0, Number(e.target.value) || 0) })
            }
            className="mt-0.5 h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Mode
          </Label>
          <Select
            value={zone.surchargeMode}
            onValueChange={(v) =>
              patch({ surchargeMode: v as TravelZone["surchargeMode"] })
            }
          >
            <SelectTrigger className="mt-0.5 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat" className="text-xs">
                Flat $
              </SelectItem>
              <SelectItem value="percent" className="text-xs">
                Percent
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {zone.surchargeMode === "flat" ? "Amount $" : "Amount %"}
          </Label>
          <Input
            type="number"
            min={0}
            step={zone.surchargeMode === "flat" ? 0.5 : 0.1}
            value={zone.surchargeAmount}
            onChange={(e) =>
              patch({
                surchargeAmount: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="mt-0.5 h-7 text-xs"
          />
        </div>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={zone.active}
          onChange={(e) => patch({ active: e.target.checked })}
        />
        Active
      </label>
    </div>
  );
}

// ─── ZIP tax rates ───────────────────────────────────────────────────────────

function ZipTaxCard({
  rates,
  onUpsert,
  onDelete,
  onSetDefault,
}: {
  rates: ZipTaxRate[];
  onUpsert: (rate: ZipTaxRate) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const sorted = [...rates].sort(
    (a, b) => b.prefix.length - a.prefix.length || a.prefix.localeCompare(b.prefix),
  );

  function addRate() {
    const next: ZipTaxRate = {
      id: `zip-tax-${Date.now()}`,
      prefix: "",
      ratePercent: 0,
      label: "New rule",
      isDefault: false,
    };
    onUpsert(next);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="size-4 text-emerald-600" />
          ZIP / Postal Tax Rates
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Per-prefix tax that auto-applies based on the client&apos;s
          postal code. Longest-prefix wins. Star to mark the default fallback.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && (
          <p className="rounded-md border border-dashed bg-muted/10 px-3 py-3 text-center text-xs text-muted-foreground">
            No tax rates configured.
          </p>
        )}
        {sorted.map((rate) => (
          <ZipTaxRow
            key={rate.id}
            rate={rate}
            onChange={onUpsert}
            onDelete={onDelete}
            onSetDefault={onSetDefault}
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full text-xs"
          onClick={addRate}
        >
          <Plus className="mr-1.5 size-3" />
          Add tax rate
        </Button>
      </CardContent>
    </Card>
  );
}

function ZipTaxRow({
  rate,
  onChange,
  onDelete,
  onSetDefault,
}: {
  rate: ZipTaxRate;
  onChange: (rate: ZipTaxRate) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  function patch(p: Partial<ZipTaxRate>) {
    onChange({ ...rate, ...p });
  }
  return (
    <div className="rounded-md border bg-card px-2.5 py-2">
      <div className="flex items-center gap-2">
        <Input
          value={rate.label}
          onChange={(e) => patch({ label: e.target.value })}
          className="h-7 flex-1 text-xs font-semibold"
          placeholder="Jurisdiction label"
        />
        {rate.isDefault && (
          <Badge
            variant="secondary"
            className="gap-1 border-0 bg-amber-100 text-[10px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <Star className="size-2.5" />
            Default
          </Badge>
        )}
        <button
          type="button"
          onClick={() => onSetDefault(rate.id)}
          title="Mark as default fallback"
          aria-label="Mark default"
          className="text-muted-foreground hover:text-amber-600 shrink-0"
        >
          <Star className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (zones_confirm(`Delete tax rule "${rate.label}"?`)) {
              onDelete(rate.id);
              toast.success(`${rate.label} removed`);
            }
          }}
          className="text-destructive hover:text-destructive/80 shrink-0"
          aria-label="Delete rule"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 items-end gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Postal / ZIP prefix
          </Label>
          <Input
            value={rate.prefix}
            onChange={(e) =>
              patch({ prefix: e.target.value.toUpperCase().replace(/\s+/g, "") })
            }
            className="mt-0.5 h-7 text-xs"
            placeholder="H3A, M5V, 90210…"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Rate %
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.001}
            value={rate.ratePercent}
            onChange={(e) =>
              patch({ ratePercent: Math.max(0, Number(e.target.value) || 0) })
            }
            className="mt-0.5 h-7 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// Small wrapper around window.confirm so tests/Storybook can stub it later.
function zones_confirm(msg: string): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(msg);
}
