"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Users,
  PawPrint,
  DollarSign,
  TrendingUp,
  Clock,
  LogIn,
  LogOut,
  Search,
  Plus,
  CreditCard,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { facilities } from "@/data/facilities";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";

type CheckInOutMode = "check-in" | "check-out" | null;

interface BookingWithDetails {
  id: number;
  clientId: number;
  petId: number;
  facilityId: number;
  service: string;
  startDate: string;
  endDate: string;
  status: string;
  totalCost: number;
  paymentStatus: string;
  specialRequests?: string;
  checkInTime?: string;
  checkOutTime?: string;
  clientName?: string;
  petName?: string;
}

export default function FacilityDashboard() {
  const t = useTranslations("facilityDashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");

  const [searchQuery, setSearchQuery] = useState("");
  const [checkInOutMode, setCheckInOutMode] = useState<CheckInOutMode>(null);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingWithDetails | null>(null);
  const [processedBookings, setProcessedBookings] = useState<Set<number>>(
    new Set(),
  );

  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  // Get today's date for filtering (using a fixed date that matches the mock data)
  const today = "2024-03-10";

  // Get all bookings for this facility with client/pet details
  const facilityBookings = useMemo(() => {
    return bookings
      .filter((b) => b.facilityId === facilityId)
      .map((booking) => {
        const client = clients.find((c) => c.id === booking.clientId);
        const pet = client?.pets.find((p) => p.id === booking.petId);
        return {
          ...booking,
          clientName: client?.name || "Unknown",
          petName: pet?.name || "Unknown",
        };
      });
  }, [facilityId]);

  // Today's arrivals (bookings starting today)
  const todaysArrivals = useMemo(() => {
    return facilityBookings.filter(
      (b) =>
        b.startDate === today &&
        (b.status === "confirmed" || b.status === "pending") &&
        !processedBookings.has(b.id),
    );
  }, [facilityBookings, today, processedBookings]);

  // Today's departures (bookings ending today or ongoing that can check out)
  const todaysDepartures = useMemo(() => {
    return facilityBookings.filter(
      (b) =>
        b.endDate === today &&
        (b.status === "confirmed" || b.status === "completed") &&
        !processedBookings.has(b.id),
    );
  }, [facilityBookings, today, processedBookings]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return facilityBookings.filter(
      (b) =>
        b.id.toString().includes(query) ||
        b.clientName?.toLowerCase().includes(query) ||
        b.petName?.toLowerCase().includes(query) ||
        b.service.toLowerCase().includes(query),
    );
  }, [facilityBookings, searchQuery]);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Mock data for dashboard
  const metrics = {
    totalClients: facility.clients.length,
    activeClients: facility.clients.filter((c) => c.status === "active").length,
    totalBookings: facilityBookings.length,
    revenue: 12500,
    upcomingBookings: facilityBookings.filter((b) => b.status === "confirmed")
      .length,
    staffCount: facility.usersList.length,
  };

  const handleCheckIn = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setCheckInOutMode("check-in");
  };

  const handleCheckOut = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setCheckInOutMode("check-out");
  };

  const confirmCheckInOut = () => {
    if (selectedBooking) {
      setProcessedBookings((prev) => new Set([...prev, selectedBooking.id]));
    }
    setCheckInOutMode(null);
    setSelectedBooking(null);
  };

  const getServiceBadgeColor = (service: string) => {
    switch (service) {
      case "daycare":
        return "bg-blue-100 text-blue-800";
      case "boarding":
        return "bg-purple-100 text-purple-800";
      case "grooming":
        return "bg-pink-100 text-pink-800";
      case "vet":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{facility.name}</h2>
          <p className="text-muted-foreground">
            {new Date(today).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge
          variant={facility.status === "active" ? "default" : "secondary"}
          className="w-fit"
        >
          {tStatus(facility.status as "active" | "inactive")}
        </Badge>
      </div>

      {/* Universal Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by booking ID, client name, pet name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Found {searchResults.length} result(s)
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <PawPrint className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {booking.petName} - {booking.clientName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          #{booking.id} • {booking.service} •{" "}
                          {booking.startDate}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "default" : "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-3">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          New Customer
        </Button>
        <Button variant="outline" className="gap-2">
          <CreditCard className="h-4 w-4" />
          Take Payment
        </Button>
      </div>

      {/* Today's Arrivals & Departures */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Arrivals Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-green-600" />
              Today&apos;s Arrivals
            </CardTitle>
            <Badge variant="secondary">{todaysArrivals.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysArrivals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No arrivals scheduled for today
              </p>
            ) : (
              todaysArrivals.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <PawPrint className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.petName}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.clientName} • {booking.checkInTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getServiceBadgeColor(booking.service)}>
                      {booking.service}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(booking)}
                      className="gap-1"
                    >
                      Check In
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Departures Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-orange-600" />
              Today&apos;s Departures
            </CardTitle>
            <Badge variant="secondary">{todaysDepartures.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysDepartures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No departures scheduled for today
              </p>
            ) : (
              todaysDepartures.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-orange-50/50 dark:bg-orange-950/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                      <PawPrint className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.petName}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.clientName} • {booking.checkOutTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getServiceBadgeColor(booking.service)}>
                      {booking.service}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckOut(booking)}
                      className="gap-1"
                    >
                      Check Out
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {tCommon("clients")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeClients} {tStatus("active").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.upcomingBookings} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {tCommon("users")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.staffCount}</div>
            <p className="text-xs text-muted-foreground">
              {tStatus("active")} {tCommon("users").toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="space-y-4">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    New booking for Max
                  </p>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Client Alice Johnson checked in
                  </p>
                  <p className="text-sm text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <PawPrint className="mr-2 h-4 w-4" />
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Grooming completed for Bella
                  </p>
                  <p className="text-sm text-muted-foreground">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              New Booking
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Add Client
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <PawPrint className="mr-2 h-4 w-4" />
              Register Pet
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Check-In / Check-Out Dialog */}
      <Dialog
        open={checkInOutMode !== null}
        onOpenChange={() => {
          setCheckInOutMode(null);
          setSelectedBooking(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {checkInOutMode === "check-in" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Check In
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-orange-600" />
                  Check Out
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {checkInOutMode === "check-in"
                ? "Confirm check-in for this booking"
                : "Confirm check-out for this booking"}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <PawPrint className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {selectedBooking.petName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Owner: {selectedBooking.clientName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Service</p>
                  <p className="font-medium capitalize">
                    {selectedBooking.service}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Booking ID</p>
                  <p className="font-medium">#{selectedBooking.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {checkInOutMode === "check-in"
                      ? "Scheduled Check-In"
                      : "Scheduled Check-Out"}
                  </p>
                  <p className="font-medium">
                    {checkInOutMode === "check-in"
                      ? selectedBooking.checkInTime
                      : selectedBooking.checkOutTime}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Status</p>
                  <Badge
                    variant={
                      selectedBooking.paymentStatus === "paid"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedBooking.paymentStatus}
                  </Badge>
                </div>
              </div>

              {selectedBooking.specialRequests && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Special Requests
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {selectedBooking.specialRequests}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckInOutMode(null);
                setSelectedBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCheckInOut}
              className={
                checkInOutMode === "check-in"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {checkInOutMode === "check-in"
                ? "Confirm Check In"
                : "Confirm Check Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
