"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AnyReactFormApi } from "@/components/ui/form/form-field";
import { STEP_META } from "./wizard-config";

export function WizardStepFrame({
  stepIndex,
  form,
  onBack,
  onCancel,
  children,
}: {
  stepIndex: number;
  form: AnyReactFormApi;
  onBack?: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const meta = STEP_META[stepIndex];
  const Icon = meta.icon;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {meta.title}
              </h3>
              <p className="text-muted-foreground text-sm">{meta.summary}</p>
            </div>
          </div>
          <div className="space-y-5">{children}</div>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={!onBack}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Continue
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </footer>
    </form>
  );
}
