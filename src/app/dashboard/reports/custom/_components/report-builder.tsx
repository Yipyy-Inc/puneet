"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  Plus,
  Save,
  X,
} from "lucide-react";

import {
  buildReportCsv,
  defaultConfig,
  getSource,
  OPS_BY_TYPE,
  REPORT_SOURCES,
  runReport,
  type ReportConfig,
  type ReportField,
  type ReportFilter,
  type ReportResult,
} from "@/lib/report-data-sources";
import {
  createSavedReport,
  markReportRun,
  updateSavedReport,
} from "@/lib/saved-reports-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { ReportPreviewTable } from "./report-preview-table";

const STEPS = ["Data Source", "Filters", "Columns", "Sort & Group", "Schedule"];

const FREQUENCIES = ["once", "daily", "weekly", "monthly"] as const;
const FORMATS = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel" },
  { value: "pdf", label: "PDF" },
] as const;

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function FilterValueControl({
  field,
  value,
  onChange,
}: {
  field: ReportField | undefined;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!field) return null;
  if (field.type === "enum") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Value" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "date") {
    return (
      <DatePicker
        value={value || undefined}
        onValueChange={(v) => onChange(v)}
        placeholder="Pick a date"
      />
    );
  }
  const numeric = field.type === "number" || field.type === "currency";
  return (
    <Input
      type={numeric ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      className="h-9"
    />
  );
}

export function ReportBuilder({
  initialConfig,
  initialName,
  editingId,
  autorun,
}: {
  initialConfig: ReportConfig;
  initialName: string;
  editingId: string | null;
  autorun: boolean;
}) {
  const [config, setConfig] = useState<ReportConfig>(initialConfig);
  const [name, setName] = useState(initialName);
  const [step, setStep] = useState(1);
  const [savedId, setSavedId] = useState<string | null>(editingId);
  const [result, setResult] = useState<ReportResult | null>(() =>
    autorun ? runReport(initialConfig) : null,
  );

  const src = getSource(config.sourceId);
  const fields = src?.fields ?? [];

  const patch = (p: Partial<ReportConfig>) =>
    setConfig((c) => ({ ...c, ...p }));

  const changeSource = (id: string) =>
    setConfig({ ...defaultConfig(id), schedule: config.schedule });

  const addFilter = () => {
    if (!fields.length) return;
    const f0 = fields[0];
    patch({
      filters: [
        ...config.filters,
        { field: f0.key, op: OPS_BY_TYPE[f0.type][0].op, value: "" },
      ],
    });
  };

  const updateFilter = (i: number, p: Partial<ReportFilter>) =>
    setConfig((c) => ({
      ...c,
      filters: c.filters.map((flt, idx) => {
        if (idx !== i) return flt;
        if (p.field && p.field !== flt.field) {
          const nf = fields.find((x) => x.key === p.field);
          return {
            field: p.field,
            op: nf ? OPS_BY_TYPE[nf.type][0].op : flt.op,
            value: "",
          };
        }
        return { ...flt, ...p };
      }),
    }));

  const removeFilter = (i: number) =>
    patch({ filters: config.filters.filter((_, idx) => idx !== i) });

  const toggleColumn = (key: string) =>
    patch({
      columns: config.columns.includes(key)
        ? config.columns.filter((k) => k !== key)
        : [...config.columns, key],
    });

  const run = () => {
    setResult(runReport(config));
    if (savedId) markReportRun(savedId);
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Give your report a name first");
      return;
    }
    if (savedId) {
      updateSavedReport(savedId, { name, config });
      toast.success(`“${name}” updated`);
    } else {
      const r = createSavedReport(name, config);
      setSavedId(r.id);
      toast.success(`“${name}” saved`);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    downloadCsv(
      `${(name || "report").replace(/\s+/g, "_").toLowerCase()}.csv`,
      buildReportCsv(result),
    );
  };

  return (
    <div className="space-y-5">
      {/* Top bar: name + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="report-name" className="text-xs">
            Report name
          </Label>
          <Input
            id="report-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Overdue Invoices by Facility"
            className="w-72"
          />
        </div>
        <div className="flex gap-2">
          {result && (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          )}
          <Button variant="outline" onClick={save}>
            <Save className="mr-2 size-4" />
            Save Report
          </Button>
          <Button
            onClick={run}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Play className="mr-2 size-4" />
            Run Report
          </Button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(n)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                step === n
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px]",
                  step === n
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {n}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-card min-h-[180px] rounded-xl border p-4">
        {step === 1 && (
          <div className="space-y-3">
            <div className="grid max-w-md gap-1.5">
              <Label className="text-xs">Select a data source</Label>
              <Select value={config.sourceId} onValueChange={changeSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_SOURCES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {src && (
              <p className="text-muted-foreground text-sm">
                {src.description} · {src.rows.length} records ·{" "}
                {src.fields.length} fields
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {config.filters.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No filters — the report includes all records. Add a filter to
                narrow the results.
              </p>
            )}
            {config.filters.map((flt, i) => {
              const field = fields.find((f) => f.key === flt.field);
              return (
                <div
                  key={i}
                  className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <div className="grid gap-1">
                    <Label className="text-[11px]">Field</Label>
                    <Select
                      value={flt.field}
                      onValueChange={(v) => updateFilter(i, { field: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px]">Operator</Label>
                    <Select
                      value={flt.op}
                      onValueChange={(v) =>
                        updateFilter(i, { op: v as ReportFilter["op"] })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(field ? OPS_BY_TYPE[field.type] : []).map((o) => (
                          <SelectItem key={o.op} value={o.op}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px]">Value</Label>
                    <FilterValueControl
                      field={field}
                      value={flt.value}
                      onChange={(v) => updateFilter(i, { value: v })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => removeFilter(i)}
                    aria-label="Remove filter"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addFilter}>
              <Plus className="mr-1.5 size-4" />
              Add Filter
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Columns to include</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => patch({ columns: fields.map((f) => f.key) })}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => patch({ columns: [] })}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((f) => (
                <label
                  key={f.key}
                  className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-lg border p-2"
                >
                  <Checkbox
                    checked={config.columns.includes(f.key)}
                    onCheckedChange={() => toggleColumn(f.key)}
                  />
                  <span className="text-sm">{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Sort by</Label>
              <Select
                value={config.sortField || "none"}
                onValueChange={(v) =>
                  patch({ sortField: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sorting</SelectItem>
                  {fields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Direction</Label>
              <Select
                value={config.sortDir}
                onValueChange={(v) => patch({ sortDir: v as "asc" | "desc" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label className="text-xs">Group by</Label>
              <Select
                value={config.groupField || "none"}
                onValueChange={(v) =>
                  patch({ groupField: v === "none" ? "" : v })
                }
              >
                <SelectTrigger className="sm:max-w-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  {fields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Frequency</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {FREQUENCIES.map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() =>
                      patch({
                        schedule: { ...config.schedule, frequency: freq },
                      })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                      config.schedule.frequency === freq
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid max-w-xs gap-1.5">
              <Label className="text-xs">Export format</Label>
              <Select
                value={config.schedule.exportFormat}
                onValueChange={(v) =>
                  patch({
                    schedule: {
                      ...config.schedule,
                      exportFormat: v as "csv" | "xlsx" | "pdf",
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-xs">
              {config.schedule.frequency === "once"
                ? "This report runs on demand."
                : `Scheduled to run ${config.schedule.frequency}, exported as ${config.schedule.exportFormat.toUpperCase()}.`}
            </p>
          </div>
        )}
      </div>

      {/* Stepper nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ChevronLeft className="mr-1.5 size-4" />
          Back
        </Button>
        <span className="text-muted-foreground text-xs">
          Step {step} of {STEPS.length}
        </span>
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
          disabled={step === STEPS.length}
        >
          Next
          <ChevronRight className="ml-1.5 size-4" />
        </Button>
      </div>

      {/* Preview */}
      {result && (
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Preview</h3>
            <span className="text-muted-foreground text-xs">
              {getSource(config.sourceId)?.label}
            </span>
          </div>
          <ReportPreviewTable result={result} />
        </div>
      )}
    </div>
  );
}
