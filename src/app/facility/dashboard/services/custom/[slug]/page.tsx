"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/StatCard";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  CalendarDays,
  DollarSign,
  PawPrint,
  Plus,
  ArrowRight,
  Users,
  Clock,
  Truck,
} from "lucide-react";
import { RouteView } from "@/components/facility/RouteView";

// Mock upcoming bookings
const MOCK_BOOKINGS = [
  {
    id: "b1",
    petName: "Bella",
    client: "Sarah Johnson",
    time: "9:00 AM",
    duration: "60 min",
    status: "confirmed" as const,
    amount: 40,
  },
  {
    id: "b2",
    petName: "Max",
    client: "Tom Williams",
    time: "10:30 AM",
    duration: "30 min",
    status: "pending" as const,
    amount: 25,
  },
  {
    id: "b3",
    petName: "Luna",
    client: "Emma Davis",
    time: "1:00 PM",
    duration: "60 min",
    status: "confirmed" as const,
    amount: 40,
  },
  {
    id: "b4",
    petName: "Charlie",
    client: "Mike Brown",
    time: "3:30 PM",
    duration: "30 min",
    status: "pending" as const,
    amount: 25,
  },
];

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", variant: "default" as const },
  pending: { label: "Pending", variant: "secondary" as const },
  completed: { label: "Completed", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "destructive" as const },
};

export default function CustomServiceDashboardPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  if (!serviceModule) return null;

  const basePath = `/facility/dashboard/services/custom/${serviceModule.slug}`;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Bookings"
          value={3}
          subtitle="Scheduled for today"
          icon={CalendarDays}
          variant="primary"
        />
        <StatCard
          title="Checked In"
          value={1}
          subtitle="Currently in session"
          icon={PawPrint}
          variant="success"
        />
        <StatCard
          title="Today's Revenue"
          value="$130"
          subtitle="From completed sessions"
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title="Staff On Duty"
          value={2}
          subtitle="Assigned today"
          icon={Users}
          variant="secondary"
        />
      </div>

      {/* Route View — shown for transport modules */}
      {serviceModule.category === "transport" && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="size-4" />
            Today&apos;s Routes
          </h3>
          <RouteView />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Bookings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <CalendarDays className="size-5" />
                  Today&apos;s Upcoming Bookings
                </CardTitle>
                <Link href={`${basePath}/bookings`}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="ml-1 size-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {MOCK_BOOKINGS.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDays className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
                  <p className="font-medium">No bookings yet today</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Bookings for {serviceModule.name} will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {MOCK_BOOKINGS.map((booking) => {
                    const statusCfg = STATUS_CONFIG[booking.status];
                    return (
                      <div
                        key={booking.id}
                        className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                            <PawPrint className="text-primary size-5" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.petName}</p>
                            <p className="text-muted-foreground text-xs">
                              {booking.client}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <p className="font-medium">{booking.time}</p>
                            <p className="text-muted-foreground text-xs">
                              {booking.duration}
                            </p>
                          </div>
                          <Badge variant={statusCfg.variant}>
                            {statusCfg.label}
                          </Badge>
                          <span className="w-12 text-right text-sm font-semibold">
                            ${booking.amount}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-2">
                <Plus className="size-4" />
                New Booking
              </Button>
              <Link href={`${basePath}/bookings`} className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <CalendarDays className="size-4" />
                  View All Bookings
                </Button>
              </Link>
              {serviceModule.checkInOut.enabled && (
                <Link href={`${basePath}/check-in`} className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <Clock className="size-4" />
                    Check-In Panel
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Next Booking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                Next Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pet</span>
                <span className="font-medium">Bella</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">Sarah Johnson</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">9:00 AM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">60 min</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
