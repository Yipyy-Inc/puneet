"use client";

import { CircleCheck, CircleX, Clock } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import type { PetVaccinationLine } from "@/lib/bookings/wizard/vaccination-check";
import { formatList, formatMoney } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import { AgreementsSection } from "../AgreementsSection";
import { DepositSection } from "../ChecklistSections";
import { ConfirmCard } from "../ConfirmCard";
import { NotifyCard, SpecialRequestsCard } from "../ConfirmCards";
import type { ConfirmStepProps } from "../ConfirmStep";
import { FormsSection } from "../FormsSection";

// ============================================================================
// An evaluation's "Review & confirm" / "Review & book" (the client's mock,
// 2026-10-02), in place of Confirm:
//
//   main  (customer, when it needs approval) the team reviews within 24 hours
//         Vaccinations — on file, or what is missing
//         Evaluation terms — "I've read and agree"
//   side  Summary — pets, service, unlocks, when, length, evaluator, client;
//         the total ("2 pets · 2nd pet 50% off"); the deposit
//
// Kept from Confirm, because a booking still needs them: agreements and forms
// the facility asks for (rare for an evaluation, real when set), and for staff
// the deposit's choices, how the client is told, and special requests.
// ============================================================================

export interface EvaluationSummary {
  rows: ReadonlyArray<{ key: string; label: string; value: string }>;
  /** "1 pet" · "2 pets · 2nd pet 50% off". */
  priceNote: string;
  total: number;
  /** Tax lines when the evaluation is taxed; empty otherwise. */
  taxes: ReadonlyArray<{ name: string; amount: number }>;
  deposit: { amount: number; label: string } | null;
}

export function EvaluationReview({
  confirm,
  vaccinesRequired,
  vaccinations,
  terms,
  summary,
}: {
  confirm: ConfirmStepProps;
  /** The facility asks for the unlocked services' vaccines on file. */
  vaccinesRequired: boolean;
  vaccinations: readonly PetVaccinationLine[];
  terms: {
    accepted: boolean;
    onAccept: (accepted: boolean) => void;
    responseHours: number;
    cancelHours: number | null;
  };
  summary: EvaluationSummary;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const money = (amount: number) => formatMoney(amount, locale);
  const { isCustomer, agreements, forms, deposit, pets, client } = confirm;
  const hasAgreements = agreements.applicable.length > 0;
  const hasForms = !!forms && forms.missing.length > 0;

  return (
    <div className="flex flex-wrap items-start gap-[18px]">
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
        {isCustomer && confirm.approval.required ? (
          <div
            role="note"
            className="text-meta flex gap-2.5 rounded-[16px] border border-(--note-line) bg-(--note-bg) px-4 py-3.5 text-(--note-ink)"
          >
            <Clock aria-hidden className="mt-0.5 size-5 shrink-0" />
            <p className="text-pretty">
              {fill(t("wizEvNeedsApproval"), {
                hours: confirm.approval.hours,
              })}
            </p>
          </div>
        ) : null}

        {vaccinesRequired && vaccinations.length > 0 ? (
          <section className="border-line bg-card flex flex-col gap-2 rounded-[18px] border p-4">
            <h3 className="text-body-ink text-[15px] font-bold">
              {t("wizVaccinations")}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {vaccinations.map((line) => {
                const ok = line.state !== "missing";
                const names = formatList(line.vaccines, locale);
                const text = ok
                  ? fill(t("wizEvVaxOnFile"), { vaccines: names })
                  : fill(t("wizEvVaxMissing"), { vaccines: names });
                return (
                  <li
                    key={line.petId}
                    className="flex items-start gap-2 text-[13.5px]"
                  >
                    {ok ? (
                      <CircleCheck
                        aria-hidden
                        className="text-success mt-0.5 size-4 shrink-0"
                      />
                    ) : (
                      <CircleX
                        aria-hidden
                        className="text-destructive mt-0.5 size-4 shrink-0"
                      />
                    )}
                    <span className={ok ? "text-body-ink" : "text-destructive"}>
                      {pets.length > 1 ? (
                        <strong className="font-semibold">
                          {line.petName}:{" "}
                        </strong>
                      ) : null}
                      {text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {hasAgreements || hasForms ? (
          <ConfirmCard
            label={
              isCustomer ? t("wizBeforeYouRequest") : t("wizBeforeConfirmed")
            }
            id="wizard-evaluation-checklist"
            flush
          >
            <div className="flex flex-col px-5 pt-1.5 pb-[18px] [&>*:first-child]:border-t-0">
              {hasAgreements ? (
                <AgreementsSection
                  isCustomer={isCustomer}
                  applicable={agreements.applicable}
                  pending={agreements.pending}
                  clientRef={agreements.clientRef}
                  clientName={client?.name ?? ""}
                  clientFirstName={(client?.name ?? "").split(/\s+/)[0] ?? ""}
                  petName={pets.map((pet) => pet.name).join(", ")}
                  facilityName={confirm.facilityName}
                  links={agreements.links}
                />
              ) : null}
              {hasForms && forms ? <FormsSection {...forms} /> : null}
            </div>
          </ConfirmCard>
        ) : null}

        <section className="border-line bg-card flex flex-col gap-2 rounded-[18px] border p-4">
          <h3 className="text-body-ink text-[15px] font-bold">
            {t("wizEvTermsTitle")}
          </h3>
          <p className="text-ink-secondary text-[13px] leading-[19.5px] text-pretty">
            {fill(t("wizEvTerms"), { hours: terms.responseHours })}
            {terms.cancelHours !== null && terms.cancelHours > 0
              ? ` ${fill(t("wizEvTermsCancel"), { hours: terms.cancelHours })}`
              : ""}
          </p>
          <label className="text-body-ink mt-1 flex cursor-pointer items-center gap-2.5 text-[14px] font-semibold">
            <Checkbox
              checked={terms.accepted}
              onCheckedChange={(checked) => terms.onAccept(checked === true)}
              className="size-6 rounded-[7px]"
            />
            {t("wizEvTermsAgree")}
          </label>
        </section>

        {!isCustomer && deposit ? (
          <ConfirmCard label={t("wizEvDeposit")} id="wizard-evaluation-deposit">
            <div className="px-5 pb-4 [&>*:first-child]:border-t-0">
              <DepositSection {...deposit} />
            </div>
          </ConfirmCard>
        ) : null}
        {confirm.notify ? <NotifyCard {...confirm.notify} /> : null}
        {!isCustomer ? (
          <SpecialRequestsCard
            value={confirm.specialRequests}
            onChange={confirm.onSpecialRequests}
            placeholder={t("wizRequestsPhStaff")}
          />
        ) : null}
      </div>

      <section
        aria-labelledby="wizard-evaluation-summary"
        className="border-line bg-card flex max-w-[400px] min-w-0 flex-[1_1_280px] flex-col gap-2.5 rounded-[20px] border p-[18px] lg:sticky lg:top-0"
      >
        <h3
          id="wizard-evaluation-summary"
          className="text-body-ink text-[15px] font-bold"
        >
          {t("wizEvSummary")}
        </h3>
        <dl className="flex flex-col gap-2">
          {summary.rows.map((row) => (
            <div key={row.key} className="flex gap-2.5 text-[13.5px]">
              <dt className="text-ink-tertiary w-[84px] shrink-0">
                {row.label}
              </dt>
              <dd className="text-body-ink min-w-0 flex-1 font-bold">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="border-line flex flex-col gap-1 border-t pt-2.5">
          <span className="text-ink-tertiary text-[12.5px]">
            {summary.priceNote}
          </span>
          {summary.taxes.map((tax) => (
            <span
              key={tax.name}
              className="text-meta text-ink-tertiary flex justify-between tabular-nums"
            >
              <span>{tax.name}</span>
              <span>{money(tax.amount)}</span>
            </span>
          ))}
          <span className="text-body-ink text-[26px] font-extrabold tabular-nums">
            {summary.total === 0 ? t("priceFree") : money(summary.total)}
          </span>
        </div>
        {summary.deposit && summary.deposit.amount > 0 ? (
          <p className="text-acc-soft-text flex gap-2.5 rounded-[12px] bg-(--acc-pale) px-3 py-2.5 text-[13.5px] font-semibold">
            <span className="min-w-0 flex-1">{summary.deposit.label}</span>
            <span className="tabular-nums">
              {money(summary.deposit.amount)}
            </span>
          </p>
        ) : null}
      </section>
    </div>
  );
}
