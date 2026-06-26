"use client";

import { AlertTriangle, Wand2 } from "lucide-react";

import { getImportSource } from "@/data/import-sources";
import {
  SKIP_FIELD,
  getYipyyField,
  requiredFieldIds,
  yipyyFields,
} from "@/data/import-fields";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ENTITIES = [
  { key: "customer", label: "Customer" },
  { key: "pet", label: "Pet" },
  { key: "booking", label: "Booking" },
] as const;

export function StepMapFields({
  draft,
  update,
  onNext,
  onBack,
  onCancel,
}: WizardStepProps) {
  const primary = primaryFile(draft);
  const source = draft.sourceId ? getImportSource(draft.sourceId) : null;

  const mappedFieldIds = new Set(
    Object.values(draft.mapping).filter((v) => v && v !== SKIP_FIELD),
  );
  const missingRequired = requiredFieldIds.filter(
    (id) => !mappedFieldIds.has(id),
  );
  const canContinue = !!primary && missingRequired.length === 0;

  function setColumn(col: string, value: string) {
    update({ mapping: { ...draft.mapping, [col]: value } });
  }

  return (
    <ImportStepFrame
      stepIndex={3}
      canContinue={canContinue}
      onContinue={onNext}
      onBack={onBack}
      onCancel={onCancel}
    >
      {source?.parser && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm">
          <Wand2 className="size-4 text-violet-600 dark:text-violet-400" />
          <span className="text-muted-foreground">
            {source.name} columns were auto-mapped. Review and adjust below.
          </span>
        </div>
      )}

      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="text-rose-700 dark:text-rose-300">
            Required fields not yet mapped:{" "}
            <span className="font-semibold">
              {missingRequired
                .map((id) => getYipyyField(id)?.label ?? id)
                .join(", ")}
            </span>
          </p>
        </div>
      )}

      {primary && (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File column</TableHead>
                <TableHead>Sample</TableHead>
                <TableHead>Yipyy field</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {primary.columns.map((col, ci) => {
                const value = draft.mapping[col];
                const unmapped = !value;
                const sample = primary.rows[0]?.[ci] ?? "";
                return (
                  <TableRow key={col}>
                    <TableCell className="font-medium">{col}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[160px] truncate text-xs">
                      {sample || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={value}
                        onValueChange={(v) => setColumn(col, v)}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-full min-w-44",
                            unmapped &&
                              "border-rose-400/60 ring-1 ring-rose-400/30",
                          )}
                        >
                          <SelectValue placeholder="Select field…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP_FIELD}>
                            Skip this column
                          </SelectItem>
                          {ENTITIES.map((ent) => (
                            <SelectGroup key={ent.key}>
                              <SelectLabel>{ent.label}</SelectLabel>
                              {yipyyFields
                                .filter((f) => f.entity === ent.key)
                                .map((f) => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.label}
                                    {f.required ? " *" : ""}
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        <Badge variant="outline" className="mr-1">
          *
        </Badge>
        Required field. Unmapped columns are highlighted; choose a field or
        skip.
      </p>
    </ImportStepFrame>
  );
}
