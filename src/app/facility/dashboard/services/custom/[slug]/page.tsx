"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/StatCard";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  getCategoryMeta,
  COLOR_HEX_MAP,
  PRICING_MODEL_LABELS,
} from "@/data/custom-services";
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  Clock,
  PawPrint,
  Plus,
  ArrowRight,
} from "lucide-react";

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

  const catMeta = getCategoryMeta(serviceModule.category);
  const basePath = `/facility/dashboard/services/custom/${serviceModule.slug}`;

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Today's Bookings"
          value={3}
          subtitle="Scheduled for today"
          icon={CalendarDays}
          variant="primary"
        />
        <StatCard
          title="This Week"
          value={12}
          subtitle="Total bookings this week"
          icon={TrendingUp}
          variant="info"
          change="+2 vs last week"
          changeType="up"
        />
        <StatCard
          title="Revenue"
          value="$480"
          subtitle="This week"
          icon={DollarSign}
          variant="success"
          change="+$60 vs last week"
          changeType="up"
        />
        <StatCard
          title="Utilization"
          value="72%"
          subtitle="Capacity usage today"
          icon={Clock}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Bookings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <CalendarDays className="h-5 w-5" />
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
                <div className="py-10 text-center">
                  <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
                    <CalendarDays className="text-muted-foreground h-6 w-6" />
                  </div>
                  <p className="font-medium">No bookings yet today</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Bookings for {serviceModule.name} will appear here as they
                    come in.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="h-3.5 w-3.5" />
                    Create First Booking
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {MOCK_BOOKINGS.map((booking) => {
                    const statusCfg = STATUS_CONFIG[booking.status];
                    return (
                      <div
                        key={booking.id}
                        className="bg-card hover:bg-muted/50 flex flex-col justify-between gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                            <PawPrint className="text-primary h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {booking.petName}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {booking.client}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
                          <div className="text-sm sm:text-right">
                            <p className="font-medium">{booking.time}</p>
                            <p className="text-muted-foreground text-xs">
                              {booking.duration}
                            </p>
                          </div>
                          <Badge variant={statusCfg.variant}>
                            {statusCfg.label}
                          </Badge>
                          <span className="ml-auto text-sm font-semibold sm:ml-0 sm:w-12 sm:text-right">
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

        {/* Quick Actions */}
        <div>
          <Card
            className="border-l-4"
            style={{
              borderLeftColor:
                COLOR_HEX_MAP[serviceModule.iconColor] ?? undefined,
            }}
          >
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
              <Link href={`${basePath}/settings`} className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <TrendingUp className="size-4" />
                  Manage Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Module Info */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                Module Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge
                  className={cn("text-xs capitalize", catMeta?.badgeClass)}
                >
                  <span className={catMeta?.textClass}>
                    {catMeta?.name ?? serviceModule.category.replace(/_/g, " ")}
                  </span>
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pricing Model</span>
                <span className="font-medium">
                  {PRICING_MODEL_LABELS[serviceModule.pricing.model]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price</span>
                <span className="font-medium">
                  ${serviceModule.pricing.basePrice}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Online Booking</span>
                <Badge
                  variant={
                    serviceModule.onlineBooking.enabled
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {serviceModule.onlineBooking.enabled ? "On" : "Off"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
