import { Building2, MapPin, Users, UserCheck, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminFacilityRow } from "@/types/admin-facility";
import { FacilityWebAddress } from "./facility-web-address";

// ============================================================================
// A facility, from what is actually stored about it.
//
// The previous OverviewTab took the mock `Facility` shape — tax config, module
// usage, SMS credits, an activity feed — and none of that exists in Postgres.
// Rendering it for a real facility would have meant either a crash or a page of
// zeroes presented as facts.
//
// So this shows the things that ARE known, and nothing else. It is a smaller
// screen than the one it replaces, and every number on it is true.
// ============================================================================

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-muted-foreground size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate text-base font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function FacilityOverview({ facility }: { facility: AdminFacilityRow }) {
  const activeClients = facility.clients.filter(
    (client) => client.status === "active",
  ).length;

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">At a glance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={CreditCard}
            label="Plan"
            value={`${facility.plan} · ${facility.subscriptionStatus}`}
          />
          <Stat
            icon={Users}
            label="Team members"
            value={facility.usersList.length}
          />
          <Stat icon={UserCheck} label="Active clients" value={activeClients} />
          <Stat
            icon={MapPin}
            label="Locations"
            value={facility.locationsList.length}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Facility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <span className="text-muted-foreground">Web address</span>
              <FacilityWebAddress
                facilityId={facility.id}
                slug={facility.slug}
              />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium">{facility.dayJoined}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">{facility.owner.name}</span>
            </div>
            {facility.owner.email && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Owner email</span>
                <span className="font-medium">{facility.owner.email}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Services</span>
              <span className="flex flex-wrap justify-end gap-1">
                {facility.locationsList[0]?.services.length ? (
                  facility.locationsList[0].services.map((service) => (
                    <Badge
                      key={service}
                      variant="secondary"
                      className="text-xs capitalize"
                    >
                      {service}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="text-muted-foreground size-4" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {facility.locationsList.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No locations recorded.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {facility.locationsList.map((location, index) => (
                  <li
                    key={`${location.name}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <MapPin className="text-muted-foreground size-3.5" />
                    <span className="font-medium">{location.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
