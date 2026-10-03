"use client";

import { Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PetVaccinationLine } from "@/lib/bookings/wizard/vaccination-check";
import {
  formatDateLong,
  formatDuration,
  formatList,
  formatMoney,
  isPluralOne,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// The rest of Confirm's checklist (the client's mock, 2026-10-01), each a
// section under a hairline, each shown only when it has something to say:
// vaccinations, the first-day evaluation (staff), package passes (staff,
// kept from the old form) and the deposit.
// ============================================================================

// The booking mock's sections (2026-10-02): a warm hairline above each.
const SECTION = "border-line-soft flex flex-col gap-2 border-t py-3.5";

export function VaccinationsSection({
  lines,
  duringStay,
}: {
  lines: readonly PetVaccinationLine[];
  /** A stay of more than a day: an expiry inside it is "during the stay". */
  duringStay: boolean;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  if (lines.length === 0) return null;
  return (
    <div className={SECTION}>
      <p className="text-body-ink text-[14.5px] font-semibold">
        {t("wizVaccinations")}
      </p>
      <ul className="flex flex-col gap-1.5">
        {lines.map((line) => {
          const names = formatList(line.vaccines, locale);
          const text =
            line.state === "ok"
              ? fill(t("wizVaxUpToDate"), { vaccines: names })
              : line.state === "missing"
                ? fill(
                    t(
                      line.vaccines.length === 1
                        ? "wizVaxMissingOne"
                        : "wizVaxMissingOther",
                    ),
                    { vaccines: names },
                  )
                : fill(
                    t(duringStay ? "wizVaxExpiresDuring" : "wizVaxExpires"),
                    {
                      vaccines: names,
                      date: formatDateLong(line.expiresOn ?? "", locale),
                    },
                  );
          return (
            <li
              key={line.petId}
              className="flex items-center gap-2.5 text-[13.5px]"
            >
              <span
                aria-hidden
                className={
                  line.state === "ok"
                    ? "size-2 shrink-0 rounded-full bg-(--dot-ok,var(--success-dot))"
                    : line.state === "missing"
                      ? "bg-error-dot size-2 shrink-0 rounded-full"
                      : "size-2 shrink-0 rounded-full bg-(--dot-warn,var(--warning-dot))"
                }
              />
              <span className="text-body-ink font-semibold">
                {line.petName}
              </span>
              <span
                className={
                  line.state === "ok"
                    ? "text-ink-tertiary"
                    : line.state === "missing"
                      ? "text-destructive"
                      : "text-warning"
                }
              >
                {text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EvaluationSection({
  petNames,
  price,
  minutes,
  on,
  onChange,
  reason,
  onReason,
  minReason,
  onBookEvaluation,
}: {
  petNames: string[];
  price: number;
  minutes: number;
  on: boolean;
  onChange: (on: boolean) => void;
  reason: string;
  onReason: (reason: string) => void;
  minReason: number;
  onBookEvaluation: () => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const pets = formatList(petNames, locale);
  const one = isPluralOne(petNames.length, locale);
  return (
    <div className={SECTION}>
      <div className="flex items-center gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label
            htmlFor="wizard-evaluation"
            className="text-body-ink cursor-pointer text-[14.5px] font-semibold"
          >
            {t("evaluation")}
          </label>
          <p className="text-ink-tertiary text-[13px] text-pretty">
            {on
              ? fill(t("wizEvalOn"), {
                  pets,
                  details: [
                    price > 0 ? formatMoney(price, locale) : t("wizFreeLower"),
                    minutes > 0 ? formatDuration(minutes, locale) : null,
                  ]
                    .filter(Boolean)
                    .join(", "),
                })
              : fill(t(one ? "wizEvalOffOne" : "wizEvalOffOther"), { pets })}
          </p>
        </div>
        <Switch
          id="wizard-evaluation"
          checked={on}
          onCheckedChange={onChange}
        />
      </div>
      {!on ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder={t("wizEvalReasonPh")}
            aria-label={t("wizEvalReason")}
            rows={2}
          />
          <p className="text-ink-tertiary text-[12.5px]">
            {fill(t("wizEvalReasonHelp"), { count: minReason })}
          </p>
          <Button
            type="button"
            variant="quiet"
            size="mock-36"
            className="self-start"
            onClick={onBookEvaluation}
          >
            {t("wizBookEvaluationInstead")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function PassesSection({
  packages,
  applied,
  onApply,
}: {
  packages: ReadonlyArray<{ id: string; name: string; passesLeft: number }>;
  applied: string | null;
  onApply: (id: string | null) => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  if (packages.length === 0) return null;
  return (
    <div className={SECTION}>
      <p className="text-body-ink text-[14.5px] font-semibold">
        {t("wizPasses")}
      </p>
      <ul className="flex flex-col gap-2">
        {packages.map((pkg) => {
          const on = applied === pkg.id;
          return (
            <li key={pkg.id} className="flex flex-wrap items-center gap-3">
              <Gift aria-hidden className="text-ink-tertiary size-5 shrink-0" />
              <span className="text-body-ink min-w-0 flex-1 text-[14px]">
                {fill(
                  t(
                    isPluralOne(pkg.passesLeft, locale)
                      ? "wizPassesLeftOne"
                      : "wizPassesLeftOther",
                  ),
                  { count: pkg.passesLeft, name: pkg.name },
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => onApply(on ? null : pkg.id)}
              >
                {on ? t("remove") : t("wizApply")}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type DepositMode = "card" | "link" | "cash" | "later";

export function DepositSection({
  isCustomer,
  amount,
  ruleText,
  mode,
  onMode,
  cardLabel,
  cashMethod,
  onCashMethod,
  refundHours,
}: {
  isCustomer: boolean;
  amount: number;
  ruleText: string;
  mode: DepositMode;
  onMode: (mode: DepositMode) => void;
  /** "Visa •••• 4242", when a chargeable card is on file. */
  cardLabel: string | null;
  cashMethod: "cash" | "e_transfer";
  onCashMethod: (method: "cash" | "e_transfer") => void;
  /** Customer: a full refund up to this many hours before; null when none. */
  refundHours: number | null;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const options: Array<{ value: DepositMode; label: string }> = [
    ...(cardLabel
      ? [
          {
            value: "card" as const,
            label: fill(t("wizChargeCard"), { card: cardLabel }),
          },
        ]
      : []),
    { value: "link", label: t("wizSendPaymentLink") },
    { value: "cash", label: t("wizCashNow") },
    { value: "later", label: t("wizCollectLater") },
  ];
  return (
    <div className="border-line-soft flex flex-col gap-2.5 border-t pt-3.5">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="text-body-ink text-[14.5px] font-semibold tabular-nums">
          {fill(t("wizDepositAmount"), { amount: formatMoney(amount, locale) })}
        </span>
        <span className="text-ink-tertiary text-[12.5px]">{ruleText}</span>
      </div>
      {isCustomer ? (
        <p className="text-ink-secondary text-[13px]">
          {cardLabel
            ? fill(
                t(
                  refundHours !== null
                    ? "wizDepositCardRefund"
                    : "wizDepositCard",
                ),
                { card: cardLabel, hours: refundHours ?? 0 },
              )
            : t("wizDepositLinkLater")}
        </p>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label={t("wizDepositHow")}
            className="flex flex-wrap gap-2"
          >
            {options.map((option) => (
              <ChoicePill
                key={option.value}
                type="radio"
                name="wizard-deposit"
                value={option.value}
                checked={mode === option.value}
                onChange={() => onMode(option.value)}
                className="min-h-9 max-lg:min-h-9"
              >
                {option.label}
              </ChoicePill>
            ))}
          </div>
          {mode === "cash" ? (
            <div
              role="radiogroup"
              aria-label={t("wizDepositTender")}
              className="flex flex-wrap gap-2"
            >
              <ChoicePill
                type="radio"
                name="wizard-deposit-tender"
                value="cash"
                checked={cashMethod === "cash"}
                onChange={() => onCashMethod("cash")}
              >
                {t("methodCash")}
              </ChoicePill>
              <ChoicePill
                type="radio"
                name="wizard-deposit-tender"
                value="e_transfer"
                checked={cashMethod === "e_transfer"}
                onChange={() => onCashMethod("e_transfer")}
              >
                {t("methodETransfer")}
              </ChoicePill>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
