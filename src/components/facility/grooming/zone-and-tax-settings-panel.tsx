"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MapPinned, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import type { TravelZone } from "@/types/grooming";

/**
 * Zone-based travel pricing. Rendered inside the mobile-grooming settings
 * page; the booking dialog reads the zones through the same context.
 */
export function ZoneAndTaxSettingsPanel() {
  const { travelZones, upsertTravelZone, deleteTravelZone } =
    useMobileGrooming();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TravelZonesCard
        zones={travelZones}
        onUpsert={upsertTravelZone}
        onDelete={deleteTravelZone}
      />
      {/* The ZIP / postal tax-rate card is gone. Its rates were never the
          facility’s tax: they sat in this browser’s localStorage, defaulted
          to Québec’s 14.975% and were added to every booking form total
          and grooming payment. Tax comes from the facility’s tax settings. */}
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
  onUpsert: (zone: TravelZone) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const sorted = [...zones].sort((a, b) => a.maxMiles - b.maxMiles);

  async function addZone() {
    const nextMax =
      sorted.length === 0 ? 5 : Math.max(...sorted.map((z) => z.maxMiles)) + 10;
    const next: TravelZone = {
      id: `zone-${Date.now()}`,
      label: `Zone ${sorted.length + 1}`,
      maxMiles: nextMax,
      surchargeMode: "flat",
      surchargeAmount: 10,
      active: true,
    };
    try {
      await onUpsert(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }
    toast.success(`${next.label} added`);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPinned className="size-4 text-sky-600" />
          Travel Zones
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Distance from the facility base · adds a surcharge as its own invoice
          line. Tightest matching zone wins.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && (
          <p className="bg-muted/10 text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center text-xs">
            No zones configured.
          </p>
        )}
        {sorted.map((zone) => (
          <TravelZoneRow
            // Remounted when the saved zone changes, so the row's draft is
            // the saved value until somebody edits it.
            key={`${zone.id}:${JSON.stringify(zone)}`}
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
  onChange: (zone: TravelZone) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  // Typing edits a draft and leaving the field saves it; a pick saves at
  // once. Every keystroke was a localStorage write, and would be a settings
  // save now.
  const [draft, setDraft] = useState(zone);
  function commit(next: TravelZone) {
    if (JSON.stringify(next) === JSON.stringify(zone)) return;
    onChange(next).catch((error: unknown) => {
      setDraft(zone);
      toast.error(error instanceof Error ? error.message : String(error));
    });
  }
  function edit(p: Partial<TravelZone>) {
    setDraft((d) => ({ ...d, ...p }));
  }
  function patch(p: Partial<TravelZone>) {
    const next = { ...draft, ...p };
    setDraft(next);
    commit(next);
  }
  return (
    <div className="bg-card rounded-md border px-2.5 py-2">
      <div className="flex items-center gap-2">
        <Input
          value={draft.label}
          onChange={(e) => edit({ label: e.target.value })}
          onBlur={() => commit(draft)}
          className="h-7 flex-1 text-xs font-semibold"
        />
        <button
          type="button"
          onClick={() => {
            if (!zones_confirm(`Delete ${zone.label}?`)) return;
            onDelete(zone.id)
              .then(() => toast.success(`${zone.label} removed`))
              .catch((error: unknown) =>
                toast.error(
                  error instanceof Error ? error.message : String(error),
                ),
              );
          }}
          className="text-destructive hover:text-destructive/80 shrink-0"
          aria-label="Delete zone"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 items-end gap-2">
        <div>
          <Label className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Max miles
          </Label>
          <Input
            type="number"
            min={0}
            value={draft.maxMiles}
            onChange={(e) =>
              edit({ maxMiles: Math.max(0, Number(e.target.value) || 0) })
            }
            onBlur={() => commit(draft)}
            className="mt-0.5 h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Mode
          </Label>
          <Select
            value={draft.surchargeMode}
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
          <Label className="text-muted-foreground text-[10px] tracking-wide uppercase">
            {draft.surchargeMode === "flat" ? "Amount $" : "Amount %"}
          </Label>
          <Input
            type="number"
            min={0}
            step={draft.surchargeMode === "flat" ? 0.5 : 0.1}
            value={draft.surchargeAmount}
            onChange={(e) =>
              edit({
                surchargeAmount: Math.max(0, Number(e.target.value) || 0),
              })
            }
            onBlur={() => commit(draft)}
            className="mt-0.5 h-7 text-xs"
          />
        </div>
      </div>
      <label className="text-muted-foreground mt-2 flex items-center gap-2 text-[11px]">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => patch({ active: e.target.checked })}
        />
        Active
      </label>
    </div>
  );
}

function zones_confirm(msg: string): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(msg);
}
