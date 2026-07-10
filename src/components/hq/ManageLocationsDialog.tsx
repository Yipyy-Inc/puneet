"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { locationStyles } from "@/lib/hq/location-styles";
import type { Location } from "@/types/location";

interface Props {
  member: {
    name: string;
    assignedLocations: string[];
    primaryLocation: string;
  };
  locations: Location[];
  onOpenChange: (open: boolean) => void;
  onSave: (assignedLocations: string[], primaryLocationId: string) => void;
}

/**
 * Edit which network locations a staff member is assigned to, plus their home
 * (primary) location. The home selector is scoped to the checked locations.
 */
export function ManageLocationsDialog({
  member,
  locations,
  onOpenChange,
  onSave,
}: Props) {
  const [open, setOpen] = useState(true);
  const [assigned, setAssigned] = useState<string[]>(member.assignedLocations);
  const [home, setHome] = useState(member.primaryLocation);

  // Home must be one of the assigned locations; fall back to the first checked.
  const effectiveHome = assigned.includes(home) ? home : (assigned[0] ?? "");
  const canSave = assigned.length > 0;

  function close(next: boolean) {
    setOpen(next);
    if (!next) onOpenChange(false);
  }

  function toggle(id: string) {
    setAssigned((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function save() {
    if (!canSave) return;
    onSave(assigned, effectiveHome);
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Locations {member.name} is assigned to</DialogTitle>
          <DialogDescription>
            Choose the network locations this staff member works at, and set
            their home location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Assigned locations</Label>
            <div className="divide-y rounded-xl border">
              {locations.map((loc) => {
                const s = locationStyles(loc);
                const checked = assigned.includes(loc.id);
                const isHome = checked && loc.id === effectiveHome;
                return (
                  <label
                    key={loc.id}
                    className="hover:bg-muted/40 flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(loc.id)}
                    />
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white",
                        s.bg,
                      )}
                    >
                      {loc.shortCode}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {loc.name}
                    </span>
                    {isHome && (
                      <span className="rounded-full bg-sky-50 px-1.5 py-px text-[10px] font-semibold text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                        Home
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Home location</Label>
            {assigned.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Select at least one location first.
              </p>
            ) : (
              <Select value={effectiveHome} onValueChange={setHome}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => assigned.includes(l.id))
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Save assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
