"use client";

import dynamic from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ColumnDef, DataTable, FilterDef } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import type { AgingBucket, AgingInvoiceRow } from "@/lib/api/financial-report";

const InvoiceAgingBarChart = dynamic(
  () => import("./invoice-aging-bar-chart").then((m) => m.InvoiceAgingBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/40 text-muted-foreground flex h-[280px] w-full items-center justify-center rounded-md text-sm">
        Loading chart…
      </div>
    ),
  },
);

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function InvoiceAgingCard({
  aging,
  invoices,
  outstandingTotal,
}: {
  aging: AgingBucket[];
  invoices: AgingInvoiceRow[];
  outstandingTotal: number;
}) {
  const columns: ColumnDef<AgingInvoiceRow>[] = [
    {
      key: "number",
      label: "Invoice",
      render: (r) => <span className="font-mono text-xs">{r.number}</span>,
    },
    {
      key: "facility",
      label: "Facility",
      sortable: true,
      sortValue: (r) => r.facility,
      render: (r) => <span className="font-medium">{r.facility}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      sortValue: (r) => r.amount,
      render: (r) => <span className="tabular-nums">{money(r.amount)}</span>,
    },
    {
      key: "dueDate",
      label: "Due",
      sortable: true,
      sortValue: (r) => r.dueDate,
    },
    {
      key: "daysOverdue",
      label: "Days Overdue",
      sortable: true,
      sortValue: (r) => r.daysOverdue,
      render: (r) =>
        r.daysOverdue > 0 ? (
          <span className="font-medium text-rose-600 dark:text-rose-400">
            {r.daysOverdue}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "bucket",
      label: "Aging",
      render: (r) => <Badge variant="outline">{r.bucket}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge
          variant="outline"
          className={cn(
            r.status === "Overdue"
              ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
              : "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
          )}
        >
          {r.status}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "bucket",
      label: "Aging",
      options: [
        { value: "all", label: "All Ages" },
        ...aging.map((b) => ({ value: b.bucket, label: b.bucket })),
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "Sent", label: "Sent" },
        { value: "Overdue", label: "Overdue" },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Aging</CardTitle>
        <CardDescription>
          Outstanding receivables by age · {money(outstandingTotal)} total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <InvoiceAgingBarChart data={aging} />
        <DataTable
          data={invoices}
          columns={columns}
          filters={filters}
          searchKey="facility"
          searchPlaceholder="Search facilities..."
          itemsPerPage={8}
        />
      </CardContent>
    </Card>
  );
}
