"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CircleCheck, FileX } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataTable,
  type ColumnDef,
  type FilterDef,
} from "@/components/ui/DataTable";
import { Download } from "lucide-react";
import { downloadReportCsv } from "@/lib/report-export";
import { useAllAgreements } from "@/lib/agreements-store";
import {
  buildAgreementsReport,
  type AgreementReportRow,
  type AgreementReportStatus,
} from "@/lib/api/agreements-report";

const STATUS_BADGE: Record<AgreementReportStatus, string> = {
  Missing:
    "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  Expired:
    "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AgreementsReportClient() {
  const agreements = useAllAgreements();
  const report = useMemo(
    () => buildAgreementsReport(agreements, new Date()),
    [agreements],
  );
  const { rows, kpis } = report;

  const columns: ColumnDef<AgreementReportRow>[] = [
    {
      key: "facility",
      label: "Facility",
      sortable: true,
      sortValue: (r) => r.facility,
      render: (r) => <span className="font-medium">{r.facility}</span>,
    },
    {
      key: "agreementType",
      label: "Agreement Type",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span>{r.agreementName}</span>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {r.agreementType}
          </Badge>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <Badge
          variant="outline"
          className={`px-2 py-0 text-[11px] font-medium ${STATUS_BADGE[r.status]}`}
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: "expiresAt",
      label: "Expiry Date",
      sortable: true,
      // Missing (no expiry) sorts as most urgent (top, ascending).
      sortValue: (r) => (r.expiresAt ? new Date(r.expiresAt).getTime() : 0),
      render: (r) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDate(r.expiresAt)}
        </span>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "Missing", label: "Missing" },
        { value: "Expired", label: "Expired" },
        { value: "Active", label: "Active" },
      ],
    },
  ];

  const exportCsv = () => {
    const header = ["Facility", "Agreement Type", "Status", "Expiry Date"];
    const body = rows.map((r) => [
      r.facility,
      r.agreementName,
      r.status,
      r.expiresAt ? formatDate(r.expiresAt) : "",
    ]);
    downloadReportCsv("agreements-report", [header, ...body]);
    toast.success(`Exported ${rows.length} agreement records`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Missing"
          value={kpis.missing}
          hint="No signed agreement on file"
          icon={FileX}
          tone={kpis.missing > 0 ? "rose" : "slate"}
        />
        <KpiTile
          label="Expired"
          value={kpis.expired}
          hint="Past renewal date"
          icon={CalendarClock}
          tone={kpis.expired > 0 ? "amber" : "slate"}
        />
        <KpiTile
          label="Active"
          value={kpis.active}
          hint="Current & in force"
          icon={CircleCheck}
          tone="emerald"
        />
        <KpiTile
          label="Facilities at Risk"
          value={kpis.facilitiesAtRisk}
          hint="With a missing or expired agreement"
          icon={AlertTriangle}
          tone={kpis.facilitiesAtRisk > 0 ? "rose" : "slate"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Agreement Compliance</CardTitle>
            <CardDescription>
              Facilities with missing or expired legal agreements. Sourced from
              each facility&apos;s Agreements tab; sort by expiry date to
              prioritise renewals.
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
            getSearchValue={(r) =>
              `${r.facility} ${r.agreementName} ${r.agreementType} ${r.status}`
            }
            searchPlaceholder="Search facility or agreement…"
            itemsPerPage={15}
            emptyState={{
              icon: CircleCheck,
              title: "No agreements to review",
              description:
                "Every facility's required agreements are current — nothing missing or expired.",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
