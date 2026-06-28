"use client";

import { toast } from "sonner";
import { Download, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ColumnDef, DataTable, FilterDef } from "@/components/ui/DataTable";
import type { ChurnedLogRow } from "@/lib/api/churn";

function fmtTenure(m: number): string {
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  return r ? `${y}y ${r}m` : `${y}y`;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values)).map((v) => ({ value: v, label: v }));
}

export function ChurnedFacilityLog({
  rows,
  mrrLost,
}: {
  rows: ChurnedLogRow[];
  mrrLost: number;
}) {
  const columns: ColumnDef<ChurnedLogRow>[] = [
    {
      key: "name",
      label: "Facility",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "tier",
      label: "Tier",
      render: (r) => <Badge variant="outline">{r.tier}</Badge>,
    },
    {
      key: "tenureMonths",
      label: "Tenure",
      sortable: true,
      sortValue: (r) => r.tenureMonths,
      render: (r) => fmtTenure(r.tenureMonths),
    },
    {
      key: "mrr",
      label: "MRR Lost",
      sortable: true,
      sortValue: (r) => r.mrr,
      render: (r) => (
        <span className="tabular-nums">${r.mrr.toLocaleString()}/mo</span>
      ),
    },
    { key: "reason", label: "Reason" },
    {
      key: "churnedLabel",
      label: "Date Churned",
      sortable: true,
      sortValue: (r) => r.churnedAt,
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "tier",
      label: "Tier",
      options: [
        { value: "all", label: "All Tiers" },
        ...uniqueOptions(rows.map((r) => r.tier)),
      ],
    },
    {
      key: "reason",
      label: "Reason",
      options: [
        { value: "all", label: "All Reasons" },
        ...uniqueOptions(rows.map((r) => r.reason)),
      ],
    },
  ];

  function exportCsv() {
    const headers = [
      "Facility",
      "Tier",
      "Plan",
      "Tenure (months)",
      "MRR Lost (USD)",
      "Reason",
      "Date Churned",
    ];
    const lines = [
      headers,
      ...rows.map((r) => [
        r.name,
        r.tier,
        r.plan,
        r.tenureMonths,
        r.mrr,
        r.reason,
        r.churnedAt,
      ]),
    ];
    const csv = lines.map((l) => l.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "churned-facilities.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} churned facilities`);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Churned Facility Log</CardTitle>
          <CardDescription>
            {rows.length} facilities · ${mrrLost.toLocaleString()}/mo MRR lost
            (last 12 months)
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          data={rows}
          columns={columns}
          filters={filters}
          searchKey="name"
          searchPlaceholder="Search facilities..."
          itemsPerPage={10}
          emptyState={{
            icon: TrendingDown,
            title: "No churned facilities",
            description: "No facilities have churned in the last 12 months.",
          }}
        />
      </CardContent>
    </Card>
  );
}
