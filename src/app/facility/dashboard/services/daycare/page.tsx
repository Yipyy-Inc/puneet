"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/StatCard";
import {
  Users,
  Clock,
  DollarSign,
  PawPrint,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  daycareCheckIns,
  daycareCapacity,
  getCurrentCheckedInCount,
  getCheckedInBySize,
} from "@/data/daycare";

export default function DaycareDashboardPage() {
  const currentCount = getCurrentCheckedInCount();
  const capacityPercentage = (currentCount / daycareCapacity.total) * 100;
  const checkedInBySize = getCheckedInBySize();

  const checkedInPets = daycareCheckIns.filter(
    (c) => c.status === "checked-in",
  );
  const checkedOutToday = daycareCheckIns.filter(
    (c) => c.status === "checked-out",
  ).length;

  // Calculate revenue for today (mock)
  const todayRevenue = checkedInPets.reduce((acc, pet) => {
    if (pet.rateType === "full-day") return acc + 40;
    if (pet.rateType === "half-day") return acc + 25;
    return acc + 32; // hourly estimate
  }, 0);

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 75) return "bg-warning";
    return "bg-success";
  };

  const getCapacityStatus = (percentage: number) => {
    if (percentage >= 90)
      return { label: "Almost Full", variant: "destructive" as const };
    if (percentage >= 75) return { label: "Busy", variant: "warning" as const };
    if (percentage >= 50)
      return { label: "Moderate", variant: "secondary" as const };
    return { label: "Available", variant: "success" as const };
  };

  const status = getCapacityStatus(capacityPercentage);

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Current Capacity
            </CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {currentCount} of {daycareCapacity.total} spots filled
            </span>
            <span className="font-medium">
              {Math.round(capacityPercentage)}%
            </span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${getCapacityColor(capacityPercentage)}`}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>

          {/* Capacity by Size */}
          <div className="grid grid-cols-4 gap-4 pt-2">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{checkedInBySize.small}</p>
              <p className="text-xs text-muted-foreground">
                Small / {daycareCapacity.smallDogs}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{checkedInBySize.medium}</p>
              <p className="text-xs text-muted-foreground">
                Medium / {daycareCapacity.mediumDogs}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{checkedInBySize.large}</p>
              <p className="text-xs text-muted-foreground">
                Large / {daycareCapacity.largeDogs}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{checkedInBySize.giant}</p>
              <p className="text-xs text-muted-foreground">Giant / 5</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Currently Checked In"
          value={currentCount}
          subtitle="Active daycare guests"
          icon={PawPrint}
          variant="primary"
        />
        <StatCard
          title="Checked Out Today"
          value={checkedOutToday}
          subtitle="Completed visits"
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Today's Revenue"
          value={`$${todayRevenue}`}
          subtitle="From daycare services"
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title="Avg. Stay Duration"
          value="6.5 hrs"
          subtitle="Today's average"
          icon={Clock}
          variant="secondary"
        />
      </div>

      {/* Currently Checked In */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently Checked In
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkedInPets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PawPrint className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pets currently checked in</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checkedInPets.map((pet) => {
                const checkInTime = new Date(pet.checkInTime);
                const now = new Date();
                const hoursElapsed = Math.round(
                  (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60),
                );

                return (
                  <div
                    key={pet.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <PawPrint className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pet.petName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {pet.petBreed} • {pet.ownerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          pet.rateType === "full-day"
                            ? "default"
                            : pet.rateType === "half-day"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {pet.rateType.replace("-", " ")}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {hoursElapsed}h elapsed
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Pickups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Upcoming Pickups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checkedInPets
              .sort(
                (a, b) =>
                  new Date(a.scheduledCheckOut).getTime() -
                  new Date(b.scheduledCheckOut).getTime(),
              )
              .slice(0, 5)
              .map((pet) => {
                const checkoutTime = new Date(pet.scheduledCheckOut);
                const formattedTime = checkoutTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });

                return (
                  <div
                    key={pet.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                        <PawPrint className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{pet.petName}</p>
                        <p className="text-xs text-muted-foreground">
                          Owner: {pet.ownerName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formattedTime}</p>
                      <p className="text-xs text-muted-foreground">
                        {pet.ownerPhone}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
