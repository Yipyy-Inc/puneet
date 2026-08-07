"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileArchive, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExportDataset } from "@/lib/api/facility-export";

// ============================================================================
// Your facility's data, as a file.
//
// Replaces a screen that handed every owner facility 11's fictional records —
// a literal id from the mock era, passed into a component that reads
// src/data/*. This one asks the server, and the server takes the facility from
// the caller's membership; there is no id anywhere in the request to be wrong
// about.
//
// ── NO DATASET CHECKBOXES ─────────────────────────────────────────────────
//
// The old screen let you tick which of the five files to include. It was a
// choice with no consequence — the ZIP is a few hundred kilobytes and a
// partial export is a worse answer to every question anybody asks of it,
// starting with "is this everything?". The counts are shown instead, which is
// the information the checkboxes were standing in for.
// ============================================================================

export function OwnDataExport() {
  const [downloading, setDownloading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["facility", "own-export-summary"],
    queryFn: async (): Promise<{ datasets: ExportDataset[] }> => {
      const response = await fetch("/api/facility/export?summary=1");
      if (!response.ok) {
        throw new Error("Could not read what your facility holds.");
      }
      return (await response.json()) as { datasets: ExportDataset[] };
    },
  });

  const download = async () => {
    setDownloading(true);
    setProblem(null);
    try {
      const response = await fetch("/api/facility/export");
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "The export failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const named = /filename="([^"]+)"/.exec(disposition)?.[1];

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = named ?? "facility-export.zip";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The export failed.");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Counting your records…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive p-6 text-sm">
        Could not read what your facility holds. Try again.
      </p>
    );
  }

  const total = data.datasets.reduce((sum, dataset) => sum + dataset.rows, 0);

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileArchive className="text-muted-foreground size-4" />
          Everything you hold with us
        </CardTitle>
        <CardDescription>
          {total.toLocaleString()} rows across {data.datasets.length} files, as
          CSV in a single ZIP. Yours to keep, move or hand to anyone who asks
          for it.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="divide-y rounded-lg border">
          {data.datasets.map((dataset) => (
            <li
              key={dataset.key}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{dataset.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {dataset.filename}
                </span>
              </span>
              <span className="tabular-nums">
                {dataset.rows > 0 ? (
                  dataset.rows.toLocaleString()
                ) : (
                  <span className="text-muted-foreground">none</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          The file contains your customers&rsquo; personal details. It is built
          on request and never stored — the download link is not a URL anyone
          else can follow.
        </p>

        {problem && (
          <p className="text-destructive text-sm" role="alert">
            {problem}
          </p>
        )}

        <Button
          onClick={download}
          disabled={downloading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {downloading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          {downloading ? "Building your file…" : "Download my data"}
        </Button>
      </CardContent>
    </Card>
  );
}
