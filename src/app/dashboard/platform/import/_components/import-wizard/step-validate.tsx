"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";

import { toCsv } from "@/lib/parsers/csv";
import { runValidation } from "@/lib/parsers/validate";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { primaryFile, type WizardStepProps } from "./wizard-types";

const LEVEL = {
  green: {
    cls: "border-emerald-500/30 bg-emerald-500/5",
    icon: CheckCircle2,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    title: "All rows are clean",
    desc: "Everything will import.",
  },
  amber: {
    cls: "border-amber-500/30 bg-amber-500/5",
    icon: AlertTriangle,
    iconCls: "text-amber-600 dark:text-amber-400",
    title: "Some warnings",
    desc: "Rows with warnings will still be imported.",
  },
  red: {
    cls: "border-rose-500/30 bg-rose-500/5",
    icon: XCircle,
    iconCls: "text-rose-600 dark:text-rose-400",
    title: "Some rows have errors",
    desc: "Rows with errors will be skipped.",
  },
};

export function StepValidate({
  draft,
  onNext,
  onBack,
  onCancel,
}: WizardStepProps) {
  const primary = primaryFile(draft);
  const [mode, setMode] = useState<"skip" | "cancel">("skip");

  const result = useMemo(() => {
    if (!primary)
      return {
        total: 0,
        clean: 0,
        warnings: 0,
        errors: 0,
        issues: [],
        level: "green" as const,
      };
    return runValidation(primary.columns, primary.rows, draft.mapping).result;
  }, [primary, draft.mapping]);

  const level = LEVEL[result.level];
  const LevelIcon = level.icon;

  function downloadErrorReport() {
    const rows = result.issues.map((i) => [
      String(i.rowIndex),
      i.column,
      i.severity,
      i.message,
    ]);
    const csv = toCsv(["Row", "Column", "Severity", "Message"], rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-error-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ImportStepFrame
      stepIndex={4}
      canContinue={mode === "skip"}
      continueLabel="Start Import"
      onContinue={onNext}
      onBack={onBack}
      onCancel={onCancel}
    >
      {/* Summary */}
      <div className={cn("rounded-xl border p-4", level.cls)}>
        <div className="flex items-center gap-3">
          <LevelIcon className={cn("size-6", level.iconCls)} />
          <div>
            <p className="font-semibold">{level.title}</p>
            <p className="text-muted-foreground text-sm">{level.desc}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Clean" value={result.clean} cls="text-emerald-600" />
          <Stat label="Warnings" value={result.warnings} cls="text-amber-600" />
          <Stat label="Errors" value={result.errors} cls="text-rose-600" />
        </div>
      </div>

      {/* Error/warning detail */}
      {result.issues.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="issues" className="rounded-lg border px-3">
            <AccordionTrigger className="text-sm hover:no-underline">
              View {result.issues.length} issue
              {result.issues.length === 1 ? "" : "s"}
            </AccordionTrigger>
            <AccordionContent>
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadErrorReport}
                >
                  <Download className="mr-1.5 size-3.5" />
                  Download Error Report CSV
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Column</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.issues.map((iss, i) => (
                      <TableRow key={i}>
                        <TableCell className="tabular-nums">
                          {iss.rowIndex}
                        </TableCell>
                        <TableCell>{iss.column}</TableCell>
                        <TableCell
                          className={
                            iss.severity === "error"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {iss.severity}
                        </TableCell>
                        <TableCell>{iss.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* How to handle */}
      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as "skip" | "cancel")}
        className="space-y-2"
      >
        <Label className="hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3">
          <RadioGroupItem value="skip" className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium">
              Import clean rows, skip errors
            </span>
            <span className="text-muted-foreground text-xs">
              Recommended — {result.total - result.errors} of {result.total}{" "}
              rows will import.
            </span>
          </span>
        </Label>
        <Label className="hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3">
          <RadioGroupItem value="cancel" className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium">
              Don&apos;t import — I&apos;ll fix the file first
            </span>
            <span className="text-muted-foreground text-xs">
              Go back and re-upload a corrected file.
            </span>
          </span>
        </Label>
      </RadioGroup>
    </ImportStepFrame>
  );
}

function Stat({
  label,
  value,
  cls,
}: {
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className="bg-background/60 rounded-lg border py-2">
      <p className={cn("text-xl font-bold tabular-nums", cls)}>{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
