"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Download,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { hoursLabel, payrollQueries } from "@/lib/api/payroll";
import { formatCurrency } from "@/lib/format";
import type { PayrollLine } from "@/app/api/payroll/route";

// ============================================================================
// What we owe people for a period that has ended.
//
// ── WHO THIS IS FOR ───────────────────────────────────────────────────────
//
// The ACCOUNTANT, who until now held `view_payroll` and could reach no screen
// that used it: they are staff-level (ADR 0005) and every surface showing money
// lived in the admin-only /facility portal. This renders inside the staff shell
// behind `RequirePermission`, so the permission they already had finally has
// somewhere to be spent — without widening the portal boundary or inventing a
// third access level.
//
// ── IT IS NOT THE CALENDAR'S LABOUR-COST TILE ─────────────────────────────
//
// That one forecasts what a PLANNED week will cost. This counts what people
// actually worked. Two different numbers from two different tables, and
// conflating them is what hid the gap.
//
// ── UNPRICED HOURS ARE SHOWN, NOT SWALLOWED ───────────────────────────────
//
// An hour is priced by the position of the shift it was worked against, so two
// things have no price: a session with no shift (somebody covered) and a
// position with no rate set. Both are real work. Folding them into zero would
// understate the wage bill and look tidy doing it — so they get their own tile,
// their own column, and a warning strip when there are any.
// ============================================================================

const PERIODS = [
  { value: "14", label: "Last 14 days" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
] as const;

export function PayrollView() {
  // No period on the first load: the server picks one in the FACILITY's
  // calendar and says which, because the browser cannot work out "the last
  // fortnight at this facility" before it knows where the facility is.
  const [period, setPeriod] = useState<string | null>(null);

  // The server-decided period. Always runs, and its answer carries the
  // facility's timezone — which is what makes the presets below computable.
  const {
    data: initial,
    isPending,
    error,
  } = useQuery(payrollQueries.summary());

  const picked = useMemo(() => {
    if (!period || !initial?.timeZone) return null;
    const day = (offset: number) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: initial.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(Date.now() + offset * 86_400_000));
    return { from: day(-(Number(period) - 1)), to: day(0) };
  }, [period, initial?.timeZone]);

  const { data: scoped } = useQuery({
    ...payrollQueries.summary(picked?.from, picked?.to),
    enabled: Boolean(picked),
  });

  const shown = picked ? (scoped ?? initial) : initial;
  const lines = useMemo(() => shown?.lines ?? [], [shown]);
  const totals = shown?.totals;

  const columns: ColumnDef<PayrollLine>[] = [
    { key: "employeeName", label: "Employee", sortable: true },
    {
      key: "sessions",
      label: "Sessions",
      align: "right",
      sortable: true,
      sortValue: (line) => line.sessions,
    },
    {
      key: "hourlyMinutes",
      label: "Paid hours",
      align: "right",
      sortable: true,
      sortValue: (line) => line.hourlyMinutes,
      render: (line) =>
        line.hourlyMinutes > 0 ? (
          hoursLabel(line.hourlyMinutes)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "salariedMinutes",
      label: "Salaried hours",
      align: "right",
      sortable: true,
      sortValue: (line) => line.salariedMinutes,
      // Worked, and real — but this person's pay does not come from them, so
      // there is no gross beside it and inventing one would be a number nobody
      // agreed to.
      render: (line) =>
        line.salariedMinutes > 0 ? (
          <span title="Worked, but this position is salaried">
            {hoursLabel(line.salariedMinutes)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "unpricedMinutes",
      label: "Unpriced",
      align: "right",
      sortable: true,
      sortValue: (line) => line.unpricedMinutes,
      render: (line) =>
        line.unpricedMinutes > 0 ? (
          <span
            className="font-medium text-amber-600 dark:text-amber-400"
            title="No shift, or the position has no rate set"
          >
            {hoursLabel(line.unpricedMinutes)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "gross",
      label: "Gross",
      align: "right",
      sortable: true,
      sortValue: (line) => line.gross,
      render: (line) => (
        <span className="font-semibold">{formatCurrency(line.gross)}</span>
      ),
    },
  ];

  function exportCsv() {
    const header = [
      "Employee",
      "Sessions",
      "Paid minutes",
      "Salaried minutes",
      "Unpriced minutes",
      "Gross",
    ];
    const rows = lines.map((line) => [
      line.employeeName,
      line.sessions,
      line.hourlyMinutes,
      line.salariedMinutes,
      line.unpricedMinutes,
      line.gross.toFixed(2),
    ]);
    // Minutes rather than "8h 05m" — a spreadsheet has to be able to add them
    // up, and a payroll run is exactly what somebody does next with this.
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-${shown?.from ?? ""}-to-${shown?.to ?? ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Hours actually worked, from the time clock.{" "}
            {shown ? (
              <span className="text-foreground font-medium">
                {shown.from} to {shown.to}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border">
            {PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                data-active={
                  (period ?? "14") === option.value ? "true" : undefined
                }
                className="data-active:bg-primary data-active:text-primary-foreground px-3 py-1.5 text-xs font-medium transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={lines.length === 0}
          >
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-rose-200 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:text-rose-400">
          {(error as Error).message}
        </Card>
      ) : null}

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiTile
            label="Gross"
            value={formatCurrency(totals?.gross ?? 0)}
            hint="Hourly positions only"
            icon={DollarSign}
            tone="emerald"
          />
          <KpiTile
            label="Paid hours"
            value={hoursLabel(totals?.hourlyMinutes ?? 0)}
            hint={`${lines.length} ${lines.length === 1 ? "person" : "people"}`}
            icon={Clock}
            tone="indigo"
          />
          <KpiTile
            label="Unpriced hours"
            value={hoursLabel(totals?.unpricedMinutes ?? 0)}
            hint="No shift, or no rate set"
            icon={AlertTriangle}
            tone={totals?.unpricedMinutes ? "amber" : "slate"}
          />
          <KpiTile
            label="Still clocked in"
            value={totals?.openSessions ?? 0}
            hint="Not counted in the totals"
            icon={Users}
            tone={totals?.openSessions ? "amber" : "slate"}
          />
        </div>
      )}

      {/* A period closed over hours that have not finished happening is a pay
          run somebody has to redo. */}
      {totals && totals.openSessions > 0 ? (
        <Card className="flex items-start gap-2.5 border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            <span className="font-medium">
              {totals.openSessions}{" "}
              {totals.openSessions === 1 ? "session is" : "sessions are"} still
              open.
            </span>{" "}
            Those hours are not in the figures above — they have not finished
            yet.
          </p>
        </Card>
      ) : null}

      {totals && totals.unpricedMinutes > 0 ? (
        <Card className="flex items-start gap-2.5 border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            <span className="font-medium">
              {hoursLabel(totals.unpricedMinutes)} could not be priced.
            </span>{" "}
            Those sessions were either worked without a rostered shift, or
            against a position with no pay rate set. The gross above does not
            include them.
          </p>
        </Card>
      ) : null}

      {isPending ? (
        <Card className="space-y-3 p-5">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </Card>
      ) : (
        <DataTable
          data={lines}
          columns={columns}
          searchKey="employeeName"
          searchPlaceholder="Search staff…"
          emptyState={{
            icon: Clock,
            title: "Nobody clocked in during this period",
            description:
              "Payroll is built from the time clock. Once staff clock in and out, their hours appear here.",
          }}
        />
      )}
    </div>
  );
}
