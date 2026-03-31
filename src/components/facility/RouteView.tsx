"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  MapPin,
  Clock,
  Phone,
  Printer,
  CheckCircle,
  Circle,
  CircleDot,
  PawPrint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { customServiceCheckIns } from "@/data/custom-service-checkins";
import { bookings } from "@/data/bookings";

// ========================================
// Types
// ========================================

interface RouteStop {
  id: string;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  scheduledTime: string;
  status: "pending" | "picked_up" | "dropped_off" | "completed";
  address: string;
  notes: string;
  price: number;
}

interface RouteGroup {
  vehicleName: string;
  driverName: string;
  stops: RouteStop[];
  totalRevenue: number;
  completedCount: number;
}

// ========================================
// Helpers
// ========================================

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusConfig(status: string) {
  switch (status) {
    case "completed":
      return { icon: CheckCircle, color: "text-emerald-500", label: "Delivered" };
    case "checked-in":
      return { icon: CircleDot, color: "text-blue-500", label: "In Transit" };
    default:
      return { icon: Circle, color: "text-muted-foreground/40", label: "Scheduled" };
  }
}

// ========================================
// Route Sheet (printable)
// ========================================

function RouteSheet({
  route,
  onClose,
}: {
  route: RouteGroup;
  onClose: () => void;
}) {
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 bg-white p-8 duration-200 print:static print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold">Route Sheet</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                window.print();
                toast.success("Route sheet sent to printer");
              }}
            >
              <Printer className="mr-1 size-3.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Printable content */}
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h1 className="text-xl font-bold">
              Paws Express — Route Sheet
            </h1>
            <p className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="mt-2 flex gap-6 text-sm">
              <span>
                <strong>Vehicle:</strong> {route.vehicleName}
              </span>
              <span>
                <strong>Driver:</strong> {route.driverName}
              </span>
              <span>
                <strong>Stops:</strong> {route.stops.length}
              </span>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Pet</th>
                <th className="pb-2 pr-4">Owner</th>
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {route.stops.map((stop, idx) => (
                <tr key={stop.id} className="border-b">
                  <td className="py-2 pr-4">{idx + 1}</td>
                  <td className="py-2 pr-4">{formatTime(stop.scheduledTime)}</td>
                  <td className="py-2 pr-4 font-medium">
                    {stop.petName}
                    <span className="text-muted-foreground ml-1 font-normal">
                      ({stop.petBreed})
                    </span>
                  </td>
                  <td className="py-2 pr-4">{stop.ownerName}</td>
                  <td className="py-2 pr-4">{stop.ownerPhone}</td>
                  <td className="py-2 text-xs">{stop.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 border-t pt-4 text-right text-sm">
            <strong>Total Revenue:</strong> $
            {route.totalRevenue.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Main Component
// ========================================

export function RouteView() {
  const [printingRoute, setPrintingRoute] = useState<RouteGroup | null>(null);

  // Build routes from check-in data + bookings
  const routes = useMemo(() => {
    const transportCheckIns = customServiceCheckIns.filter(
      (c) => c.moduleSlug === "paws-express",
    );
    const transportBookings = bookings.filter(
      (b) => b.service === "paws-express",
    );

    // Group by resource (vehicle)
    const grouped = new Map<string, RouteGroup>();

    for (const ci of transportCheckIns) {
      const key = ci.resourceName || "Unassigned";
      if (!grouped.has(key)) {
        grouped.set(key, {
          vehicleName: key,
          driverName: ci.staffAssigned || "Unassigned",
          stops: [],
          totalRevenue: 0,
          completedCount: 0,
        });
      }
      const route = grouped.get(key)!;
      route.stops.push({
        id: ci.id,
        petName: ci.petName,
        petBreed: ci.petBreed,
        ownerName: ci.ownerName,
        ownerPhone: ci.ownerPhone,
        scheduledTime: ci.checkInTime,
        status:
          ci.status === "completed" || ci.status === "checked-out"
            ? "completed"
            : ci.status === "checked-in" || ci.status === "in-progress"
              ? "picked_up"
              : "pending",
        address: ci.notes || "Address on file",
        notes: ci.notes || "",
        price: ci.price,
      });
      route.totalRevenue += ci.price;
      if (ci.status === "completed" || ci.status === "checked-out") {
        route.completedCount++;
      }
    }

    // Also add from bookings that don't have check-in records
    for (const b of transportBookings) {
      const hasCheckIn = transportCheckIns.some(
        (ci) => ci.petId === (Array.isArray(b.petId) ? b.petId[0] : b.petId),
      );
      if (!hasCheckIn && b.status === "confirmed") {
        const key = "Unassigned Route";
        if (!grouped.has(key)) {
          grouped.set(key, {
            vehicleName: key,
            driverName: "Unassigned",
            stops: [],
            totalRevenue: 0,
            completedCount: 0,
          });
        }
        const route = grouped.get(key)!;
        route.stops.push({
          id: `b-${b.id}`,
          petName: `Pet #${Array.isArray(b.petId) ? b.petId[0] : b.petId}`,
          petBreed: "",
          ownerName: `Client #${b.clientId}`,
          ownerPhone: "",
          scheduledTime: b.startDate + "T" + (b.checkInTime ?? "08:00") + ":00",
          status: "pending",
          address: b.specialRequests || "Address on file",
          notes: b.specialRequests || "",
          price: b.totalCost,
        });
        route.totalRevenue += b.totalCost;
      }
    }

    return [...grouped.values()].sort((a, b) =>
      a.vehicleName.localeCompare(b.vehicleName),
    );
  }, []);

  const totalStops = routes.reduce((s, r) => s + r.stops.length, 0);
  const totalCompleted = routes.reduce((s, r) => s + r.completedCount, 0);
  const totalRevenue = routes.reduce((s, r) => s + r.totalRevenue, 0);

  if (printingRoute) {
    return (
      <RouteSheet
        route={printingRoute}
        onClose={() => setPrintingRoute(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Active Routes</p>
            <p className="mt-1 text-2xl font-bold">{routes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Total Stops</p>
            <p className="mt-1 text-2xl font-bold">{totalStops}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Completed</p>
            <p className="mt-1 text-2xl font-bold">
              {totalCompleted}/{totalStops}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Revenue</p>
            <p className="mt-1 text-2xl font-bold font-[tabular-nums]">
              ${totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Route cards */}
      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Truck className="text-muted-foreground mx-auto mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No transport routes scheduled for today
            </p>
          </CardContent>
        </Card>
      ) : (
        routes.map((route) => (
          <Card key={route.vehicleName}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="size-4" />
                  {route.vehicleName}
                  <Badge variant="secondary" className="text-[10px]">
                    {route.stops.length} stop
                    {route.stops.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    Driver: {route.driverName}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setPrintingRoute(route)}
                  >
                    <Printer className="size-3" />
                    Route Sheet
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {route.stops.map((stop, idx) => {
                  const sc = getStatusConfig(stop.status);
                  const StatusIcon = sc.icon;
                  return (
                    <div
                      key={stop.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/30",
                        stop.status === "completed" && "opacity-60",
                      )}
                    >
                      {/* Route line */}
                      <div className="flex flex-col items-center">
                        <StatusIcon className={cn("size-4", sc.color)} />
                        {idx < route.stops.length - 1 && (
                          <div className="my-0.5 h-4 w-px bg-border" />
                        )}
                      </div>

                      {/* Stop info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <PawPrint className="text-muted-foreground size-3" />
                          <span className="text-sm font-medium">
                            {stop.petName}
                          </span>
                          {stop.petBreed && (
                            <span className="text-muted-foreground text-xs">
                              {stop.petBreed}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[9px] capitalize"
                          >
                            {sc.label}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="size-2.5" />
                            {formatTime(stop.scheduledTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-2.5" />
                            {stop.ownerName}
                          </span>
                          {stop.ownerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-2.5" />
                              {stop.ownerPhone}
                            </span>
                          )}
                        </div>
                        {stop.notes && (
                          <p className="text-muted-foreground mt-0.5 text-[11px] italic">
                            {stop.notes}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <span className="text-sm font-medium font-[tabular-nums]">
                        ${stop.price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Route total */}
              <div className="mt-3 flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Route Total</span>
                <span className="font-semibold font-[tabular-nums]">
                  ${route.totalRevenue.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
