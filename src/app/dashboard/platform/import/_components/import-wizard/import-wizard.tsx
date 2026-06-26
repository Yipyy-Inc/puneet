"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Database, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImportWizardProgress } from "./import-wizard-progress";
import { StepImportComplete } from "./step-import-complete";
import { StepMapFields } from "./step-map-fields";
import { StepSelectFacility } from "./step-select-facility";
import { StepSelectSource } from "./step-select-source";
import { StepUploadFile } from "./step-upload-file";
import { StepValidate } from "./step-validate";
import { STEP_META, createDraft, type ImportDraft } from "./wizard-types";

export function ImportWizard({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ImportDraft>(() => createDraft());

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  const update = (patch: Partial<ImportDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, STEP_META.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const stepProps = {
    draft,
    update,
    onNext: next,
    onBack: step > 0 ? back : undefined,
    onCancel: onClose,
  };

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Data Import"
      className="bg-background fixed inset-0 z-50 flex flex-col"
    >
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-sm">
            <Database className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">
              Data Import
            </h2>
            <p className="text-muted-foreground truncate text-xs">
              Step {step + 1} of {STEP_META.length} · {STEP_META[step].title}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close wizard"
        >
          <X className="size-5" />
        </Button>
      </header>

      <ImportWizardProgress step={step} />

      {step === 0 && <StepSelectSource {...stepProps} />}
      {step === 1 && <StepSelectFacility {...stepProps} />}
      {step === 2 && <StepUploadFile {...stepProps} />}
      {step === 3 && <StepMapFields {...stepProps} />}
      {step === 4 && <StepValidate {...stepProps} />}
      {step === 5 && <StepImportComplete {...stepProps} />}
    </div>
  );

  return createPortal(overlay, document.body);
}
