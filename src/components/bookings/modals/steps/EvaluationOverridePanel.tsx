"use client";

import { ClipboardCheck, PawPrint } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatList } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { Pet } from "@/types/pet";

// ============================================================================
// Booking past the evaluation rule — the facility's call, said out loud.
//
// The wizard stopped STAFF exactly as it stops a customer: a pet with no
// passed evaluation, a failed one or an expired one locked the service, hid
// the others, and left Next greyed out with nothing to press. A facility knows
// its regulars; "the bookings were stuck on the evaluations" was the result.
// Staff now choose — book the evaluation first, or book without it and say
// why. The reason travels with the booking. A customer is still stopped.
// ============================================================================

export type EvaluationIssueReason = "expired" | "failed" | "missing";

export interface EvaluationIssue {
  pet: Pet;
  reason: EvaluationIssueReason;
}

/** At least this many characters of reason before the override counts. */
export const EVALUATION_OVERRIDE_MIN_REASON = 3;

const REASON_KEY: Record<EvaluationIssueReason, string> = {
  expired: "evalReasonExpired",
  failed: "evalReasonFailed",
  missing: "evalReasonNone",
};

export function EvaluationOverridePanel({
  issues,
  overriding,
  reason,
  onOverridingChange,
  onReasonChange,
  onBookEvaluation,
}: {
  issues: EvaluationIssue[];
  overriding: boolean;
  reason: string;
  onOverridingChange: (on: boolean) => void;
  onReasonChange: (reason: string) => void;
  onBookEvaluation: () => void;
}) {
  const t = useShellText("booking");
  const short = reason.trim().length < EVALUATION_OVERRIDE_MIN_REASON;

  return (
    <div className="border-warning bg-card mb-3 space-y-4 rounded-2xl border p-4">
      <div className="flex items-start gap-2.5">
        <ClipboardCheck className="text-warning mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-body-ink text-sm font-semibold">
            {t("evalNeedsTitle")}
          </p>
          <p className="text-ink-secondary text-sm">{t("evalNeedsHelp")}</p>
          <ul className="space-y-1">
            {issues.map(({ pet, reason: why }) => (
              <li
                key={pet.id}
                className="text-body-ink flex items-center gap-2 text-sm"
              >
                <PawPrint className="text-ink-tertiary size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="font-semibold">{pet.name}</span> —{" "}
                  {t(REASON_KEY[why])}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onBookEvaluation}>
          {t("evalBookInstead")}
        </Button>
        <div className="flex items-center gap-2">
          <Switch
            id="evaluation-override"
            checked={overriding}
            onCheckedChange={onOverridingChange}
          />
          <Label
            htmlFor="evaluation-override"
            className="text-body-ink text-sm font-medium"
          >
            {t("evalOverrideLabel")}
          </Label>
        </div>
      </div>

      {overriding && (
        <div className="space-y-1.5">
          <Label
            htmlFor="evaluation-override-reason"
            className="text-body-ink text-sm"
          >
            {t("evalOverrideReasonLabel")}
          </Label>
          <Textarea
            id="evaluation-override-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={t("evalOverridePlaceholder")}
            rows={2}
          />
          {short && (
            <p className="text-ink-tertiary text-xs">
              {t("evalOverrideReasonNeeded")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** What Confirm says about a booking made past the rule. */
export function EvaluationOverrideSummary({
  issues,
  reason,
}: {
  issues: EvaluationIssue[];
  reason: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  return (
    <div className="border-warning bg-card mx-1 mb-4 flex items-start gap-2.5 rounded-2xl border px-4 py-3">
      <ClipboardCheck className="text-warning mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-body-ink text-sm font-semibold">
          {t("evalOverrideSummary").replace(
            "{pets}",
            formatList(
              issues.map((i) => i.pet.name),
              locale,
            ),
          )}
        </p>
        <p className="text-ink-secondary text-sm">{reason.trim()}</p>
      </div>
    </div>
  );
}
