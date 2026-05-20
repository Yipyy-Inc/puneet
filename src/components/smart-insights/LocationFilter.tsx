"use client";

import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  locations: LocationOption[];
}

const ALL = "__all__";

/**
 * Spec § 10.5 — HQ-only Location filter for the Smart Insights page. Lets the
 * manager view insights for one location at a time, or all combined.
 */
export function LocationFilter({ value, onChange, locations }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="loc-filter" className="text-muted-foreground text-xs uppercase tracking-wide">
        <MapPin className="mr-1 inline size-3.5" />
        Location
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="loc-filter" className="h-8 min-w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const LOCATION_FILTER_ALL = ALL;
