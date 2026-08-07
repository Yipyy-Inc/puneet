import { Clock, MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminFacilityRow } from "@/types/admin-facility";

// ============================================================================
// A facility's locations, as stored.
//
// ── WHAT IS DELIBERATELY MISSING ──────────────────────────────────────────
//
// The address. `locations` has a name, a timezone and a primary flag — no
// address column — and the provisioning wizard collects an address and drops
// it on the floor. The previous version of this tab rendered a street address
// from mock data, which for a real facility would have been another business's.
//
// So it is said out loud at the bottom rather than filled in. The fix is a
// column and a wizard that stores what it asks for, not a placeholder here.
// ============================================================================

export function FacilityLocations({
  facility,
}: {
  facility: AdminFacilityRow;
}) {
  return (
    <div className="space-y-6">
      {facility.locationsList.length === 0 ? (
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base">No locations</CardTitle>
            <CardDescription>
              This facility has no locations recorded — unusual, since
              provisioning creates a primary one.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {facility.locationsList.map((location) => (
            <Card key={location.id} className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="text-muted-foreground size-4" />
                  {location.name}
                  {location.isPrimary && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="size-3" />
                      Primary
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground size-3.5" />
                  <span className="text-muted-foreground">
                    {location.timezone ?? "No timezone set"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {location.createdAt.slice(0, 10)}
                  </span>
                </div>
                {location.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {location.services.map((service) => (
                      <Badge
                        key={service}
                        variant="secondary"
                        className="text-xs capitalize"
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Street addresses are not shown because they are not stored — the
        provisioning wizard asks for one and discards it. Services listed are
        the facility&apos;s; there is no per-location service list yet.
      </p>
    </div>
  );
}
