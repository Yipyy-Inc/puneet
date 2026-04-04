"use client";

import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvaluationCheckoutAlertProps {
  petName: string;
  hasEvaluationToday: boolean;
  evaluationRecorded: boolean;
  onRecordResult?: () => void;
}

export function EvaluationCheckoutAlert({
  petName,
  hasEvaluationToday,
  evaluationRecorded,
  onRecordResult,
}: EvaluationCheckoutAlertProps) {
  if (!hasEvaluationToday) return null;

  if (evaluationRecorded) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ClipboardCheck className="size-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-800">
            Evaluation completed
          </p>
          <p className="text-xs text-emerald-600">
            {petName}&apos;s evaluation result has been recorded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-800">
          Evaluation result pending
        </p>
        <p className="text-xs text-amber-600">
          {petName} had an evaluation today. Please record the result before
          completing checkout.
        </p>
      </div>
      {onRecordResult && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={onRecordResult}
        >
          Record Result
        </Button>
      )}
    </div>
  );
}
