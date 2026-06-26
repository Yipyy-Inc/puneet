"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Download,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { facilities } from "@/data/facilities";
import { getImportSource } from "@/data/import-sources";
import { toCsv } from "@/lib/parsers/csv";
import { importCounts, runValidation } from "@/lib/parsers/validate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { primaryFile, type WizardStepProps } from "./wizard-types";

export function StepImportComplete({ draft, onCancel }: WizardStepProps) {
  const router = useRouter();
  const primary = primaryFile(draft);
  const facility = facilities.find((f) => f.id === draft.facilityId);
  const source = draft.sourceId ? getImportSource(draft.sourceId) : null;

  const { total, importable, counts } = useMemo(() => {
    if (!primary)
      return {
        total: 0,
        importable: 0,
        counts: { customers: 0, pets: 0, bookings: 0 },
      };
    const { result, severities } = runValidation(
      primary.columns,
      primary.rows,
      draft.mapping,
    );
    return {
      total: result.total,
      importable: result.total - result.errors,
      counts: importCounts(
        primary.columns,
        primary.rows,
        draft.mapping,
        severities,
      ),
    };
  }, [primary, draft.mapping]);

  const [processed, setProcessed] = useState(0);
  const [done, setDone] = useState(importable === 0);

  useEffect(() => {
    if (importable === 0) return;
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(
        importable,
        current + Math.max(1, Math.ceil(importable / 20)),
      );
      setProcessed(current);
      if (current >= importable) {
        clearInterval(id);
        setDone(true);
      }
    }, 70);
    return () => clearInterval(id);
  }, [importable]);

  function downloadReport() {
    const rows = [
      ["Facility", facility?.name ?? ""],
      ["Source", source?.name ?? ""],
      ["Customers imported", String(counts.customers)],
      ["Pets imported", String(counts.pets)],
      ["Bookings imported", String(counts.bookings)],
      ["Rows skipped", String(total - importable)],
    ];
    const blob = new Blob([toCsv(["Field", "Value"], rows)], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function viewProfile() {
    onCancel();
    router.push(`/dashboard/facilities/${draft.facilityId}`);
  }

  const pct = importable > 0 ? Math.round((processed / importable) * 100) : 100;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
      {!done ? (
        <div className="w-full max-w-md space-y-4 text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-violet-600 dark:text-violet-400" />
          <div>
            <p className="text-lg font-semibold">Importing records…</p>
            <p className="text-muted-foreground text-sm">
              {source?.name} → {facility?.name}
            </p>
          </div>
          <Progress value={pct} />
          <p className="text-muted-foreground text-sm tabular-nums">
            {processed.toLocaleString()} of {importable.toLocaleString()}{" "}
            records
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-5 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div>
            <h3 className="text-xl font-bold tracking-tight">
              Import complete
            </h3>
            <p className="text-muted-foreground text-sm">
              {source?.name} data imported into {facility?.name}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <CountTile label="Customers" value={counts.customers} />
            <CountTile label="Pets" value={counts.pets} />
            <CountTile label="Bookings" value={counts.bookings} />
          </div>
          {total - importable > 0 && (
            <p className="text-muted-foreground text-xs">
              {total - importable} row{total - importable === 1 ? "" : "s"}{" "}
              skipped due to errors.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={viewProfile}
            >
              <Building2 className="mr-2 size-4" />
              View Facility Profile
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={downloadReport}>
                <Download className="mr-2 size-4" />
                Import Report
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.success(`Import undone for ${facility?.name}`)
                }
              >
                <RotateCcw className="mr-2 size-4" />
                Undo
              </Button>
            </div>
            <Badge variant="outline" className="mx-auto w-fit">
              Undo available for 24 hours
            </Badge>
            <Button variant="ghost" onClick={onCancel}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border py-3">
      <p className="text-2xl font-bold tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
