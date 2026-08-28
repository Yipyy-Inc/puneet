"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  DataTable,
  type ColumnDef,
  type FilterDef,
} from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  CalendarDays,
  PlayCircle,
  CheckCircle2,
  Hourglass,
  Users,
  Clock,
  GraduationCap,
  BookOpen,
  CircleSlash,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDayName } from "@/lib/training-series";
import {
  useTrainingSeriesList,
  useCancelTrainingSeries,
} from "@/lib/api/training-series";
import { useFacilityLocations } from "@/lib/api/locations";
import {
  useTrainingTrainers,
  assignableTrainers,
} from "@/lib/api/training-trainers";
import type { RealTrainingSeries } from "@/types/training-series";
import { RealSeriesEditDialog } from "./real-series-edit-dialog";

// ============================================================================
// Real training series -- schedule, instructor, branch, capacity, price, and
// how many pets are actually enrolled, read from Postgres. There is no
// "upcoming"/"draft" workflow here (the mock had five statuses); a series is
// `active` from the moment it's created, so "Upcoming" below just means
// active with a start date still ahead, computed for display rather than
// stored.
// ============================================================================

type DisplayStatus = "upcoming" | "active" | "completed" | "cancelled";

const STATUS_META: Record<
  DisplayStatus,
  { label: string; cls: string; icon: typeof CalendarDays }
> = {
  upcoming: {
    label: "Upcoming",
    cls: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200",
    icon: Hourglass,
  },
  active: {
    label: "Active",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200",
    icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    cls: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200",
    icon: CircleSlash,
  },
};

function displayStatus(s: RealTrainingSeries): DisplayStatus {
  if (s.status === "cancelled" || s.status === "completed") return s.status;
  const today = new Date().toISOString().slice(0, 10);
  return s.startDate > today ? "upcoming" : "active";
}

function formatStartDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(hhmmss: string): string {
  const [h, m] = hhmmss.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function SeriesList() {
  const router = useRouter();
  const { data: series = [] } = useTrainingSeriesList();
  const { data: locations } = useFacilityLocations();
  const { data: trainers } = useTrainingTrainers();
  const cancel = useCancelTrainingSeries();

  const [editingSeries, setEditingSeries] = useState<RealTrainingSeries | null>(
    null,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const summary = useMemo(() => {
    let total = 0;
    let upcoming = 0;
    let active = 0;
    let completed = 0;
    for (const s of series) {
      total++;
      const status = displayStatus(s);
      if (status === "upcoming") upcoming++;
      else if (status === "active") active++;
      else if (status === "completed") completed++;
    }
    return { total, upcoming, active, completed };
  }, [series]);

  function handleAddNew() {
    setEditingSeries(null);
    setIsEditOpen(true);
  }

  function handleEdit(s: RealTrainingSeries) {
    setEditingSeries(s);
    setIsEditOpen(true);
  }

  function confirmCancel() {
    if (!cancellingId) return;
    cancel.mutate(cancellingId, {
      onSuccess: () => {
        toast.success("Series cancelled");
        setCancellingId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message);
        setCancellingId(null);
      },
    });
  }

  const courseTypeOptions = useMemo(() => {
    const names = new Set(series.map((s) => s.courseTypeName).filter(Boolean));
    return [...names];
  }, [series]);

  const columns: ColumnDef<RealTrainingSeries>[] = [
    {
      key: "name",
      label: "Series Name",
      icon: BookOpen,
      sortable: true,
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{s.name}</span>
          <span className="text-muted-foreground text-[11px]">
            {s.numberOfSessions} session{s.numberOfSessions === 1 ? "" : "s"} ·{" "}
            {s.durationMinutes} min
          </span>
        </div>
      ),
    },
    {
      key: "courseTypeName",
      label: "Course Type",
      icon: GraduationCap,
      sortable: true,
      render: (s) => s.courseTypeName || "—",
    },
    {
      key: "startDate",
      label: "Start Date",
      icon: CalendarDays,
      sortable: true,
      sortValue: (s) => s.startDate,
      render: (s) => formatStartDate(s.startDate),
    },
    {
      key: "schedule",
      label: "Schedule",
      icon: Clock,
      sortable: false,
      render: (s) => (
        <span className="text-sm">
          {getDayName(s.dayOfWeek)}s ·{" "}
          <span className="tabular-nums">{formatTimeLabel(s.startTime)}</span>
        </span>
      ),
    },
    {
      key: "staffName",
      label: "Instructor",
      icon: Users,
      sortable: true,
      render: (s) => s.staffName ?? "Unassigned",
    },
    {
      key: "capacity",
      label: "Capacity",
      icon: Users,
      sortable: true,
      sortValue: (s) => s.enrolledCount / Math.max(s.capacity, 1),
      render: (s) => {
        const full = s.enrolledCount >= s.capacity;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
              full
                ? "bg-amber-100 text-amber-700"
                : s.enrolledCount / Math.max(s.capacity, 1) >= 0.75
                  ? "bg-sky-100 text-sky-700"
                  : "bg-emerald-100 text-emerald-700",
            )}
            title={`${s.enrolledCount} of ${s.capacity} enrolled${s.waitlistedCount > 0 ? `, ${s.waitlistedCount} waitlisted` : ""}`}
          >
            {s.enrolledCount}/{s.capacity}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      icon: PlayCircle,
      sortable: true,
      sortValue: (s) => displayStatus(s),
      render: (s) => {
        const meta = STATUS_META[displayStatus(s)];
        const Icon = meta.icon;
        return (
          <Badge
            variant="outline"
            className={cn("gap-1 border", meta.cls)}
            title={meta.label}
          >
            <Icon className="size-3" />
            {meta.label}
          </Badge>
        );
      },
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "displayStatus",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "upcoming", label: "Upcoming" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "courseTypeName",
      label: "Course Type",
      options: [
        { value: "all", label: "All Course Types" },
        ...courseTypeOptions.map((c) => ({ value: c, label: c })),
      ],
    },
    {
      key: "staffId",
      label: "Instructor",
      options: [
        { value: "all", label: "All Instructors" },
        ...assignableTrainers(trainers).map((t) => ({
          value: t.staffId,
          label: t.name,
        })),
      ],
    },
    {
      key: "locationId",
      label: "Location",
      options: [
        { value: "all", label: "All Locations" },
        ...(locations ?? []).map((l) => ({ value: l.id, label: l.name })),
      ],
    },
  ];

  // DataTable filters match against a row's OWN field by key -- `displayStatus`
  // isn't a stored field, so it's attached here for the filter to read.
  const rows = useMemo(
    () => series.map((s) => ({ ...s, displayStatus: displayStatus(s) })),
    [series],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Training Series</h2>
          <p className="text-muted-foreground">
            Scheduled group class programs — manage upcoming, active, and
            completed cohorts.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleAddNew}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Plus className="mr-2 size-4" />
          Create Series
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Series"
          value={summary.total}
          icon={BookOpen}
          tone="indigo"
        />
        <KpiTile
          label="Upcoming"
          value={summary.upcoming}
          icon={Hourglass}
          tone="violet"
        />
        <KpiTile
          label="Active"
          value={summary.active}
          icon={PlayCircle}
          tone="emerald"
        />
        <KpiTile
          label="Completed"
          value={summary.completed}
          icon={CheckCircle2}
          tone="slate"
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search series, course type, instructor, location…"
        getSearchValue={(s) =>
          [s.name, s.courseTypeName, s.staffName, s.locationName]
            .filter(Boolean)
            .join(" ")
        }
        itemsPerPage={10}
        onRowClick={(s) =>
          router.push(`/facility/dashboard/services/training/series/${s.id}`)
        }
        rowClassName={() => "cursor-pointer"}
        actions={(s) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(s);
              }}
              title="Edit series"
            >
              <Edit className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setCancellingId(s.id);
              }}
              title="Cancel series"
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        )}
      />

      <RealSeriesEditDialog
        key={editingSeries?.id ?? "new"}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        editing={editingSeries}
      />

      <AlertDialog
        open={!!cancellingId}
        onOpenChange={(open) => !open && setCancellingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this series?</AlertDialogTitle>
            <AlertDialogDescription>
              Every enrolled pet is withdrawn and their still-upcoming bookings
              for this series are cancelled. Past sessions are left alone. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Cancel series
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
