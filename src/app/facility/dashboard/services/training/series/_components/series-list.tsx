"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { DataTable, type ColumnDef, type FilterDef } from "@/components/ui/DataTable";
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
  FileEdit,
  Users,
  Clock,
  GraduationCap,
  MapPin,
  BookOpen,
  CircleSlash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { getDayName, type TrainingSeries, type SeriesStatus } from "@/lib/training-series";
import {
  distinctEnrolledForSeries,
  getKnownSeriesCourseTypes,
  getKnownSeriesInstructors,
  getKnownSeriesLocations,
} from "@/data/training-series";
import { SeriesEditDialog } from "./series-edit-dialog";

const STATUS_META: Record<
  SeriesStatus,
  { label: string; cls: string; icon: typeof CalendarDays }
> = {
  draft: {
    label: "Draft",
    cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200",
    icon: FileEdit,
  },
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

function formatStartDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function SeriesList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: serverSeries = [] } = useQuery(trainingQueries.series());

  // Local overrides — mock data is static so saves/deletes live in component
  // state on top of the server list. Swapping to a real API later just means
  // dropping these and letting react-query do the work.
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, TrainingSeries | null>
  >({});

  const series = useMemo(() => {
    const out: TrainingSeries[] = [];
    const seen = new Set<string>();
    for (const s of serverSeries) {
      if (localOverrides[s.id] === null) continue;
      out.push(localOverrides[s.id] ?? s);
      seen.add(s.id);
    }
    for (const [id, override] of Object.entries(localOverrides)) {
      if (!override) continue;
      if (seen.has(id)) continue;
      out.push(override);
    }
    return out;
  }, [serverSeries, localOverrides]);

  const [editingSeries, setEditingSeries] = useState<TrainingSeries | null>(
    null,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const summary = useMemo(() => {
    let total = 0;
    let upcoming = 0;
    let active = 0;
    let completed = 0;
    for (const s of series) {
      total++;
      if (s.status === "upcoming") upcoming++;
      else if (s.status === "active") active++;
      else if (s.status === "completed") completed++;
    }
    return { total, upcoming, active, completed };
  }, [series]);

  function handleAddNew() {
    setEditingSeries(null);
    setIsEditOpen(true);
  }

  function handleEdit(s: TrainingSeries) {
    setEditingSeries(s);
    setIsEditOpen(true);
  }

  function handleSave(next: TrainingSeries) {
    setLocalOverrides((prev) => ({ ...prev, [next.id]: next }));
    toast.success(
      editingSeries ? "Series updated" : "Series created",
    );
    // Refresh any consumers of the series query — sessions on the calendar,
    // customer enrollment views, etc.
    queryClient.invalidateQueries({ queryKey: ["training", "series"] });
  }

  function confirmDelete() {
    if (!deletingId) return;
    setLocalOverrides((prev) => ({ ...prev, [deletingId]: null }));
    toast.success("Series deleted");
    setDeletingId(null);
    queryClient.invalidateQueries({ queryKey: ["training", "series"] });
  }

  const columns: ColumnDef<TrainingSeries>[] = [
    {
      key: "seriesName",
      label: "Series Name",
      icon: BookOpen,
      sortable: true,
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{s.seriesName}</span>
          <span className="text-muted-foreground text-[11px]">
            {s.numberOfWeeks} week{s.numberOfWeeks === 1 ? "" : "s"} · {s.duration} min
          </span>
        </div>
      ),
    },
    {
      key: "courseTypeName",
      label: "Course Type",
      icon: GraduationCap,
      sortable: true,
      render: (s) => s.courseTypeName,
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
      key: "instructorName",
      label: "Instructor",
      icon: Users,
      sortable: true,
    },
    {
      key: "capacity",
      label: "Capacity",
      icon: Users,
      sortable: true,
      sortValue: (s) => distinctEnrolledForSeries(s) / Math.max(s.maxCapacity, 1),
      render: (s) => {
        const enrolled = distinctEnrolledForSeries(s);
        const full = enrolled >= s.maxCapacity;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
              full
                ? "bg-amber-100 text-amber-700"
                : enrolled / s.maxCapacity >= 0.75
                  ? "bg-sky-100 text-sky-700"
                  : "bg-emerald-100 text-emerald-700",
            )}
            title={`${enrolled} of ${s.maxCapacity} enrolled`}
          >
            {enrolled}/{s.maxCapacity}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      icon: PlayCircle,
      sortable: true,
      render: (s) => {
        const meta = STATUS_META[s.status];
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

  const courseTypeOptions = useMemo(
    () => getKnownSeriesCourseTypes(),
    [],
  );
  const instructorOptions = useMemo(
    () => getKnownSeriesInstructors(),
    [],
  );
  const locationOptions = useMemo(() => getKnownSeriesLocations(), []);

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "draft", label: "Draft" },
        { value: "upcoming", label: "Upcoming" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "courseTypeId",
      label: "Course Type",
      options: [
        { value: "all", label: "All Course Types" },
        ...courseTypeOptions.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    {
      key: "instructorId",
      label: "Instructor",
      options: [
        { value: "all", label: "All Instructors" },
        ...instructorOptions.map((t) => ({ value: t.id, label: t.name })),
      ],
    },
    {
      key: "location",
      label: "Location",
      options: [
        { value: "all", label: "All Locations" },
        ...locationOptions.map((l) => ({ value: l, label: l })),
      ],
    },
  ];

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
        data={series}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search series, course type, instructor, location…"
        getSearchValue={(s) =>
          [
            s.seriesName,
            s.courseTypeName,
            s.instructorName,
            s.location,
          ].join(" ")
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
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(s.id);
              }}
              title="Delete series"
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        )}
      />

      <SeriesEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        editing={editingSeries}
        onSave={handleSave}
      />

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this series?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting the series also removes its scheduled sessions. This
              cannot be undone.
              <span className="mt-2 block text-xs">
                <MapPin className="mr-1 inline size-3 align-text-bottom" />
                Sessions tied to this series in the Calendar will disappear.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
