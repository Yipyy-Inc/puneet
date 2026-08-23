"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  Search,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviewQueue, type ReviewListItem } from "@/lib/api/merchant-review";
import {
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_STYLE,
} from "@/lib/merchant-application/review";
import { cn } from "@/lib/utils";

// ============================================================================
// The queue a Yipyy administrator works.
//
// ── OPEN WORK BY DEFAULT ──────────────────────────────────────────────────
//
// Rejected and withdrawn applications accumulate for ever and are read roughly
// never. Listing them by default means that within a quarter the three rows
// that need somebody today are below thirty that need nobody. The toggle says
// how many are hidden, so nothing is silently missing.
//
// ── AND THE WAIT IS THE COLUMN THAT MATTERS ───────────────────────────────
//
// Not the status — a queue of five rows all reading "Submitted" tells a
// reviewer nothing about which to open. Days waiting does, and it is the number
// that turns into a complaint if nobody looks at it, so it is rendered with the
// weight that deserves and sorted oldest-first by the route.
// ============================================================================

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function money(cents: number | null): string {
  if (cents === null) return "—";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function ReviewQueueClient() {
  const router = useRouter();
  const [scope, setScope] = useState<"open" | "all">("open");
  const { data, isPending, error } = useReviewQueue(scope);

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          {error instanceof Error
            ? error.message
            : "The review queue could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  const rows = data.applications;
  const waiting = rows.filter((r) => r.status === "submitted").length;
  const inProgress = rows.filter((r) => r.status === "under_review").length;
  const withThem = rows.filter((r) => r.status === "more_info_needed").length;

  // The one number a reviewer is judged on. Computed over submitted-and-not-yet
  // -picked-up only: an application sitting in `more_info_needed` is waiting on
  // the facility, and counting that as our delay would flatter us.
  const oldestWait = rows
    .filter((r) => r.status === "submitted")
    .map((r) => daysSince(r.submittedAt))
    .filter((d): d is number => d !== null)
    .sort((a, b) => b - a)[0];

  const columns: ColumnDef<ReviewListItem>[] = [
    {
      key: "legalName",
      label: "Business",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.legalName ?? row.facilityName ?? "Unnamed"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {row.facilityName ?? "—"}
            {row.country ? ` · ${row.country}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={cn("whitespace-nowrap", REVIEW_STATUS_STYLE[row.status])}
        >
          {REVIEW_STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "submittedAt",
      label: "Waiting",
      align: "right",
      sortable: true,
      sortValue: (row) => daysSince(row.submittedAt) ?? -1,
      render: (row) => {
        const days = daysSince(row.submittedAt);
        if (days === null) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        // Only ours-to-answer statuses get the colour. An amber "9 days" beside
        // an application we are not blocking would be a reproach aimed at the
        // wrong party.
        const ours =
          row.status === "submitted" || row.status === "under_review";
        return (
          <span
            className={cn(
              "font-[tabular-nums] text-sm",
              ours && days >= 5 && "font-semibold text-rose-600",
              ours && days >= 2 && days < 5 && "text-amber-600",
            )}
          >
            {days === 0 ? "today" : `${days}d`}
          </span>
        );
      },
    },
    {
      key: "estimatedMonthlyVolumeCents",
      label: "Volume / month",
      align: "right",
      sortable: true,
      sortValue: (row) => row.estimatedMonthlyVolumeCents ?? -1,
      render: (row) => (
        <span className="font-[tabular-nums] text-sm">
          {money(row.estimatedMonthlyVolumeCents)}
        </span>
      ),
    },
    {
      key: "signedName",
      label: "Signed by",
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.signedName ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile
          label="Waiting for us"
          value={String(waiting)}
          icon={Inbox}
          hint={
            oldestWait === undefined
              ? "Nothing in the queue"
              : `Oldest has waited ${oldestWait === 0 ? "less than a day" : `${oldestWait} days`}`
          }
        />
        <KpiTile
          label="Being reviewed"
          value={String(inProgress)}
          icon={Search}
          hint="Somebody has picked these up"
        />
        <KpiTile
          label="Waiting on the facility"
          value={String(withThem)}
          icon={Clock}
          hint="We asked for more and have not had it"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {scope === "open" ? "Open applications" : "Every application"}
          </h2>
          <p className="text-muted-foreground text-sm">
            Oldest submission first. Click a row to read it and decide.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScope(scope === "open" ? "all" : "open")}
        >
          {scope === "open" ? (
            <>
              <CheckCircle2 className="size-4" />
              Show decided ones too
            </>
          ) : (
            <>
              <Inbox className="size-4" />
              Show only open work
            </>
          )}
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        onRowClick={(row) =>
          router.push(`/dashboard/commercial/merchant-applications/${row.id}`)
        }
        emptyState={{
          icon: ClipboardList,
          title:
            scope === "open"
              ? "Nothing waiting"
              : "No applications have been submitted",
          description:
            scope === "open"
              ? "Every submitted application has been decided. Switch the filter above to read the ones that were."
              : "When a facility completes the Yipyy Pay application, it arrives here.",
        }}
      />

      {scope === "open" && data.counts.closed > 0 && (
        <p className="text-muted-foreground text-sm">
          {data.counts.closed} decided{" "}
          {data.counts.closed === 1 ? "application is" : "applications are"}{" "}
          hidden.
        </p>
      )}
    </div>
  );
}
