"use client";

import { Clock3, ExternalLink, Info, RotateCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MissingForm } from "@/lib/forms/requirements";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// "Forms" in Confirm's checklist (the client's mock, 2026-10-02): the forms
// the facility requires before booking that this booking would still be
// missing, asked before it is made (/api/forms/missing-for-booking).
//
//   Customer  each one opens in a new tab; the request waits while a form the
//             facility requires is missing ("Check again" asks once more)
//   Staff     the reason the booking goes ahead without them, typed here and
//             kept on the booking — the dialog that used to stack on the
//             wizard after the save was refused is not needed (§5i)
//
// A form the facility only recommends is listed and never stops anything.
// ============================================================================

export function FormsSection({
  isCustomer,
  missing,
  clientFirstName,
  petRefOf,
  service,
  reason,
  onReason,
  minReason,
  onRecheck,
  rechecking,
}: {
  isCustomer: boolean;
  missing: readonly MissingForm[];
  clientFirstName: string;
  /** A pet's ref by its name, for the form's own link. */
  petRefOf: (name: string | null) => number | undefined;
  service: string;
  reason: string;
  onReason: (reason: string) => void;
  minReason: number;
  onRecheck: () => void;
  rechecking: boolean;
}) {
  const t = useShellText("booking");
  const blocking = missing.some((form) => form.enforcement === "block");

  return (
    <div className="border-line flex flex-col gap-2.5 border-t py-3.5">
      <p className="text-body-strong text-body-ink">{t("wizForms")}</p>
      {missing.map((form) => {
        const petRef = petRefOf(form.pet_name);
        const query = new URLSearchParams({ service });
        if (petRef !== undefined) query.set("petId", String(petRef));
        return (
          <div
            key={`${form.form_id}:${form.pet_id ?? "client"}`}
            className="border-line bg-surface-inset flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-3"
          >
            <span className="flex min-w-0 flex-[1_1_180px] items-center gap-3">
              <span
                aria-hidden
                className={
                  form.enforcement === "block"
                    ? "bg-warning-dot size-[7px] shrink-0 rounded-full"
                    : "bg-ink-disabled size-[7px] shrink-0 rounded-full"
                }
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-body text-body-ink font-medium wrap-break-word">
                  {form.form_name}
                </span>
                {form.pet_name ? (
                  <span className="text-meta text-ink-tertiary">
                    {form.pet_name}
                  </span>
                ) : null}
              </span>
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {form.enforcement === "block" ? (
                <Badge variant="pending">
                  <Clock3 aria-hidden />
                  {t("wizFormRequired")}
                </Badge>
              ) : (
                <Badge variant="cancelled">
                  <Info aria-hidden />
                  {t("wizFormRecommended")}
                </Badge>
              )}
              {isCustomer ? (
                <Button asChild variant="outline">
                  <a
                    href={`/forms/${encodeURIComponent(form.form_slug)}?${query.toString()}`}
                    target="_blank"
                    rel="noopener"
                  >
                    <ExternalLink aria-hidden />
                    {t("wizOpenForm")}
                  </a>
                </Button>
              ) : null}
            </span>
          </div>
        );
      })}

      {isCustomer ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-meta text-ink-tertiary text-pretty">
            {t(blocking ? "wizFormsCustomerHelp" : "wizFormsOptionalHelp")}
          </p>
          <Button
            type="button"
            variant="outline"
            loading={rechecking}
            onClick={onRecheck}
          >
            <RotateCw aria-hidden />
            {t("wizFormsCheckAgain")}
          </Button>
        </div>
      ) : blocking ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="wizard-forms-reason"
            className="text-meta text-body-ink text-pretty"
          >
            {fill(t("wizFormsStaffHelp"), { name: clientFirstName })}
          </label>
          <Textarea
            id="wizard-forms-reason"
            value={reason}
            maxLength={500}
            onChange={(event) => onReason(event.target.value)}
            placeholder={t("wizFormsReasonPh")}
          />
          {reason.trim().length > 0 && reason.trim().length < minReason ? (
            <p className="text-meta text-ink-tertiary">
              {fill(t("wizFormsReasonShort"), { count: minReason })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
