"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { importQueries } from "@/lib/api/imports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ImportHistoryRecord, ImportStatus } from "@/types/import";
import { SourceLogo } from "./source-logo";

const ImportWizard = dynamic(
  () => import("./import-wizard/import-wizard").then((m) => m.ImportWizard),
  { ssr: false },
);

const STATUS_BADGE: Record<ImportStatus, string> = {
  completed:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  partial:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  undone: "border-muted bg-muted text-muted-foreground",
  in_progress:
    "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
};

const STATUS_LABEL: Record<ImportStatus, string> = {
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
  undone: "Undone",
  in_progress: "In progress",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ImportHistoryClient() {
  const { data, isLoading } = useQuery(importQueries.history());
  const [wizardOpen, setWizardOpen] = useState(false);

  const columns: ColumnDef<ImportHistoryRecord>[] = [
    {
      key: "facilityName",
      label: "Facility",
      sortable: true,
      render: (r) => (
        <Link
          href={`/dashboard/facilities/${r.facilityId}`}
          className="font-medium hover:underline"
        >
          {r.facilityName}
        </Link>
      ),
    },
    {
      key: "sourceName",
      label: "Source Software",
      sortable: true,
      render: (r) => (
        <span className="flex items-center gap-2">
          <SourceLogo sourceId={r.sourceId} size="sm" />
          {r.sourceName}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (r) => formatDate(r.date),
    },
    {
      key: "imported",
      label: "Imported",
      sortable: false,
      render: (r) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          <span className="text-foreground font-medium">{r.customers}</span>{" "}
          cust · <span className="text-foreground font-medium">{r.pets}</span>{" "}
          pets ·{" "}
          <span className="text-foreground font-medium">{r.bookings}</span> bkg
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge variant="outline" className={cn(STATUS_BADGE[r.status])}>
          {STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    { key: "importedBy", label: "Imported By", sortable: true },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Import</h1>
          <p className="text-muted-foreground">
            Migrate customers, pets and bookings from another platform.
          </p>
        </div>
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setWizardOpen(true)}
        >
          <Plus className="mr-2 size-4" />
          Start New Import
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <DataTable
          data={data ?? []}
          columns={columns}
          searchKeys={["facilityName", "sourceName", "importedBy"]}
          searchPlaceholder="Search facility, source, or importer…"
          itemsPerPage={12}
        />
      )}

      {wizardOpen && <ImportWizard onClose={() => setWizardOpen(false)} />}
    </div>
  );
}
