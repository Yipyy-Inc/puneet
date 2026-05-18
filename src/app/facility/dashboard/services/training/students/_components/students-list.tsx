"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { DataTable, type ColumnDef, type FilterDef } from "@/components/ui/DataTable";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Hourglass,
  PawPrint,
  Phone,
  PlayCircle,
  ShieldAlert,
  Syringe,
  UserMinus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import {
  aggregateTrainingStudents,
  VACCINE_EXPIRY_WINDOW_DAYS,
  type TrainingStudentRow,
  type TrainingStudentStatus,
} from "@/lib/training-students";
import type { SeriesPaymentStatus } from "@/lib/training-enrollment";

const STATUS_META: Record<
  TrainingStudentStatus,
  { label: string; cls: string; icon: typeof PlayCircle }
> = {
  active: {
    label: "Active",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: PlayCircle,
  },
  waitlisted: {
    label: "Waitlisted",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Hourglass,
  },
  completed: {
    label: "Completed",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
    icon: CheckCircle2,
  },
  dropped: {
    label: "Dropped",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    icon: UserMinus,
  },
};

const PAYMENT_META: Record<
  SeriesPaymentStatus,
  { label: string; cls: string }
> = {
  paid: {
    label: "Paid",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  deposit: {
    label: "Deposit",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  unpaid: {
    label: "Unpaid",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
  },
  refunded: {
    label: "Refunded",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  },
  comped: {
    label: "Comped",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDays(iso: string | null, todayISO: string): string {
  if (!iso) return "—";
  const today = new Date(todayISO + "T00:00:00").getTime();
  const target = new Date(iso + "T00:00:00").getTime();
  const days = Math.round((today - target) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function vaccineLabel(row: TrainingStudentRow): string {
  if (row.soonestVaccineDays === null) return "";
  if (row.soonestVaccineDays < 0) {
    return `${row.soonestVaccineName} expired ${-row.soonestVaccineDays}d ago`;
  }
  if (row.soonestVaccineDays === 0) {
    return `${row.soonestVaccineName} expires today`;
  }
  return `${row.soonestVaccineName} expires in ${row.soonestVaccineDays}d`;
}

export function StudentsList() {
  const router = useRouter();
  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: series = [] } = useQuery(trainingQueries.series());
  const { data: vaccinations = [] } = useQuery(trainingQueries.vaccinations());

  const rows = useMemo(
    () =>
      aggregateTrainingStudents({
        enrollments,
        series,
        vaccinations,
        clients,
        todayISO,
      }),
    [enrollments, series, vaccinations, todayISO],
  );

  const summary = useMemo(() => {
    let active = 0;
    let waitlisted = 0;
    let completed = 0;
    let expiringVaccines = 0;
    for (const r of rows) {
      if (r.status === "active") active++;
      else if (r.status === "waitlisted") waitlisted++;
      else if (r.status === "completed") completed++;
      if (r.hasVaccineWarning) expiringVaccines++;
    }
    return {
      total: rows.length,
      active,
      waitlisted,
      completed,
      expiringVaccines,
    };
  }, [rows]);

  const columns: ColumnDef<TrainingStudentRow>[] = [
    {
      key: "petName",
      label: "Student",
      icon: PawPrint,
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="bg-muted relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white shadow-sm">
            {row.petImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.petImageUrl}
                alt={row.petName}
                className="size-full object-cover"
                onError={(ev) => {
                  (ev.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <PawPrint className="text-muted-foreground size-4" />
            )}
            {row.hasVaccineWarning && (
              <span
                title={vaccineLabel(row)}
                className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm ring-2 ring-white"
              >
                <ShieldAlert className="size-2.5" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {row.petName}
            </p>
            <p className="text-muted-foreground truncate text-[11px]">
              {row.petBreed}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "ownerName",
      label: "Owner",
      icon: Users,
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.ownerName}</span>
          {row.ownerPhone && (
            <a
              href={`tel:${row.ownerPhone}`}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
              onClick={(ev) => ev.stopPropagation()}
            >
              <Phone className="size-3" />
              {row.ownerPhone}
            </a>
          )}
        </div>
      ),
    },
    {
      key: "activeProgramLabel",
      label: "Active Program",
      icon: PlayCircle,
      sortable: true,
      sortValue: (row) => row.activeProgramLabel ?? "",
      render: (row) =>
        row.activeProgramLabel ? (
          <div className="flex flex-col">
            <span className="line-clamp-1 text-sm">
              {row.activeProgramLabel}
            </span>
            {row.enrollmentCount > 1 && (
              <span className="text-muted-foreground text-[11px]">
                +{row.enrollmentCount - 1} past program
                {row.enrollmentCount - 1 === 1 ? "" : "s"}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/50 text-xs">—</span>
        ),
    },
    {
      key: "sessionsCompleted",
      label: "Sessions",
      icon: CheckCircle2,
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
          {row.sessionsCompleted}
        </span>
      ),
    },
    {
      key: "lastSessionDate",
      label: "Last Session",
      icon: Hourglass,
      sortable: true,
      sortValue: (row) => row.lastSessionDate ?? "",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm">{formatDate(row.lastSessionDate)}</span>
          {row.lastSessionDate && (
            <span className="text-muted-foreground text-[11px]">
              {relativeDays(row.lastSessionDate, todayISO)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "paymentStatus",
      label: "Package",
      icon: CircleDollarSign,
      sortable: true,
      render: (row) =>
        row.paymentStatus ? (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 border",
              PAYMENT_META[row.paymentStatus].cls,
            )}
          >
            <CircleDollarSign className="size-3" />
            {PAYMENT_META[row.paymentStatus].label}
          </Badge>
        ) : (
          <span className="text-muted-foreground/50 text-xs">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      icon: PlayCircle,
      sortable: true,
      render: (row) => {
        const meta = STATUS_META[row.status];
        const Icon = meta.icon;
        return (
          <Badge variant="outline" className={cn("gap-1 border", meta.cls)}>
            <Icon className="size-3" />
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: "hasVaccineWarning",
      label: "Vaccines",
      icon: Syringe,
      sortable: true,
      defaultVisible: false,
      sortValue: (row) =>
        row.hasVaccineWarning ? -1 : (row.soonestVaccineDays ?? 1000),
      render: (row) =>
        row.hasVaccineWarning ? (
          <Badge
            variant="outline"
            className="gap-1 border-rose-200 bg-rose-50 text-rose-700"
            title={vaccineLabel(row)}
          >
            <AlertTriangle className="size-3" />
            {row.soonestVaccineDays !== null && row.soonestVaccineDays < 0
              ? "Expired"
              : "Expiring"}
          </Badge>
        ) : (
          <span className="text-muted-foreground/40 text-xs">OK</span>
        ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "waitlisted", label: "Waitlisted" },
        { value: "completed", label: "Completed" },
        { value: "dropped", label: "Dropped" },
      ],
    },
    {
      key: "paymentStatus",
      label: "Payment",
      options: [
        { value: "all", label: "All payments" },
        { value: "paid", label: "Paid" },
        { value: "deposit", label: "Deposit" },
        { value: "unpaid", label: "Unpaid" },
        { value: "refunded", label: "Refunded" },
        { value: "comped", label: "Comped" },
      ],
      filterFn: (row: TrainingStudentRow, v: string) =>
        row.paymentStatus === v,
    },
    {
      key: "vaccineWarning",
      label: "Vaccines",
      options: [
        { value: "all", label: "All vaccines" },
        { value: "warning", label: "Expiring / expired" },
        { value: "ok", label: "All clear" },
      ],
      filterFn: (row: TrainingStudentRow, v: string) =>
        v === "warning" ? row.hasVaccineWarning : !row.hasVaccineWarning,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Total Students"
          value={summary.total}
          icon={Users}
          tone="indigo"
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
        <KpiTile
          label="Vaccines expiring"
          value={summary.expiringVaccines}
          icon={ShieldAlert}
          tone={summary.expiringVaccines > 0 ? "rose" : "slate"}
          hint={
            summary.expiringVaccines > 0
              ? `within ${VACCINE_EXPIRY_WINDOW_DAYS} days`
              : "all clear"
          }
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by pet, owner, or breed…"
        getSearchValue={(row) =>
          [row.petName, row.petBreed, row.ownerName].join(" ")
        }
        itemsPerPage={15}
        onRowClick={(row) =>
          router.push(
            `/facility/dashboard/services/training/students/${row.petId}`,
          )
        }
        rowClassName={() => "cursor-pointer"}
      />

      {rows.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
          No students yet — pets show up here once they&apos;re enrolled in a
          training series.
        </div>
      )}

      <div className="text-muted-foreground rounded-xl border bg-slate-50/40 px-4 py-3 text-xs">
        <Button
          variant="link"
          className="text-muted-foreground p-0 text-xs"
          disabled
          title="Coming soon"
        >
          Tip — clicking any student row opens their Training Profile.
        </Button>
      </div>
    </div>
  );
}
