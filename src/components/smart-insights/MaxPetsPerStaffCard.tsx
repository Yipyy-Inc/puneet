"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  facilityId: number;
  service: "daycare" | "boarding";
  defaultValue?: number;
}

const DEFAULT_MAX_PETS = 12;

function storageKey(facilityId: number, service: string): string {
  return `yipyy:max-pets-per-staff:${facilityId}:${service}`;
}

export function getMaxPetsPerStaff(
  facilityId: number,
  service: "daycare" | "boarding",
): number {
  if (typeof window === "undefined") return DEFAULT_MAX_PETS;
  try {
    const raw = window.localStorage.getItem(storageKey(facilityId, service));
    if (!raw) return DEFAULT_MAX_PETS;
    const num = parseFloat(raw);
    return Number.isFinite(num) && num > 0 ? num : DEFAULT_MAX_PETS;
  } catch {
    return DEFAULT_MAX_PETS;
  }
}

/**
 * Spec § Insight 3.1 dependency — a per-facility, per-service `Max pets per
 * staff member` field. Insight 3.1 (Understaffing Risk) uses this to compute
 * capacity (staff_count × max_pets_per_staff) and detect shortfalls.
 */
export function MaxPetsPerStaffCard({ facilityId, service, defaultValue }: Props) {
  const [value, setValue] = useState<number>(defaultValue ?? DEFAULT_MAX_PETS);
  const [initial, setInitial] = useState<number>(DEFAULT_MAX_PETS);

  useEffect(() => {
    const stored = getMaxPetsPerStaff(facilityId, service);
    setValue(stored);
    setInitial(stored);
  }, [facilityId, service]);

  const dirty = value !== initial;

  const handleSave = () => {
    if (typeof window === "undefined") return;
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a positive number");
      return;
    }
    window.localStorage.setItem(storageKey(facilityId, service), String(value));
    setInitial(value);
    toast.success(`Max pets per staff updated`);
  };

  const handleReset = () => {
    setValue(initial);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-purple-500" />
          Max pets per staff member
        </CardTitle>
        <CardDescription>
          Smart Insights uses this to detect understaffed days — when the
          confirmed pet count exceeds (scheduled staff × this number),
          an Understaffing Risk insight fires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor={`mpps-${service}`}>Max pets per staff</Label>
            <Input
              id={`mpps-${service}`}
              type="number"
              min={1}
              step={1}
              value={Number.isFinite(value) ? value : ""}
              onChange={(e) => setValue(parseInt(e.target.value, 10))}
              className="w-32"
            />
          </div>
          <div className="flex gap-2">
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!dirty}
            >
              Save
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Default: {DEFAULT_MAX_PETS}. Industry guidance varies — many
          facilities run 10–15 dogs per staff member for daycare and slightly
          higher for boarding (where pets are kennelled overnight).
        </p>
      </CardContent>
    </Card>
  );
}
