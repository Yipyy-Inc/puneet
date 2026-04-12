"use client";

import { useState } from "react";
import { DataTable, type ColumnDef, type FilterDef } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  CalendarDays,
  TrendingUp,
  CircleDot,
  Clock,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Inbox,
  Settings2,
} from "lucide-react";
import type { UnfinishedBooking, UnfinishedBookingNote, AbandonmentStep, UnfinishedBookingStatus } from "@/types/unfinished-booking";
import {
  ABANDONMENT_STEP_LABELS,
  UNFINISHED_STATUS_LABELS,
} from "@/data/unfinished-bookings";
import { AbandonmentRecoverySettings } from "@/components/bookings/AbandonmentRecoverySettings";
import { UnfinishedBookingDetailSheet } from "@/components/bookings/UnfinishedBookingDetailSheet";

interface Props {
  data: UnfinishedBooking[];
}

function StepProgressBadge({ step }: { step: AbandonmentStep }) {
  const config = ABANDONMENT_STEP_LABELS[step];
  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <span className="text-xs font-medium">{config.label}</span>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${config.progress}%` }}
        />
      </div>
      <span className="text-muted-foreground text-[10px]">
        {config.progress}% completed
      </span>
    </div>
  );
}

function StatusBadgeUnfinished({ status }: { status: UnfinishedBookingStatus }) {
  const config = UNFINISHED_STATUS_LABELS[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString);
  const now = new Date("2026-04-11T00:00:00Z"); // mock today
  const diffMs = now.getTime() - then.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function formatShortDate(iso: string): string {
  return new Date(iso + (iso.includes("T") ? "" : "T00:00:00")).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" },
  );
}

export function UnfinishedBookingsTable({ data: initialData }: Props) {
  const [records, setRecords] = useState<UnfinishedBooking[]>(initialData);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedBooking = records.find((r) => r.id === selectedId) ?? null;

  const markAs = (id: string, status: UnfinishedBookingStatus) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              lastContactedAt:
                status === "contacted" || status === "recovered"
                  ? new Date().toISOString()
                  : r.lastContactedAt,
            }
          : r,
      ),
    );
    const label = UNFINISHED_STATUS_LABELS[status].label;
    toast.success(`Marked as ${label}`);
  };

  const handleSchedule = (record: UnfinishedBooking) => {
    // Pre-fill booking wizard with known info — for now toast a message
    toast.info(
      `Opening booking wizard for ${record.clientName}${record.service ? ` — ${record.service}` : ""}`,
    );
  };

  const handleSendEmail = (record: UnfinishedBooking) => {
    toast.success(`Recovery email sent to ${record.clientEmail}`);
    markAs(record.id, "contacted");
  };

  const handleAddNote = (id: string, note: UnfinishedBookingNote) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, notes: [...(r.notes ?? []), note] } : r,
      ),
    );
  };

  const columns: ColumnDef<UnfinishedBooking>[] = [
    {
      key: "client",
      label: "Client",
      icon: User,
      defaultVisible: true,
      sortable: true,
      sortValue: (r) => r.clientName,
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-[160px]">
          <span className="font-medium text-sm">{r.clientName}</span>
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            <Mail className="size-3 shrink-0" />
            {r.clientEmail}
          </span>
          {r.clientPhone && (
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Phone className="size-3 shrink-0" />
              {r.clientPhone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "pet",
      label: "Pet",
      icon: User,
      defaultVisible: true,
      render: (r) =>
        r.petName ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{r.petName}</span>
            {r.petType && (
              <span className="text-muted-foreground text-xs capitalize">
                {r.petType}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "service",
      label: "Service",
      icon: CalendarDays,
      defaultVisible: true,
      sortable: true,
      sortValue: (r) => r.service ?? "",
      render: (r) =>
        r.service ? (
          <div className="flex flex-col gap-0.5">
            <Badge variant="outline" className="capitalize w-fit">
              {r.service}
            </Badge>
            {r.serviceType && (
              <span className="text-muted-foreground text-xs capitalize">
                {r.serviceType.replace(/_/g, " ")}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Not selected</span>
        ),
    },
    {
      key: "abandonmentStep",
      label: "Abandoned Step",
      icon: TrendingUp,
      defaultVisible: true,
      sortable: true,
      sortValue: (r) => ABANDONMENT_STEP_LABELS[r.abandonmentStep].progress,
      render: (r) => <StepProgressBadge step={r.abandonmentStep} />,
    },
    {
      key: "abandonedAt",
      label: "Abandoned",
      icon: Clock,
      defaultVisible: true,
      sortable: true,
      sortValue: (r) => r.abandonedAt,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{formatRelativeTime(r.abandonedAt)}</span>
          {r.requestedStartDate && (
            <span className="text-muted-foreground text-xs">
              Wanted: {formatShortDate(r.requestedStartDate)}
              {r.requestedEndDate &&
                r.requestedEndDate !== r.requestedStartDate &&
                ` → ${formatShortDate(r.requestedEndDate)}`}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "estimatedValue",
      label: "Est. Value",
      icon: TrendingUp,
      defaultVisible: true,
      sortable: true,
      sortValue: (r) => r.estimatedValue ?? 0,
      render: (r) =>
        r.estimatedValue != null ? (
          <span className="price-value font-semibold">
            ${r.estimatedValue.toFixed(0)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      icon: CircleDot,
      defaultVisible: true,
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <div className="flex flex-col gap-1">
          <StatusBadgeUnfinished status={r.status} />
          {r.lastContactedAt && (
            <span className="text-muted-foreground text-[10px]">
              Contacted {formatRelativeTime(r.lastContactedAt)}
            </span>
          )}
          {(r.notes?.length ?? 0) > 0 && (
            <span className="text-muted-foreground text-[10px] flex items-center gap-0.5">
              <MessageSquare className="size-3" />
              {r.notes!.length} note{r.notes!.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (r) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleSchedule(r);
            }}
          >
            <CalendarDays className="size-3 mr-1" />
            Schedule
          </Button>
          {r.status !== "recovered" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleSendEmail(r);
              }}
            >
              <MessageSquare className="size-3 mr-1" />
              Email
            </Button>
          )}
          {r.status === "abandoned" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                markAs(r.id, "contacted");
              }}
            >
              <CheckCircle2 className="size-3 mr-1" />
              Mark Contacted
            </Button>
          )}
          {r.status !== "recovered" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                markAs(r.id, "recovered");
              }}
            >
              <RefreshCw className="size-3 mr-1" />
              Recovered
            </Button>
          )}
        </div>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "abandoned", label: "Abandoned" },
        { value: "contacted", label: "Contacted" },
        { value: "recovered", label: "Recovered" },
      ],
    },
    {
      key: "service",
      label: "Service",
      options: [
        { value: "all", label: "All Services" },
        { value: "boarding", label: "Boarding" },
        { value: "daycare", label: "Daycare" },
        { value: "grooming", label: "Grooming" },
        { value: "training", label: "Training" },
      ],
    },
    {
      key: "abandonmentStep",
      label: "Abandoned Step",
      options: [
        { value: "all", label: "All Steps" },
        { value: "service_selection", label: "Service Selection" },
        { value: "pet_selection", label: "Pet Selection" },
        { value: "date_and_details", label: "Date & Details" },
        { value: "add_ons", label: "Add-ons" },
        { value: "forms", label: "Forms" },
        { value: "review", label: "Review" },
        { value: "payment", label: "Payment" },
      ],
    },
  ];

  // Summary stats
  const abandoned = records.filter((r) => r.status === "abandoned").length;
  const contacted = records.filter((r) => r.status === "contacted").length;
  const recovered = records.filter((r) => r.status === "recovered").length;
  const totalEstimated = records
    .filter((r) => r.status !== "recovered" && r.estimatedValue != null)
    .reduce((sum, r) => sum + (r.estimatedValue ?? 0), 0);

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Inbox className="text-muted-foreground/40 mb-4 size-16" />
          <h3 className="text-lg font-semibold mb-1">No unfinished bookings</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            When clients start but don't complete a reservation, they'll appear here so you can follow up.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Settings sheet */}
      <AbandonmentRecoverySettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Detail sheet */}
      <UnfinishedBookingDetailSheet
        booking={selectedBooking}
        onClose={() => setSelectedId(null)}
        onMarkAs={markAs}
        onAddNote={handleAddNote}
        onSendEmail={handleSendEmail}
        onSchedule={handleSchedule}
      />

      {/* Header row: summary strip + settings button */}
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Abandoned
          </p>
          <p className="text-2xl font-bold text-amber-600">{abandoned}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Contacted
          </p>
          <p className="text-2xl font-bold text-blue-600">{contacted}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Recovered
          </p>
          <p className="text-2xl font-bold text-emerald-600">{recovered}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Revenue at Risk
          </p>
          <p className="price-value text-2xl font-bold">
            ${totalEstimated.toLocaleString()}
          </p>
        </div>
        </div>

        {/* Settings button */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="size-4" />
          Recovery Settings
        </Button>
      </div>

      {/* Recovery tip */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
        <ShoppingBag className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-amber-800 dark:text-amber-300 text-sm">
          <span className="font-semibold">Recovery tip:</span> Clients who abandoned at the{" "}
          <span className="font-medium">payment</span> or{" "}
          <span className="font-medium">review</span> step are most likely to complete their
          booking — reach out to them first.
        </p>
      </div>

      <DataTable
        data={records as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        filters={filters}
        searchKeys={["clientName", "clientEmail"] as never[]}
        searchPlaceholder="Search by name or email…"
        itemsPerPage={10}
        onRowClick={(item) => {
          const record = item as unknown as UnfinishedBooking;
          setSelectedId(record.id);
        }}
      />
    </div>
  );
}
