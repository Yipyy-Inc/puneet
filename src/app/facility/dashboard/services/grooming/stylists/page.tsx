"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

import {
  Edit,
  MoreHorizontal,
  Star,
  Calendar,
  Clock,
  Award,
  Users,
  Scissors,
  DollarSign,
  TrendingDown,
  Timer,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  stylists,
  stylistAvailability,
  groomingAppointments,
  groomingPackages,
} from "@/data/grooming";
import type { StylistCapacity, StylistSkillLevel } from "@/types/grooming";
import { facilityStaff } from "@/data/facility-staff";
import type { StaffProfile } from "@/types/facility-staff";
import { toast } from "sonner";
import {
  calculateStylistPerformance,
  calculateStylistThirtyDayStats,
} from "@/lib/stylist-performance";
import { Checkbox } from "@/components/ui/checkbox";

type MergedStylist = {
  staffId: string;
  stylistId: string | undefined;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  status: "active" | "inactive";
  specializations: string[];
  certifications: string[];
  yearsExperience: number;
  bio: string;
  rating: number;
  totalAppointments: number;
  hireDate: string;
  capacity: StylistCapacity;
  visibleOnline: boolean;
  hasGroomingProfile: boolean;
  calendarColor?: string;
  qualifiedPackageIds: string[];
};

const defaultCapacity: StylistCapacity = {
  maxDailyAppointments: 6,
  maxWeeklyAppointments: 30,
  maxConcurrentAppointments: 1,
  preferredPetSizes: ["small", "medium"],
  skillLevel: "junior",
  canHandleMatted: false,
  canHandleAnxious: false,
  canHandleAggressive: false,
};

// Stable palette used when a stylist has no `calendarColor` set yet — same
// hue family as the existing day-view service palette.
const GROOMER_FALLBACK_PALETTE = [
  "#ec4899", // pink
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#a855f7", // purple
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#eab308", // yellow
];

function fallbackColorFor(staffId: string): string {
  let hash = 0;
  for (let i = 0; i < staffId.length; i++) {
    hash = (hash * 31 + staffId.charCodeAt(i)) | 0;
  }
  return GROOMER_FALLBACK_PALETTE[
    Math.abs(hash) % GROOMER_FALLBACK_PALETTE.length
  ];
}

function buildMergedStylists(
  staffList: StaffProfile[],
): MergedStylist[] {
  const groomers = staffList.filter((s) => s.primaryRole === "groomer");
  return groomers.map((staff) => {
    const profile = stylists.find((s) => s.staffId === staff.id);
    return {
      staffId: staff.id,
      stylistId: profile?.id,
      name: `${staff.firstName} ${staff.lastName}`,
      email: staff.email,
      phone: staff.phone,
      photoUrl: staff.avatarUrl,
      status: staff.status === "active" ? "active" : "inactive",
      specializations: profile?.specializations ?? [],
      certifications: profile?.certifications ?? [],
      yearsExperience: profile?.yearsExperience ?? 0,
      bio: profile?.bio ?? "",
      rating: profile?.rating ?? 0,
      totalAppointments: profile?.totalAppointments ?? 0,
      hireDate: profile?.hireDate ?? staff.employment.hireDate,
      capacity: profile?.capacity ?? defaultCapacity,
      visibleOnline: profile?.visibleOnline ?? false,
      hasGroomingProfile: !!profile,
      calendarColor: profile?.calendarColor,
      qualifiedPackageIds: profile?.qualifiedPackageIds ?? [],
    };
  });
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function StylistsPage() {
  const [editingGroomer, setEditingGroomer] = useState<MergedStylist | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedGroomer, setSelectedGroomer] = useState<MergedStylist | null>(null);

  const [formData, setFormData] = useState({
    specializations: "",
    certifications: "",
    yearsExperience: 0,
    bio: "",
    visibleOnline: true,
    maxDailyAppointments: 6,
    maxWeeklyAppointments: 30,
    maxConcurrentAppointments: 1,
    skillLevel: "junior" as StylistSkillLevel,
    canHandleMatted: false,
    canHandleAnxious: false,
    canHandleAggressive: false,
    calendarColor: "#ec4899",
    qualifiedPackageIds: [] as string[],
  });

  const [groomerVisibility, setGroomerVisibility] = useState<
    Record<string, boolean>
  >(() =>
    stylists.reduce(
      (acc, s) => {
        if (s.staffId) acc[s.staffId] = s.visibleOnline !== false;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const [availabilityData, setAvailabilityData] = useState<
    Record<number, { isAvailable: boolean; startTime: string; endTime: string }>
  >({
    0: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
    1: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    2: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    3: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    4: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    5: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    6: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
  });

  const mergedStylists = useMemo(
    () => buildMergedStylists(facilityStaff),
    [],
  );

  const stylistMetrics = useMemo(() => {
    const metricsMap = new Map<
      string,
      ReturnType<typeof calculateStylistPerformance>
    >();
    mergedStylists.forEach((groomer) => {
      if (groomer.stylistId) {
        const metrics = calculateStylistPerformance(
          groomer.stylistId,
          groomingAppointments,
        );
        metricsMap.set(groomer.staffId, metrics);
      }
    });
    return metricsMap;
  }, [mergedStylists]);

  const thirtyDayStats = useMemo(() => {
    const m = new Map<string, ReturnType<typeof calculateStylistThirtyDayStats>>();
    mergedStylists.forEach((g) => {
      if (g.stylistId) {
        m.set(
          g.staffId,
          calculateStylistThirtyDayStats(g.stylistId, groomingAppointments),
        );
      }
    });
    return m;
  }, [mergedStylists]);

  // Quick read of this stylist's weekly availability for the inline schedule
  // summary. Mirrors the data shape used by the Manage Availability modal.
  const scheduleSummaries = useMemo(() => {
    const map = new Map<string, string>();
    const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    mergedStylists.forEach((g) => {
      if (!g.stylistId) return;
      const slots = stylistAvailability.filter(
        (a) => a.stylistId === g.stylistId && a.isAvailable,
      );
      if (slots.length === 0) {
        map.set(g.staffId, "No schedule set");
        return;
      }
      // Group contiguous days that share the same hours into ranges.
      const byDay = slots
        .map((s) => ({
          day: s.dayOfWeek,
          start: s.startTime,
          end: s.endTime,
        }))
        .sort((a, b) => a.day - b.day);
      const groups: { days: number[]; start: string; end: string }[] = [];
      byDay.forEach((d) => {
        const last = groups[groups.length - 1];
        if (
          last &&
          last.start === d.start &&
          last.end === d.end &&
          last.days[last.days.length - 1] === d.day - 1
        ) {
          last.days.push(d.day);
        } else {
          groups.push({ days: [d.day], start: d.start, end: d.end });
        }
      });
      map.set(
        g.staffId,
        groups
          .map((g) => {
            const range =
              g.days.length === 1
                ? DAY_SHORT[g.days[0]]
                : `${DAY_SHORT[g.days[0]]}–${DAY_SHORT[g.days[g.days.length - 1]]}`;
            return `${range} ${g.start}–${g.end}`;
          })
          .join(" · "),
      );
    });
    return map;
  }, [mergedStylists]);

  const activePackages = useMemo(
    () => groomingPackages.filter((p) => p.isActive),
    [],
  );

  const activeStylists = mergedStylists.filter((s) => s.status === "active").length;
  const totalAppointments = mergedStylists.reduce(
    (sum, s) => sum + s.totalAppointments,
    0,
  );
  const ratedStylists = mergedStylists.filter((s) => s.rating > 0);
  const avgRating =
    ratedStylists.length > 0
      ? ratedStylists.reduce((sum, s) => sum + s.rating, 0) / ratedStylists.length
      : 0;
  const experiencedStylists = mergedStylists.filter((s) => s.yearsExperience > 0);
  const avgExperience =
    experiencedStylists.length > 0
      ? experiencedStylists.reduce((sum, s) => sum + s.yearsExperience, 0) /
        experiencedStylists.length
      : 0;

  const totalRevenue = Array.from(stylistMetrics.values()).reduce(
    (sum, m) => sum + m.totalRevenue,
    0,
  );
  const avgCancellationRate =
    stylistMetrics.size > 0
      ? Array.from(stylistMetrics.values()).reduce(
          (sum, m) => sum + m.cancellationRate,
          0,
        ) / stylistMetrics.size
      : 0;

  const handleEdit = (groomer: MergedStylist) => {
    setEditingGroomer(groomer);
    setFormData({
      specializations: groomer.specializations.join(", "),
      certifications: groomer.certifications.join(", "),
      yearsExperience: groomer.yearsExperience,
      bio: groomer.bio,
      visibleOnline: groomerVisibility[groomer.staffId] ?? groomer.visibleOnline,
      maxDailyAppointments: groomer.capacity.maxDailyAppointments,
      maxWeeklyAppointments: groomer.capacity.maxWeeklyAppointments ?? 30,
      maxConcurrentAppointments: groomer.capacity.maxConcurrentAppointments,
      skillLevel: groomer.capacity.skillLevel,
      canHandleMatted: groomer.capacity.canHandleMatted,
      canHandleAnxious: groomer.capacity.canHandleAnxious,
      canHandleAggressive: groomer.capacity.canHandleAggressive,
      calendarColor: groomer.calendarColor ?? fallbackColorFor(groomer.staffId),
      qualifiedPackageIds: groomer.qualifiedPackageIds,
    });
    setIsEditModalOpen(true);
  };

  const toggleGroomerVisibility = (staffId: string) => {
    setGroomerVisibility((prev) => ({
      ...prev,
      [staffId]: !prev[staffId],
    }));
    toast.success(
      `Groomer ${groomerVisibility[staffId] ? "hidden from" : "shown on"} online booking`,
    );
  };

  const handleSave = () => {
    setIsEditModalOpen(false);
    toast.success("Grooming profile updated");
  };

  const handleManageAvailability = (groomer: MergedStylist) => {
    setSelectedGroomer(groomer);

    const existingAvailability: Record<
      number,
      { isAvailable: boolean; startTime: string; endTime: string }
    > = {
      0: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      1: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      2: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      3: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      4: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      5: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      6: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
    };

    if (groomer.stylistId) {
      stylistAvailability
        .filter((a) => a.stylistId === groomer.stylistId)
        .forEach((a) => {
          existingAvailability[a.dayOfWeek] = {
            isAvailable: a.isAvailable,
            startTime: a.startTime,
            endTime: a.endTime,
          };
        });
    }

    setAvailabilityData(existingAvailability);
    setIsAvailabilityModalOpen(true);
  };

  const handleSaveAvailability = () => {
    setIsAvailabilityModalOpen(false);
    toast.success("Availability updated");
  };

  const columns: ColumnDef<MergedStylist>[] = [
    {
      key: "name",
      label: "Stylist",
      icon: Users,
      defaultVisible: true,
      render: (groomer) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={groomer.photoUrl} />
            <AvatarFallback>
              {groomer.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{groomer.name}</p>
            <p className="text-muted-foreground text-sm">{groomer.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "specializations",
      label: "Specializations",
      icon: Scissors,
      defaultVisible: true,
      render: (groomer) =>
        groomer.specializations.length > 0 ? (
          <div className="flex max-w-xs flex-wrap gap-1">
            {groomer.specializations.slice(0, 2).map((spec, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
            {groomer.specializations.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{groomer.specializations.length - 2}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm italic">
            No profile yet
          </span>
        ),
    },
    {
      key: "yearsExperience",
      label: "Experience",
      icon: Award,
      defaultVisible: true,
      render: (groomer) =>
        groomer.yearsExperience > 0
          ? `${groomer.yearsExperience} years`
          : "—",
    },
    {
      key: "skillLevel",
      label: "Skill Level",
      icon: Award,
      defaultVisible: true,
      render: (groomer) => {
        const level = groomer.capacity.skillLevel;
        const cls: Record<typeof level, string> = {
          junior: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          intermediate:
            "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
          senior:
            "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
          master:
            "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
        };
        return (
          <Badge className={`capitalize ${cls[level]} border-0`}>{level}</Badge>
        );
      },
    },
    {
      key: "capacity",
      label: "Booking Capacity",
      icon: Calendar,
      defaultVisible: true,
      render: (groomer) => {
        const weekly = groomer.capacity.maxWeeklyAppointments;
        return (
          <div className="text-sm leading-tight">
            <div>
              <span className="font-medium">
                {groomer.capacity.maxDailyAppointments}
              </span>
              <span className="text-muted-foreground"> / day</span>
            </div>
            <div className="text-muted-foreground text-xs">
              {weekly ? `${weekly} / week` : "no weekly cap"}
            </div>
          </div>
        );
      },
    },
    {
      key: "qualifiedServices",
      label: "Qualified Services",
      icon: Scissors,
      defaultVisible: true,
      render: (groomer) => {
        const ids = groomer.qualifiedPackageIds;
        if (ids.length === 0) {
          return (
            <span className="text-muted-foreground text-xs italic">
              Not configured
            </span>
          );
        }
        const names = ids
          .map((id) => activePackages.find((p) => p.id === id)?.name)
          .filter(Boolean) as string[];
        return (
          <div
            className="flex max-w-xs flex-wrap gap-1"
            title={names.join(", ")}
          >
            {names.slice(0, 2).map((n) => (
              <Badge key={n} variant="secondary" className="text-xs">
                {n}
              </Badge>
            ))}
            {names.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{names.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "workingHours",
      label: "Working Hours",
      icon: Clock,
      defaultVisible: true,
      render: (groomer) => (
        <span className="text-muted-foreground text-xs">
          {scheduleSummaries.get(groomer.staffId) ?? "No schedule set"}
        </span>
      ),
    },
    {
      key: "calendarColor",
      label: "Calendar Color",
      defaultVisible: true,
      render: (groomer) => {
        const color = groomer.calendarColor ?? fallbackColorFor(groomer.staffId);
        return (
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-5 rounded-md ring-2 ring-background shadow-sm"
              style={{ backgroundColor: color }}
              aria-label={`Calendar color ${color}`}
            />
            <span className="text-muted-foreground text-[10px] font-mono uppercase">
              {color}
            </span>
          </div>
        );
      },
    },
    {
      key: "perf30",
      label: "Performance (30d)",
      icon: TrendingDown,
      defaultVisible: true,
      render: (groomer) => {
        const s = thirtyDayStats.get(groomer.staffId);
        if (!s) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const ratingDisplay =
          s.ratedCount > 0 ? s.averageRating.toFixed(1) : groomer.rating > 0
            ? groomer.rating.toFixed(1)
            : "—";
        return (
          <div className="text-xs leading-tight">
            <div>
              <span className="font-semibold tabular-nums">
                {s.completedCount}
              </span>
              <span className="text-muted-foreground"> done</span>
              <span className="text-muted-foreground/60"> · </span>
              <span className="inline-flex items-center gap-0.5">
                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{ratingDisplay}</span>
              </span>
            </div>
            <div className="text-muted-foreground">
              ${s.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-muted-foreground/70"> revenue</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "rating",
      label: "Rating",
      icon: Star,
      defaultVisible: true,
      render: (groomer) =>
        groomer.rating > 0 ? (
          <div className="flex items-center gap-1">
            <Star className="size-4 fill-yellow-400 text-yellow-400" />
            <span>{groomer.rating.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "totalAppointments",
      label: "Total Appointments",
      icon: Calendar,
      defaultVisible: true,
      render: (groomer) =>
        groomer.totalAppointments > 0
          ? groomer.totalAppointments.toLocaleString()
          : "—",
    },
    {
      key: "todayAppointments",
      label: "Today's Appointments",
      icon: Calendar,
      defaultVisible: true,
      render: (groomer) => {
        const metrics = stylistMetrics.get(groomer.staffId);
        return (
          <div className="flex items-center gap-2">
            <Badge variant={metrics?.todayAppointments ? "default" : "outline"}>
              {metrics?.todayAppointments || 0}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "revenue",
      label: "Revenue",
      icon: DollarSign,
      defaultVisible: true,
      render: (groomer) => {
        const metrics = stylistMetrics.get(groomer.staffId);
        return (
          <div className="font-medium">
            ${metrics?.totalRevenue.toFixed(2) || "0.00"}
          </div>
        );
      },
    },
    {
      key: "averageGroomTime",
      label: "Avg. Groom Time",
      icon: Timer,
      defaultVisible: true,
      render: (groomer) => {
        const metrics = stylistMetrics.get(groomer.staffId);
        return metrics?.averageGroomTime
          ? `${metrics.averageGroomTime} min`
          : "N/A";
      },
    },
    {
      key: "cancellationRate",
      label: "Cancellation Rate",
      icon: TrendingDown,
      defaultVisible: true,
      render: (groomer) => {
        const metrics = stylistMetrics.get(groomer.staffId);
        const rate = metrics?.cancellationRate || 0;
        return (
          <div className="flex items-center gap-2">
            <span
              className={
                rate > 15
                  ? "font-medium text-red-600"
                  : rate > 10
                    ? "text-orange-600"
                    : "text-green-600"
              }
            >
              {rate}%
            </span>
            {metrics && (
              <span className="text-muted-foreground text-xs">
                ({metrics.cancelledCount}/{metrics.totalAppointments})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (groomer) => (
        <Badge
          className={
            groomer.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }
        >
          {groomer.status}
        </Badge>
      ),
    },
    {
      key: "visibleOnline",
      label: "Online Visibility",
      defaultVisible: true,
      render: (groomer) => {
        const isVisible = groomerVisibility[groomer.staffId] ?? groomer.visibleOnline;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={isVisible}
              onCheckedChange={() => toggleGroomerVisibility(groomer.staffId)}
            />
            <span className="text-muted-foreground text-sm">
              {isVisible ? "Visible" : "Hidden"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (groomer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(groomer)}>
              <Edit className="mr-2 size-4" />
              Edit Grooming Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleManageAvailability(groomer)}>
              <Clock className="mr-2 size-4" />
              Manage Availability
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/facility/dashboard/staff">
                <ExternalLink className="mr-2 size-4" />
                View in Staff Management
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Stylists
            </CardTitle>
            <Users className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStylists}</div>
            <p className="text-muted-foreground text-xs">
              of {mergedStylists.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Appointments
            </CardTitle>
            <Calendar className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAppointments.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-2xl font-bold">
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              {avgRating.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">Across all stylists</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Experience
            </CardTitle>
            <Award className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgExperience.toFixed(1)} years
            </div>
            <p className="text-muted-foreground text-xs">Team average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-muted-foreground text-xs">
              From completed appointments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Cancellation Rate
            </CardTitle>
            <TrendingDown className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgCancellationRate.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">Team average</p>
          </CardContent>
        </Card>
      </div>

      {/* Stylists Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Stylists Directory</CardTitle>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <Info className="size-3.5" />
              Populated from staff with the Groomer role. Add or remove via
              Staff Management.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/facility/dashboard/staff">
              <Users className="mr-2 size-4" />
              Manage Staff
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={mergedStylists}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search stylists..."
            searchKey={"name" as keyof MergedStylist}
          />
        </CardContent>
      </Card>

      {/* Edit Grooming Profile Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Grooming Profile — {editingGroomer?.name}</DialogTitle>
            <DialogDescription>
              Update grooming-specific details. To edit contact info or role,
              go to{" "}
              <Link
                href="/facility/dashboard/staff"
                className="text-primary underline"
              >
                Staff Management
              </Link>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  value={formData.yearsExperience}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      yearsExperience: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select
                  value={formData.skillLevel}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      skillLevel: value as StylistSkillLevel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specializations">
                Specializations (comma-separated)
              </Label>
              <Input
                id="specializations"
                placeholder="e.g., Breed-specific cuts, Show grooming, De-matting"
                value={formData.specializations}
                onChange={(e) =>
                  setFormData({ ...formData, specializations: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certifications">
                Certifications (comma-separated)
              </Label>
              <Input
                id="certifications"
                placeholder="e.g., Certified Master Groomer, Pet First Aid"
                value={formData.certifications}
                onChange={(e) =>
                  setFormData({ ...formData, certifications: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Brief description of the stylist..."
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxDailyAppointments">Daily Cap</Label>
                <Input
                  id="maxDailyAppointments"
                  type="number"
                  value={formData.maxDailyAppointments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDailyAppointments: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxWeeklyAppointments">Weekly Cap</Label>
                <Input
                  id="maxWeeklyAppointments"
                  type="number"
                  value={formData.maxWeeklyAppointments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxWeeklyAppointments: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxConcurrentAppointments">Concurrent</Label>
                <Input
                  id="maxConcurrentAppointments"
                  type="number"
                  value={formData.maxConcurrentAppointments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxConcurrentAppointments:
                        parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendarColor">Calendar Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="calendarColor"
                  type="color"
                  value={formData.calendarColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      calendarColor: e.target.value,
                    })
                  }
                  className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-0.5"
                />
                <span className="text-muted-foreground text-xs font-mono uppercase">
                  {formData.calendarColor}
                </span>
                <span className="text-muted-foreground text-xs">
                  Used on the day-view calendar to identify this groomer's blocks.
                </span>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Label>Qualified Services</Label>
                <span className="text-muted-foreground text-xs">
                  {formData.qualifiedPackageIds.length} of {activePackages.length}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Only the services checked below will offer this groomer as an
                assignment option in booking.
              </p>
              <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {activePackages.map((p) => {
                  const checked = formData.qualifiedPackageIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      htmlFor={`pkg-${p.id}`}
                      className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <Checkbox
                        id={`pkg-${p.id}`}
                        checked={checked}
                        onCheckedChange={(v) => {
                          setFormData((prev) => ({
                            ...prev,
                            qualifiedPackageIds: v
                              ? Array.from(
                                  new Set([...prev.qualifiedPackageIds, p.id]),
                                )
                              : prev.qualifiedPackageIds.filter(
                                  (id) => id !== p.id,
                                ),
                          }));
                        }}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <Label>Handling Capabilities</Label>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["canHandleMatted", "Can handle matted coats"],
                    ["canHandleAnxious", "Can handle anxious pets"],
                    ["canHandleAggressive", "Can handle aggressive pets"],
                  ] as [keyof typeof formData, string][]
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={formData[key] as boolean}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, [key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="visibleOnline">Visible in Online Booking</Label>
                <p className="text-muted-foreground text-sm">
                  Toggle to show/hide this groomer from customer booking
                  options.
                </p>
              </div>
              <Switch
                id="visibleOnline"
                checked={formData.visibleOnline}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, visibleOnline: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Availability Modal */}
      <Dialog
        open={isAvailabilityModalOpen}
        onOpenChange={setIsAvailabilityModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Availability — {selectedGroomer?.name}
            </DialogTitle>
            <DialogDescription>
              Set the weekly schedule for this stylist. Clients can book
              appointments during available hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dayNames.map((dayName, dayIndex) => (
              <div
                key={dayIndex}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="w-24">
                  <span className="font-medium">{dayName}</span>
                </div>
                <Switch
                  checked={availabilityData[dayIndex]?.isAvailable || false}
                  onCheckedChange={(checked) =>
                    setAvailabilityData({
                      ...availabilityData,
                      [dayIndex]: {
                        ...availabilityData[dayIndex],
                        isAvailable: checked,
                      },
                    })
                  }
                />
                {availabilityData[dayIndex]?.isAvailable && (
                  <div className="flex flex-1 items-center gap-2">
                    <Select
                      value={availabilityData[dayIndex]?.startTime || "08:00"}
                      onValueChange={(value) =>
                        setAvailabilityData({
                          ...availabilityData,
                          [dayIndex]: {
                            ...availabilityData[dayIndex],
                            startTime: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "06:00",
                          "07:00",
                          "08:00",
                          "09:00",
                          "10:00",
                          "11:00",
                          "12:00",
                        ].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select
                      value={availabilityData[dayIndex]?.endTime || "17:00"}
                      onValueChange={(value) =>
                        setAvailabilityData({
                          ...availabilityData,
                          [dayIndex]: {
                            ...availabilityData[dayIndex],
                            endTime: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "14:00",
                          "15:00",
                          "16:00",
                          "17:00",
                          "18:00",
                          "19:00",
                          "20:00",
                        ].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!availabilityData[dayIndex]?.isAvailable && (
                  <span className="text-muted-foreground text-sm">
                    Not available
                  </span>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAvailabilityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAvailability}>Save Availability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
