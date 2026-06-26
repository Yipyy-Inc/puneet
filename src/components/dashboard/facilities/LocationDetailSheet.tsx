"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building,
  Clock,
  Layers,
  MapPin,
  Pencil,
  Phone,
  Users,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { facilityStaff, FACILITY_LOCATIONS } from "@/data/facility-staff";
import { users } from "@/data/users";

// facility-staff.ts holds facility 11's multi-location staff (keyed by
// loc-mtl-* locations); other facilities draw staff from users.ts by name.
const FACILITY_STAFF_FACILITY_ID = 11;

const STANDARD_HOURS: { day: string; hours: string }[] = [
  { day: "Monday", hours: "8:00 AM – 6:00 PM" },
  { day: "Tuesday", hours: "8:00 AM – 6:00 PM" },
  { day: "Wednesday", hours: "8:00 AM – 6:00 PM" },
  { day: "Thursday", hours: "8:00 AM – 6:00 PM" },
  { day: "Friday", hours: "8:00 AM – 6:00 PM" },
  { day: "Saturday", hours: "9:00 AM – 4:00 PM" },
  { day: "Sunday", hours: "Closed" },
];

interface AssignedStaff {
  name: string;
  role: string;
}

function getLocationStaff(
  facilityId: number,
  facilityName: string,
  locationIndex: number,
  totalLocations: number,
): AssignedStaff[] {
  if (facilityId === FACILITY_STAFF_FACILITY_ID) {
    // Single location → all staff work there; multiple → match by location.
    let assigned = facilityStaff;
    if (totalLocations > 1) {
      const locId = FACILITY_LOCATIONS[locationIndex]?.id;
      assigned = locId
        ? facilityStaff.filter((s) => s.assignedLocations.includes(locId))
        : [];
    }
    return assigned.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      role: s.primaryRole,
    }));
  }

  const staff = users.filter((u) => u.facility === facilityName);
  if (totalLocations <= 1 || locationIndex === 0) {
    return staff.map((u) => ({ name: u.name, role: u.role }));
  }
  return [];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
        <Icon className="size-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}

export interface LocationDetail {
  id: string;
  name: string;
  address: string;
  services: string[];
  phone: string;
}

export interface LocationDetailSheetProps {
  location: LocationDetail;
  locationIndex: number;
  totalLocations: number;
  facilityId: number;
  facilityName: string;
  onClose: () => void;
  onEdit: () => void;
}

export function LocationDetailSheet({
  location,
  locationIndex,
  totalLocations,
  facilityId,
  facilityName,
  onClose,
  onEdit,
}: LocationDetailSheetProps) {
  const staff = getLocationStaff(
    facilityId,
    facilityName,
    locationIndex,
    totalLocations,
  );

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Building className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-lg">{location.name}</SheetTitle>
                <SheetDescription>Location details</SheetDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <Section icon={MapPin} title="Address">
            <p className="text-sm">{location.address}</p>
          </Section>

          <Section icon={Phone} title="Phone">
            <p className="text-sm">{location.phone || "—"}</p>
          </Section>

          <Section icon={Clock} title="Operating hours">
            <ul className="space-y-1 text-sm">
              {STANDARD_HOURS.map((h) => (
                <li key={h.day} className="flex justify-between">
                  <span className="text-muted-foreground">{h.day}</span>
                  <span
                    className={
                      h.hours === "Closed" ? "text-muted-foreground" : ""
                    }
                  >
                    {h.hours}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1.5 text-[11px]">
              Standard schedule
            </p>
          </Section>

          <Section icon={Layers} title="Services offered">
            {location.services.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No services configured.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {location.services.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </Section>

          <Section icon={Users} title={`Staff assigned (${staff.length})`}>
            {staff.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No staff assigned to this location.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {staff.map((s, i) => (
                  <li
                    key={`${s.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {initials(s.name)}
                      </span>
                      {s.name}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {s.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
