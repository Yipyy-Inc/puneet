"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import type { Location, LocationWeeklyHours } from "@/types/location";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  locationDetailStore,
  useLocationPatch,
} from "@/data/location-detail-store";

const DAY_ORDER: (keyof LocationWeeklyHours)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const CAP_KEYS = ["daycare", "boarding", "grooming", "training"] as const;
const SERVICE_LABEL: Record<string, string> = {
  daycare: "Daycare",
  boarding: "Boarding",
  grooming: "Grooming",
  training: "Training",
};

interface Props {
  location: Location;
}

export function SettingsTab({ location }: Props) {
  const patch = useLocationPatch(location.id);

  const [address, setAddress] = useState(patch.address ?? location.address);
  const [phone, setPhone] = useState(patch.phone ?? location.phone);
  const [capacity, setCapacity] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const k of CAP_KEYS) {
      const v = patch.capacity?.[k] ?? location.capacity[k];
      if (v !== undefined) base[k] = v;
    }
    return base;
  });
  const [approval, setApproval] = useState<"auto" | "manual">(
    patch.bookingApprovalMode ?? "auto",
  );
  const [override, setOverride] = useState(
    patch.overrideFacilityDefaults ?? false,
  );
  const [availability, setAvailability] = useState<Record<string, boolean>>(
    () => {
      const base: Record<string, boolean> = {};
      for (const s of location.services)
        base[s] = patch.serviceAvailability?.[s] ?? true;
      return base;
    },
  );

  function save() {
    locationDetailStore.setPatch(location.id, {
      address,
      phone,
      capacity,
      bookingApprovalMode: approval,
      overrideFacilityDefaults: override,
      serviceAvailability: availability,
    });
    toast.success("Location settings saved");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border p-4">
        <div>
          <Label className="text-sm font-semibold">
            Override facility defaults
          </Label>
          <p className="text-muted-foreground text-xs">
            Apply these settings to this location only, ignoring facility-wide
            defaults.
          </p>
        </div>
        <Switch checked={override} onCheckedChange={setOverride} />
      </div>

      {/* Address + phone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="loc-address">Address</Label>
          <Input
            id="loc-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-phone">Phone</Label>
          <Input
            id="loc-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Booking approval mode */}
      <div className="space-y-1.5">
        <Label>Booking approval</Label>
        <Select
          value={approval}
          onValueChange={(v) => setApproval(v as "auto" | "manual")}
        >
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-approve bookings</SelectItem>
            <SelectItem value="manual">Require manual approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Capacity */}
      <div className="space-y-1.5">
        <Label>Capacity</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CAP_KEYS.filter(
            (k) => capacity[k] !== undefined || location.services.includes(k),
          ).map((k) => (
            <div key={k} className="space-y-1">
              <p className="text-muted-foreground text-[11px] capitalize">
                {SERVICE_LABEL[k]}
              </p>
              <Input
                type="number"
                min={0}
                value={capacity[k] ?? 0}
                onChange={(e) =>
                  setCapacity((c) => ({ ...c, [k]: Number(e.target.value) }))
                }
                className="h-9"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Service availability */}
      <div className="space-y-2">
        <Label>Service availability</Label>
        <p className="text-muted-foreground text-xs">
          Which services can be booked at this location.
        </p>
        <div className="divide-y rounded-xl border">
          {location.services.map((s) => (
            <div
              key={s}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-sm">{SERVICE_LABEL[s] ?? s}</span>
              <Switch
                checked={availability[s] ?? true}
                onCheckedChange={(v) =>
                  setAvailability((a) => ({ ...a, [s]: v }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Hours (read-only) */}
      <div className="space-y-1.5">
        <Label>Operating hours</Label>
        <ul className="divide-y rounded-xl border text-sm">
          {DAY_ORDER.map((day) => {
            const h = location.hours[day];
            return (
              <li key={day} className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground capitalize">{day}</span>
                <span className={h.closed ? "text-muted-foreground" : ""}>
                  {h.closed ? "Closed" : `${h.open} – ${h.close}`}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground text-[11px]">
          Edit hours in the facility scheduling settings.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} className="gap-1.5">
          <Save className="size-4" />
          Save settings
        </Button>
      </div>
    </div>
  );
}
