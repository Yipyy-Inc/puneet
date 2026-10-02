"use client";

import { Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { initialsOf } from "@/lib/bookings/wizard/client-search";
import type { EstimateTotals } from "@/lib/bookings/wizard/estimate-totals";
import type { QuoteLine } from "@/lib/bookings/quote/assemble";
import { formatMoney, formatPercent } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/client";

// ============================================================================
// Confirm's side column (the client's mock, 2026-10-01): what it costs, line
// by line, with the facility's taxes — and who it is for. Beside the details
// from 1024px, under them below that.
// ============================================================================

export function EstimateCard({
  lines,
  totals,
  deposit,
}: {
  lines: readonly QuoteLine[];
  totals: EstimateTotals;
  /** The deposit, and what the line under the total calls it. */
  deposit?: { amount: number; label: string } | null;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const money = (amount: number) => formatMoney(amount, locale);
  return (
    <section
      aria-labelledby="wizard-estimate"
      className="border-line bg-card flex flex-col gap-3.5 rounded-2xl border p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span id="wizard-estimate" className="text-meta text-ink-tertiary">
            {t("estimatedTotal")}
          </span>
          <span className="text-heading text-[30px]/[1.15] font-bold tracking-[-0.02em] tabular-nums">
            {money(totals.total)}
          </span>
        </div>
        {deposit && deposit.amount > 0 ? (
          <Badge variant="pending" className="tabular-nums">
            <Wallet aria-hidden />
            {fill(t("wizDepositChip"), { amount: money(deposit.amount) })}
          </Badge>
        ) : null}
      </div>

      {lines.length > 0 ? (
        <ul className="border-line flex flex-col gap-2.5 border-t pt-3">
          {lines.map((line) => (
            <li key={line.key} className="flex justify-between gap-2.5">
              <div className="flex min-w-0 flex-col">
                <span className="text-body text-body-ink">{line.label}</span>
                {line.detail ? (
                  <span className="text-meta text-ink-tertiary tabular-nums">
                    {line.detail}
                  </span>
                ) : null}
              </div>
              <span className="text-body text-body-ink font-medium whitespace-nowrap tabular-nums">
                {line.amount === 0
                  ? t("priceFree")
                  : line.amount < 0
                    ? `−${money(Math.abs(line.amount))}`
                    : money(line.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="border-line text-meta flex flex-col gap-1.5 border-t pt-3 tabular-nums">
        <TotalRow label={t("subtotal")} value={money(totals.subtotal)} />
        {totals.taxes.map((tax) => {
          // As many decimals as the rate has: "GST 5%", "QST 9.975%".
          const percent = Math.round(tax.rate * 100_000) / 1000;
          const digits = (String(percent).split(".")[1] ?? "").length;
          return (
            <TotalRow
              key={tax.name}
              label={`${tax.name} ${formatPercent(percent, locale, digits)}`}
              value={money(tax.amount)}
            />
          );
        })}
        <TotalRow
          label={totals.included ? t("wizTotalTaxIncluded") : t("total")}
          value={money(totals.total)}
          strong
        />
        {deposit && deposit.amount > 0 ? (
          <TotalRow
            label={deposit.label}
            value={money(deposit.amount)}
            tone="success"
          />
        ) : null}
      </dl>
    </section>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "success";
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3",
        strong
          ? "text-body-ink pt-1 text-[15px] font-bold"
          : tone === "success"
            ? "text-success font-medium"
            : "text-ink-tertiary",
      )}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ClientSummaryCard({
  client,
  cardLabel,
  onEdit,
}: {
  client: Client;
  /** "Visa •••• 4242", when one is on file. */
  cardLabel?: string | null;
  /** Staff: back to step 1. */
  onEdit?: () => void;
}) {
  const t = useShellText("booking");
  const since = client.createdAt ? client.createdAt.slice(0, 4) : null;
  return (
    <section className="border-line bg-card flex flex-col gap-2.5 rounded-2xl border px-5 py-[18px]">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-surface-inset text-body-ink flex size-[42px] shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
        >
          {initialsOf(client.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-strong text-body-ink">{client.name}</span>
          {since ? (
            <span className="text-meta text-ink-tertiary">
              {fill(t("wizClientSince"), { year: since })}
            </span>
          ) : null}
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-meta text-primary hover:text-primary-hover focus-visible:outline-primary inline-flex min-h-10 items-center rounded-full px-1 font-semibold focus-visible:outline-2 max-lg:min-h-12"
          >
            {t("edit")}
          </button>
        ) : null}
      </div>
      <div className="text-meta text-ink-secondary flex flex-col gap-0.5 wrap-break-word">
        {client.phone ? <span>{client.phone}</span> : null}
        {client.email ? <span>{client.email}</span> : null}
        {cardLabel ? (
          <span>{fill(t("wizCardOnFile"), { card: cardLabel })}</span>
        ) : null}
      </div>
    </section>
  );
}
