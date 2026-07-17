"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Clock,
  DollarSign,
  Timer,
  CheckCircle2,
  Pencil,
  CalendarClock,
} from "lucide-react";
import { groomingQueries } from "@/lib/api/grooming";
import {
  calculateStylistPerformance,
  calculateStylistThirtyDayStats,
} from "@/lib/stylist-performance";
import type { StylistCapacity } from "@/types/grooming";

/** Structural subset of the Groomers-tab MergedStylist the profile needs. */
export interface GroomerProfileData {
  staffId: string;
  stylistId: string | undefined;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  status: "active" | "inactive" | "on-leave";
  specializations: string[];
  certifications: string[];
  yearsExperience: number;
  bio: string;
  rating: number;
  capacity: StylistCapacity;
  qualifiedPackageIds: string[];
}

const SKILL_LABEL: Record<StylistCapacity["skillLevel"], string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
  platinum: "Platinum",
};

function statusBadge(status: GroomerProfileData["status"]) {
  if (status === "active")
    return (
      <Badge className="border-0 bg-green-100 text-green-700">Active</Badge>
    );
  if (status === "on-leave")
    return (
      <Badge className="border-0 bg-amber-100 text-amber-800">On Leave</Badge>
    );
  return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>;
}

export function GroomerProfileSheet({
  open,
  onOpenChange,
  groomer,
  scheduleSummary,
  onEditProfile,
  onManageAvailability,
  onEditNotifPrefs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groomer: GroomerProfileData | null;
  scheduleSummary?: string;
  onEditProfile: () => void;
  onManageAvailability: () => void;
  onEditNotifPrefs: () => void;
}) {
  const { data: allAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const { data: packages = [] } = useQuery(groomingQueries.packages());

  const stylistId = groomer?.stylistId;

  const metrics = useMemo(
    () =>
      stylistId
        ? calculateStylistPerformance(stylistId, allAppointments)
        : null,
    [stylistId, allAppointments],
  );
  const thirtyDay = useMemo(
    () =>
      stylistId
        ? calculateStylistThirtyDayStats(stylistId, allAppointments)
        : null,
    [stylistId, allAppointments],
  );

  const upcoming = useMemo(() => {
    if (!stylistId) return [];
    const today = new Date().toISOString().split("T")[0];
    return allAppointments
      .filter(
        (a) =>
          a.stylistId === stylistId &&
          a.date >= today &&
          a.status !== "cancelled" &&
          a.status !== "no-show",
      )
      .sort((a, b) =>
        (a.date + a.startTime).localeCompare(b.date + b.startTime),
      )
      .slice(0, 8);
  }, [stylistId, allAppointments]);

  if (!groomer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarImage src={groomer.photoUrl} />
              <AvatarFallback>
                {groomer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base">{groomer.name}</p>
              <p className="text-muted-foreground truncate text-xs font-normal">
                Groomer · {groomer.email}
              </p>
            </div>
          </SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {statusBadge(groomer.status)}
            <Badge variant="outline" className="capitalize">
              {SKILL_LABEL[groomer.capacity.skillLevel]}
            </Badge>
            {groomer.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                {groomer.rating.toFixed(1)}
              </span>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="px-4 pb-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="performance">Perf</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="notifications">Notify</TabsTrigger>
            <TabsTrigger value="availability">Hours</TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-3 pt-3">
            {groomer.bio && <p className="text-sm">{groomer.bio}</p>}
            <Field
              label="Experience"
              value={`${groomer.yearsExperience} years`}
            />
            <Field
              label="Specializations"
              value={groomer.specializations.join(", ") || "—"}
            />
            <Field
              label="Certifications"
              value={groomer.certifications.join(", ") || "—"}
            />
            <Field label="Phone" value={groomer.phone || "—"} />
            <Button size="sm" variant="outline" onClick={onEditProfile}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit Profile
            </Button>
          </TabsContent>

          {/* Schedule */}
          <TabsContent value="schedule" className="space-y-2 pt-3">
            <p className="text-muted-foreground text-xs">
              {scheduleSummary ?? "No weekly schedule set"}
            </p>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">
                No upcoming appointments.
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {upcoming.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {a.petName}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {a.packageName}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {a.date} · {a.startTime}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance" className="pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Metric
                icon={CheckCircle2}
                label="Completed (30d)"
                value={String(thirtyDay?.completedCount ?? 0)}
              />
              <Metric
                icon={CalendarClock}
                label="On-time"
                value={`${metrics?.onTimePercentage ?? 0}%`}
              />
              <Metric
                icon={Timer}
                label="Avg groom time"
                value={
                  metrics?.averageGroomTime
                    ? `${metrics.averageGroomTime} min`
                    : "—"
                }
              />
              <Metric
                icon={DollarSign}
                label="Gratuity"
                value={`$${(metrics?.totalTips ?? 0).toLocaleString()}`}
              />
              <Metric
                icon={DollarSign}
                label="Revenue (30d)"
                value={`$${(thirtyDay?.totalRevenue ?? 0).toLocaleString()}`}
              />
              <Metric
                icon={Star}
                label="Avg rating"
                value={
                  thirtyDay && thirtyDay.ratedCount > 0
                    ? thirtyDay.averageRating.toFixed(1)
                    : groomer.rating > 0
                      ? groomer.rating.toFixed(1)
                      : "—"
                }
              />
            </div>
          </TabsContent>

          {/* Services */}
          <TabsContent value="services" className="space-y-2 pt-3">
            {packages.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No services found.
              </p>
            ) : (
              <div className="space-y-1.5">
                {packages
                  .filter((p) => p.isActive)
                  .map((p) => {
                    const qualified = groomer.qualifiedPackageIds.includes(
                      p.id,
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>{p.name}</span>
                        {qualified ? (
                          <Badge className="border-0 bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="mr-1 size-3" />
                            Qualified
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Not set
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={onEditProfile}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit Qualified Services
            </Button>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-2 pt-3">
            <p className="text-muted-foreground text-sm">
              Which alerts this groomer receives (bookings, changes, summaries,
              reminders) and on which channels — overriding facility defaults.
            </p>
            <Button size="sm" variant="outline" onClick={onEditNotifPrefs}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit Notification Preferences
            </Button>
          </TabsContent>

          {/* Availability */}
          <TabsContent value="availability" className="space-y-2 pt-3">
            <Field
              label="Weekly hours"
              value={scheduleSummary ?? "No schedule set"}
            />
            <p className="text-muted-foreground text-xs">
              Vacation / sick overrides are managed inside the availability
              editor.
            </p>
            <Button size="sm" variant="outline" onClick={onManageAvailability}>
              <Clock className="mr-1.5 size-3.5" />
              Manage Availability
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className="text-muted-foreground flex items-center gap-1 text-[10px] tracking-wide uppercase">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
