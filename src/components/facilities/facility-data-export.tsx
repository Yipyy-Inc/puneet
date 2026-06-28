"use client";

import { useState } from "react";

import { Building2, Download, FileArchive, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { facilities } from "@/data/facilities";
import {
  EXPORT_TYPES,
  downloadFacilityExport,
  exportCounts,
  facilityName,
} from "@/lib/facility-export";

export function FacilityDataExport({
  defaultFacilityId,
  lockToOwn = false,
}: {
  defaultFacilityId: number;
  lockToOwn?: boolean;
}) {
  const [facilityId, setFacilityId] = useState(defaultFacilityId);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(EXPORT_TYPES.map((t) => t.key)),
  );

  const name = facilityName(facilityId);
  const counts = exportCounts(facilityId);
  const q = query.trim().toLowerCase();
  const matches = q
    ? facilities
        .filter((f) => f.name.toLowerCase().includes(q) && f.id !== facilityId)
        .slice(0, 6)
    : [];

  const toggle = (key: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const exportNow = () => {
    if (selected.size === 0) {
      toast.error("Select at least one data type");
      return;
    }
    downloadFacilityExport(
      facilityId,
      EXPORT_TYPES.filter((t) => selected.has(t.key)).map((t) => t.key),
    );
    toast.success(`Exported ${name} — ${selected.size} file(s)`);
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Download className="size-5" />
          Facility Data Export
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Download all of a facility&rsquo;s data as a ZIP of CSV files.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* GDPR / purpose banner */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            Required for <strong>GDPR Article 20</strong> data portability,
            offboarding, and backups. Each CSV includes a header row and the
            full data set.
          </span>
        </div>

        {/* Facility selector */}
        {lockToOwn ? (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Building2 className="text-muted-foreground size-4" />
            <span className="font-medium">{name}</span>
            <Badge variant="outline" className="ml-auto">
              Your facility
            </Badge>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="facility-search">Facility</Label>
            <div className="bg-muted/40 flex items-center gap-2 rounded-lg border p-3">
              <Building2 className="text-muted-foreground size-4" />
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground text-xs">selected</span>
            </div>
            <Input
              id="facility-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search facilities to export…"
            />
            {matches.length > 0 && (
              <div className="divide-y rounded-lg border">
                {matches.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    onClick={() => {
                      setFacilityId(f.id);
                      setQuery("");
                    }}
                  >
                    <Building2 className="text-muted-foreground size-4" />
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data-type checklist */}
        <div className="space-y-2">
          <Label>Data to include</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXPORT_TYPES.map((t) => (
              <label
                key={t.key}
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm"
              >
                <Checkbox
                  checked={selected.has(t.key)}
                  onCheckedChange={() => toggle(t.key)}
                  aria-label={t.label}
                />
                <span className="font-medium">{t.label}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {t.filename}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {counts[t.key] ?? 0}
                </Badge>
              </label>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <FileArchive className="size-3.5" />
            Downloads a <span className="font-mono">.zip</span> of the selected
            CSVs.
          </p>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={selected.size === 0}
            onClick={exportNow}
          >
            <Download className="mr-2 size-4" />
            Export ZIP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
