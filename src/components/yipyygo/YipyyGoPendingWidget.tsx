"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRight } from "lucide-react";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoDisplayStatusForBooking } from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";

interface YipyyGoPendingWidgetProps {
  facilityId: number;
  maxItems?: number;
}

export function YipyyGoPendingWidget({
  facilityId,
  maxItems = 5,
}: YipyyGoPendingWidgetProps) {
  const config = getYipyyGoConfig(facilityId);
  if (!config?.enabled) return null;

  const pendingBookings = bookings.filter((b) => {
    if (b.facilityId !== facilityId) return false;
    const st = b.service?.toLowerCase() as
      | "daycare"
      | "boarding"
      | "grooming"
      | "training";
    const enabled = config.serviceConfigs?.find(
      (s) => s.serviceType === st,
    )?.enabled;
    if (!enabled) return false;
    const status = getYipyyGoDisplayStatusForBooking(b.id, {
      facilityId,
      service: b.service,
    });
    return (
      status === "submitted" ||
      status === "needs_review" ||
      status === "precheck_missing"
    );
  });

  const displayList = pendingBookings.slice(0, maxItems);

  if (pendingBookings.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="text-primary size-4" />
            YipyyGo Pending
          </CardTitle>
          <Badge variant="secondary">{pendingBookings.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayList.map((b) => {
          const client = clients.find((c) => c.id === b.clientId);
          const petId = Array.isArray(b.petId) ? b.petId[0] : b.petId;
          const pet = client?.pets?.find((p) => p.id === petId);
          const status = getYipyyGoDisplayStatusForBooking(b.id, {
            facilityId,
            service: b.service,
          });
          return (
            <Link
              key={b.id}
              href={`/facility/dashboard/bookings/${b.id}#yipyygo`}
              className="bg-card hover:bg-muted/50 flex items-center justify-between rounded-lg border p-2 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {pet?.name ?? "Pet"}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {client?.name} · #{b.id} · {b.startDate}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <YipyyGoStatusBadge status={status} showIcon={false} />
                <ChevronRight className="text-muted-foreground size-4" />
              </div>
            </Link>
          );
        })}
        {pendingBookings.length > maxItems && (
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/facility/dashboard/bookings?filter=yipyygo">
              View all {pendingBookings.length} pending
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
