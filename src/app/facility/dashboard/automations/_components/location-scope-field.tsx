"use client";

import { LocationScopePicker } from "@/components/hq/LocationScopePicker";
import { Label } from "@/components/ui/label";
import { useFacilityLocations } from "@/lib/api/locations";

// ============================================================================
// "Which branches does this fire for?"
//
// Shared by the rule editor and the workflow wizard, so the two cannot end up
// meaning different things by an empty selection. They already agree in the
// engine — `location_ids = '{}'` is EVERY location, never none — and this is
// what makes the screen say the same thing.
//
// ── IT HIDES ITSELF FOR A SINGLE-SITE FACILITY ────────────────────────────
//
// Most facilities have one location, and a scope picker offering exactly one
// choice is a control that can only be got wrong. Returns null until there are
// at least two, which is what the old rule modal did via `isMultiLocation`.
// ============================================================================

export function LocationScopeField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const locations = useFacilityLocations();
  const list = locations.data ?? [];

  if (list.length < 2) return null;

  return (
    <div className="space-y-2">
      <Label>Which locations?</Label>
      <LocationScopePicker locations={list} value={value} onChange={onChange} />
      <p className="text-muted-foreground text-xs">
        Leave it on <span className="font-medium">All locations</span> unless
        this should only fire for some branches. The message is stamped from the
        branch the booking belongs to either way.
      </p>
    </div>
  );
}
