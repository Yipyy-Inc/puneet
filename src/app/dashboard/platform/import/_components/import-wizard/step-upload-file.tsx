"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileUp, Sparkles, Trash2 } from "lucide-react";

import { getImportSample } from "@/data/import-samples";
import { getImportSource } from "@/data/import-sources";
import { autoMapColumns } from "@/lib/parsers/import-mappings";
import { parseCsv } from "@/lib/parsers/csv";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ImportStepFrame } from "./import-step-frame";
import {
  primaryFile,
  type UploadedFile,
  type WizardStepProps,
} from "./wizard-types";

const MAX_BYTES = 50 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function StepUploadFile({
  draft,
  update,
  onNext,
  onBack,
  onCancel,
}: WizardStepProps) {
  const source = draft.sourceId ? getImportSource(draft.sourceId) : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function remap(files: UploadedFile[]): Record<string, string> {
    const primary = files[0];
    if (!primary) return {};
    return source?.parser
      ? autoMapColumns(source.parser, primary.columns)
      : draft.mapping;
  }

  function makeFile(name: string, size: number, text: string): UploadedFile {
    const { columns, rows } = parseCsv(text);
    return {
      id: `${name}-${size}-${columns.length}`,
      name,
      size,
      columns,
      rows,
    };
  }

  function applyFiles(added: UploadedFile[]) {
    const files = [...draft.files, ...added];
    update({ files, mapping: remap(files) });
  }

  async function handleFiles(fileList: FileList) {
    const added: UploadedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} exceeds the 50MB limit`);
        continue;
      }
      if (!/\.csv$/i.test(file.name)) {
        toast.info(
          `${file.name}: XLSX is parsed on import — upload a CSV or load the sample to preview here.`,
        );
        continue;
      }
      const text = await file.text();
      added.push(makeFile(file.name, file.size, text));
    }
    if (added.length) applyFiles(added);
  }

  function loadSample() {
    if (!draft.sourceId) return;
    const sample = getImportSample(draft.sourceId);
    applyFiles([
      makeFile(sample.fileName, sample.content.length, sample.content),
    ]);
    toast.success("Sample file loaded");
  }

  function removeFile(id: string) {
    const files = draft.files.filter((f) => f.id !== id);
    update({ files, mapping: remap(files) });
  }

  const primary = primaryFile(draft);

  return (
    <ImportStepFrame
      stepIndex={2}
      canContinue={draft.files.length > 0}
      onContinue={onNext}
      onBack={onBack}
      onCancel={onCancel}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver
            ? "border-violet-500 bg-violet-500/5"
            : "border-border bg-muted/20",
        )}
      >
        <FileUp className="text-muted-foreground size-8" />
        <p className="font-medium">Drag &amp; drop your export file here</p>
        <p className="text-muted-foreground text-xs">
          CSV or XLSX · up to 50MB
          {source?.separateFiles &&
            " · this platform exports separate files — drop multiple"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={loadSample}>
            <Sparkles className="mr-1.5 size-3.5" />
            Load sample file
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          multiple={source?.separateFiles}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {draft.files.length > 0 && (
        <div className="space-y-2">
          {draft.files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
            >
              <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-muted-foreground text-xs">
                  {formatBytes(f.size)} · {f.columns.length} columns ·{" "}
                  {f.rows.length} rows
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFile(f.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {primary && primary.rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Preview — first 5 rows of {primary.name}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {primary.columns.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {primary.rows.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {primary.columns.map((c, ci) => (
                      <TableCell key={c} className="whitespace-nowrap">
                        {row[ci] ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ImportStepFrame>
  );
}
