"use client";

import type { ComponentProps, ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WaiverRow } from "@/lib/api/waivers";
import type { PreviewStatus } from "@/lib/bookings/wizard/confirm-view";
import type { EstimateTotals } from "@/lib/bookings/wizard/estimate-totals";
import type { PetVaccinationLine } from "@/lib/bookings/wizard/vaccination-check";
import type { QuoteLine } from "@/lib/bookings/quote/assemble";
import { isPluralOne } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";

import { AgreementsSection, type SigningLinks } from "./AgreementsSection";
import {
  DepositSection,
  EvaluationSection,
  PassesSection,
  VaccinationsSection,
} from "./ChecklistSections";
import { ConfirmCard } from "./ConfirmCard";
import { FormsSection } from "./FormsSection";
import {
  DetailsCard,
  NotifyCard,
  SpecialRequestsCard,
  type DetailRow,
} from "./ConfirmCards";
import { ConfirmHero } from "./ConfirmHero";
import { ClientSummaryCard, EstimateCard } from "./ConfirmSide";

// ============================================================================
// Step 4, "Confirm" (the client's mock, 2026-10-01). Two columns that wrap:
//
//   main  who and when · approval (customer) · the checklist · the details
//         with Edit · how the client is told (staff) · special requests
//   side  the estimate, line by line with the facility's taxes · the client
//
// The checklist is what stands between this booking and "Confirmed": the
// agreements, the vaccines, a first-day evaluation (staff), passes (staff)
// and the deposit, each shown only when it applies.
// ============================================================================

export interface ConfirmStepProps {
  isCustomer: boolean;
  service: string;
  kindLabel: string;
  pets: readonly Pet[];
  client: Client | undefined;
  heroLine: string;
  status: PreviewStatus;
  approval: { required: boolean; hours: number };
  agreements: {
    applicable: readonly WaiverRow[];
    pending: readonly WaiverRow[];
    clientRef: number | undefined;
    links?: SigningLinks;
  };
  vaccinations: readonly PetVaccinationLine[];
  /** The facility's required forms this booking would still be missing. */
  forms?: ComponentProps<typeof FormsSection>;
  duringStay: boolean;
  evaluation?: ComponentProps<typeof EvaluationSection>;
  passes?: ComponentProps<typeof PassesSection>;
  deposit?: ComponentProps<typeof DepositSection>;
  issues: number;
  detailsTitle: string;
  detailRows: readonly DetailRow[];
  /** Staff: who is assigned, under the details. */
  staffRows?: ReactNode;
  notify?: ComponentProps<typeof NotifyCard>;
  specialRequests: string;
  onSpecialRequests: (value: string) => void;
  lines: readonly QuoteLine[];
  totals: EstimateTotals;
  estimateDeposit?: { amount: number; label: string } | null;
  cardLabel?: string | null;
  onEditClient?: () => void;
  facilityName?: string;
}

export function ConfirmStep(props: ConfirmStepProps) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const {
    isCustomer,
    pets,
    client,
    agreements,
    vaccinations,
    forms,
    evaluation,
    passes,
    deposit,
    issues,
  } = props;
  const hasChecklist =
    agreements.applicable.length > 0 ||
    (forms?.missing.length ?? 0) > 0 ||
    vaccinations.length > 0 ||
    !!evaluation ||
    (passes?.packages.length ?? 0) > 0 ||
    !!deposit;

  return (
    <div className="flex flex-wrap items-start gap-[18px]">
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
        <ConfirmHero
          pets={pets}
          service={props.service}
          kindLabel={props.kindLabel}
          status={props.status}
          line={props.heroLine}
        />

        {isCustomer && props.approval.required ? (
          <div
            role="note"
            className="border-info bg-card text-meta text-body-ink flex gap-2.5 rounded-xl border px-[18px] py-3.5"
          >
            <Info aria-hidden className="text-info mt-0.5 size-4 shrink-0" />
            <p className="text-pretty">
              <strong className="font-semibold">{t("wizApprovalTitle")}</strong>{" "}
              {fill(t("wizApprovalText"), { hours: props.approval.hours })}
            </p>
          </div>
        ) : null}

        {hasChecklist ? (
          <ConfirmCard
            label={
              isCustomer ? t("wizBeforeYouRequest") : t("wizBeforeConfirmed")
            }
            id="wizard-checklist"
            flush
            aside={
              issues > 0 ? (
                <Badge variant="pending">
                  <TriangleAlert aria-hidden />
                  {fill(
                    t(
                      isPluralOne(issues, locale)
                        ? "wizToReviewOne"
                        : "wizToReviewOther",
                    ),
                    { count: issues },
                  )}
                </Badge>
              ) : (
                <Badge variant="confirmed">
                  <CircleCheck aria-hidden />
                  {t("wizAllSet")}
                </Badge>
              )
            }
          >
            <div className="flex flex-col px-5 pt-1.5 pb-[18px] [&>*:first-child]:border-t-0">
              {agreements.applicable.length > 0 ? (
                <AgreementsSection
                  isCustomer={isCustomer}
                  applicable={agreements.applicable}
                  pending={agreements.pending}
                  clientRef={agreements.clientRef}
                  clientName={client?.name ?? ""}
                  clientFirstName={(client?.name ?? "").split(/\s+/)[0] ?? ""}
                  petName={pets.map((pet) => pet.name).join(", ")}
                  facilityName={props.facilityName}
                  links={agreements.links}
                />
              ) : null}
              {forms && forms.missing.length > 0 ? (
                <FormsSection {...forms} />
              ) : null}
              <VaccinationsSection
                lines={vaccinations}
                duringStay={props.duringStay}
              />
              {evaluation ? <EvaluationSection {...evaluation} /> : null}
              {passes ? <PassesSection {...passes} /> : null}
              {deposit ? <DepositSection {...deposit} /> : null}
            </div>
          </ConfirmCard>
        ) : null}

        <DetailsCard title={props.detailsTitle} rows={props.detailRows}>
          {props.staffRows}
        </DetailsCard>

        {props.notify ? <NotifyCard {...props.notify} /> : null}

        <SpecialRequestsCard
          value={props.specialRequests}
          onChange={props.onSpecialRequests}
          placeholder={
            isCustomer ? t("wizRequestsPhCustomer") : t("wizRequestsPhStaff")
          }
        />
      </div>

      <div className="flex max-w-[360px] min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-0">
        <EstimateCard
          lines={props.lines}
          totals={props.totals}
          deposit={props.estimateDeposit}
        />
        {client ? (
          <ClientSummaryCard
            client={client}
            cardLabel={props.cardLabel}
            onEdit={props.onEditClient}
          />
        ) : null}
      </div>
    </div>
  );
}
