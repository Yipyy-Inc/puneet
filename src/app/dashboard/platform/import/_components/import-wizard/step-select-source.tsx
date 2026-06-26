"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";

import { importSources } from "@/data/import-sources";
import { cn } from "@/lib/utils";
import { SourceLogo } from "../source-logo";
import { ImportStepFrame } from "./import-step-frame";
import type { WizardStepProps } from "./wizard-types";

export function StepSelectSource({
  draft,
  update,
  onNext,
  onCancel,
}: WizardStepProps) {
  return (
    <ImportStepFrame
      stepIndex={0}
      canContinue={!!draft.sourceId}
      onContinue={onNext}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {importSources.map((s) => {
          const selected = draft.sourceId === s.id;
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => update({ sourceId: s.id, files: [], mapping: {} })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  update({ sourceId: s.id, files: [], mapping: {} });
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-violet-500 ring-2 ring-violet-500/30"
                  : "hover:bg-muted/50",
              )}
            >
              <SourceLogo sourceId={s.id} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {s.importableData.join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info(`Opening the ${s.name} export guide`);
                }}
                className="inline-flex w-fit items-center gap-1 text-xs text-violet-600 hover:underline dark:text-violet-400"
              >
                <Download className="size-3" />
                Download Export Guide
              </button>
            </div>
          );
        })}
      </div>
    </ImportStepFrame>
  );
}
