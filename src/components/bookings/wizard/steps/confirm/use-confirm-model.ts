"use client";

import { useQuery } from "@tanstack/react-query";

import {
  useBookingApproval,
  useDepositRules,
  useTaxConfig,
  useVaccinationRules,
} from "@/lib/api/facility-settings";
import { useSavedCards } from "@/lib/api/saved-cards";
import { vaccinationQueries } from "@/lib/api/vaccinations";
import type { WaiverRow } from "@/lib/api/waivers";
import type { Quote } from "@/lib/bookings/quote/assemble";
import {
  checklistIssues,
  heroLine,
  previewStatus,
  type HeroFacts,
  type PreviewStatus,
} from "@/lib/bookings/wizard/confirm-view";
import {
  detailRows,
  type DetailEdit,
  type DetailFacts,
} from "@/lib/bookings/wizard/detail-rows";
import {
  estimateTotals,
  type EstimateTotals,
} from "@/lib/bookings/wizard/estimate-totals";
import { vaccinationLines } from "@/lib/bookings/wizard/vaccination-check";
import { formatMoney, formatPercent } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { fill } from "@/lib/medications/dose";
import {
  autoConfirmsService,
  responseHoursFor,
} from "@/lib/settings/booking-approval";
import { computeDepositAmount } from "@/lib/settings/deposits";
import { localToday } from "@/lib/vaccinations";
import type { Client } from "@/types/client";
import type { DepositRule } from "@/types/deposit-rules";
import type { Pet } from "@/types/pet";

import type { SigningLinks } from "./AgreementsSection";
import type { DepositMode } from "./ChecklistSections";
import type { ConfirmStepProps } from "./ConfirmStep";

// ============================================================================
// Everything Confirm shows, worked out from the wizard's state (the client's
// mock, 2026-10-01) — and the three facts the wizard's own footer needs from
// it: whether the request waits for approval, the deposit, and the Total.
//
// Kept beside the step so BookingModal hands over facts, not markup.
// ============================================================================

type Translate = (key: string) => string;

export interface ConfirmModelInput {
  t: Translate;
  locale: AppLocale;
  isCustomer: boolean;
  isEstimate: boolean;
  /** Only Confirm reads the vaccines, so they load when it opens. */
  onConfirm: boolean;
  service: string;
  kindLabel: string;
  pets: Pet[];
  client: Client | undefined;
  facilityName?: string;
  /** Facts for the hero line and the details card. */
  details: Omit<DetailFacts, "service">;
  hero: Omit<HeroFacts, "service">;
  /** The first and last day of the booking, YYYY-MM-DD; null before dates. */
  firstDay: string | null;
  lastDay: string | null;
  onEdit: (edit: DetailEdit) => void;
  waivers: { applicable: readonly WaiverRow[]; pending: readonly WaiverRow[] };
  links?: SigningLinks;
  evaluation: ConfirmStepProps["evaluation"];
  /** Required forms still missing, and staff's reason to go ahead. */
  forms?: ConfirmStepProps["forms"];
  passes: ConfirmStepProps["passes"];
  depositRule: DepositRule | null;
  depositMode: DepositMode;
  setDepositMode: (mode: DepositMode) => void;
  cashMethod: "cash" | "e_transfer";
  setCashMethod: (method: "cash" | "e_transfer") => void;
  quote: Quote;
  notify: ConfirmStepProps["notify"];
  specialRequests: string;
  setSpecialRequests: (value: string) => void;
  onEditClient?: () => void;
  /** A pass pays for it: no approval wait, no deposit. */
  passRedemption: boolean;
}

export interface ConfirmModel {
  props: ConfirmStepProps;
  status: PreviewStatus;
  heroLine: string;
  requiresApproval: boolean;
  approvalHours: number;
  depositAmount: number;
  estimate: EstimateTotals;
  /** The saved card a deposit is charged to, or null. */
  depositCardId: string | null;
}

const NO_RECORDS: never[] = [];

export function useConfirmModel(input: ConfirmModelInput): ConfirmModel {
  const { t, locale } = input;
  const { approval } = useBookingApproval();
  const { config: taxConfig } = useTaxConfig();
  const { refundPolicy } = useDepositRules();
  const { rules: vaccinationRules } = useVaccinationRules();
  const clientRef =
    input.client && input.client.id > 0 ? input.client.id : undefined;
  const { data: records } = useQuery({
    ...vaccinationQueries.scoped(
      input.isCustomer
        ? { kind: "mine" }
        : { kind: "client", ref: clientRef ?? 0 },
    ),
    enabled: input.onConfirm && (input.isCustomer || clientRef !== undefined),
  });
  // The client's saved cards — staff's view of them, or a customer's own:
  // the deposit is charged to one (2026-10-02).
  const { data: cards } = useSavedCards(input.client?.rowId ?? null);
  const card = (cards ?? []).find((c) => c.chargeable && c.last4);
  const cardLabel = card
    ? `${card.brand ?? t("wizCard")} •••• ${card.last4}`
    : null;

  const requiresApproval =
    input.isCustomer &&
    !input.passRedemption &&
    !autoConfirmsService(approval, input.service);
  const approvalHours = responseHoursFor(approval, input.service);

  const money = (amount: number) => formatMoney(amount, locale);
  const rule = input.passRedemption ? null : input.depositRule;
  const depositAmount = rule
    ? computeDepositAmount(rule, input.quote.total)
    : 0;
  const estimate = estimateTotals(input.quote.subtotal, taxConfig);

  const today = localToday();
  const lines =
    input.firstDay && input.lastDay
      ? vaccinationLines({
          pets: input.pets,
          records: records ?? NO_RECORDS,
          rules: vaccinationRules,
          service: input.service,
          firstDay: input.firstDay,
          lastDay: input.lastDay,
        })
      : vaccinationLines({
          pets: input.pets,
          records: records ?? NO_RECORDS,
          rules: vaccinationRules,
          service: input.service,
          firstDay: today,
          lastDay: today,
        });

  const depositDue =
    !input.isCustomer &&
    depositAmount > 0 &&
    (input.depositMode === "link" || input.depositMode === "later");
  const status = previewStatus({
    isCustomer: input.isCustomer,
    missingAgreements: input.waivers.pending.length,
    requiresApproval,
    depositDue,
  });
  const issues = checklistIssues({
    missingAgreements: input.waivers.pending.length,
    vaccinationWarning: lines.some((line) => line.state !== "ok"),
    evaluationDeclined: !!input.evaluation && !input.evaluation.on,
  });
  const line = heroLine({ service: input.service, ...input.hero }, t, locale);

  const ruleText = rule
    ? [
        rule.amountType === "percentage"
          ? fill(t("wizDepositPercent"), {
              percent: formatPercent(
                rule.amount,
                locale,
                (String(rule.amount).split(".")[1] ?? "").length,
              ),
            })
          : fill(t("wizDepositFixed"), { amount: money(rule.amount) }),
        input.isCustomer ? null : t("wizDepositWhere"),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const rows = detailRows(
    { service: input.service, ...input.details },
    t,
    locale,
  );

  const props: ConfirmStepProps = {
    isCustomer: input.isCustomer,
    service: input.service,
    kindLabel: input.kindLabel,
    pets: input.pets,
    client: input.client,
    heroLine: line,
    status,
    approval: { required: requiresApproval, hours: approvalHours },
    agreements: {
      applicable: input.waivers.applicable,
      pending: input.waivers.pending,
      clientRef,
      links: input.isCustomer ? undefined : input.links,
    },
    vaccinations: lines,
    forms: input.forms,
    duringStay:
      !!input.firstDay && !!input.lastDay && input.lastDay > input.firstDay,
    evaluation: input.evaluation,
    passes: input.passes,
    deposit:
      depositAmount > 0
        ? {
            isCustomer: input.isCustomer,
            amount: depositAmount,
            ruleText,
            mode: input.depositMode,
            onMode: input.setDepositMode,
            cardLabel,
            cashMethod: input.cashMethod,
            onCashMethod: input.setCashMethod,
            refundHours:
              refundPolicy.type === "full_before_window"
                ? refundPolicy.refundBeforeHours
                : null,
          }
        : undefined,
    // A required form still missing is one more thing to review — until
    // staff have said why the booking goes ahead without it.
    issues:
      issues +
      (input.forms &&
      input.forms.missing.some((form) => form.enforcement === "block") &&
      (input.isCustomer ||
        input.forms.reason.trim().length < input.forms.minReason)
        ? 1
        : 0),
    detailsTitle: fill(t("wizKindDetails"), { kind: input.kindLabel }),
    detailRows: rows.map((row) => ({
      key: row.key,
      label: row.label,
      value: row.value,
      onEdit: row.edit ? () => input.onEdit(row.edit!) : undefined,
    })),
    notify: input.isCustomer ? undefined : input.notify,
    specialRequests: input.specialRequests,
    onSpecialRequests: input.setSpecialRequests,
    lines: input.quote.lines,
    totals: estimate,
    estimateDeposit:
      depositAmount > 0
        ? {
            amount: depositAmount,
            label: input.isCustomer
              ? t("wizDepositAtConfirmation")
              : input.depositMode === "card"
                ? t("wizDepositChargedToday")
                : input.depositMode === "cash"
                  ? t("wizDepositCollectedToday")
                  : t("wizDepositDue"),
          }
        : null,
    cardLabel,
    onEditClient: input.isCustomer ? undefined : input.onEditClient,
    facilityName: input.facilityName,
  };

  return {
    props,
    status,
    heroLine: line,
    requiresApproval,
    approvalHours,
    depositAmount,
    estimate,
    depositCardId: card?.id ?? null,
  };
}
