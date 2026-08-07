"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileArchive, Loader2, ShieldAlert } from "lucide-react";

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
// Everything this facility holds, as a file.
//
// ── THE COUNTS COME FIRST, ON PURPOSE ─────────────────────────────────────
//
// The tab shows what the export WOULD contain before anyone downloads it. A
// portability request answered with an empty file is worse than one answered
// late, and the counts are the only way to tell "this facility has no pets"
// from "the export is broken" without opening the ZIP.
//
// The old mock export made exactly that mistake: it matched clients by facility
// NAME against a fixture, so a provisioned facility got headers and no rows.
//
// ── DOWNLOADING IS A RECORDED ACT ─────────────────────────────────────────
//
// Producing the file writes an entry to the audit trail, and the screen says so
// before the button rather than after. Nobody should discover that from a log.
// ============================================================================

export function FacilityData({
  facilityId,
  facilityName,
}: {
  facilityId: string;
  facilityName: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "facility", facilityId, "export-summary"],
    queryFn: async (): Promise<{ datasets: ExportDataset[] }> => {
      const response = await fetch(
        `/api/facilities/${facilityId}/export?summary=1`,
      );
      if (!response.ok)
        throw new Error("Could not read what this facility holds.");
      return (await response.json()) as { datasets: ExportDataset[] };
    },
  });

  // A fetch rather than a plain link: a failure has to surface as a message
  // instead of navigating the admin to a JSON error page.
  const download = async () => {
    setDownloading(true);
    setProblem(null);
    try {
      const response = await fetch(`/api/facilities/${facilityId}/export`);
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
        Counting what this facility holds…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive p-6 text-sm">
        Could not read what this facility holds. Try again.
      </p>
    );
  }

  const total = data.datasets.reduce((sum, dataset) => sum + dataset.rows, 0);

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileArchive className="text-muted-foreground size-4" />
          Data export
        </CardTitle>
        <CardDescription>
          Everything {facilityName} holds, as a ZIP of CSV files — the shape a
          GDPR Article 20 portability request wants. {total.toLocaleString()}{" "}
          rows in total.
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
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          The file contains customers&rsquo; names, addresses and phone numbers.
          Downloading it writes an entry to this facility&rsquo;s log naming you
          and what was taken; if that entry cannot be written, the file is not
          produced.
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
          {downloading ? "Building the file…" : "Download export"}
        </Button>
      </CardContent>
    </Card>
  );
}
