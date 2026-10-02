"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { EvaluationResultChip } from "@/components/evaluations/result-chip";
import { Badge } from "@/components/ui/badge";
import { useOwnerEvaluationCards } from "@/lib/api/customer-evaluations";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong } from "@/lib/i18n/format";

// ============================================================================
// "Evaluations" on the owner's report cards (the client's mock, 2026-10-02):
// each evaluation report card they were sent, newest first, the unopened ones
// marked New. Nothing at all while there are none — the report cards below
// are the page.
// ============================================================================

export function EvaluationCardsList() {
  const { t, fill, locale } = useCustomerText("evaluations");
  const cards = useOwnerEvaluationCards();
  const list = cards.data ?? [];
  if (list.length === 0) return null;

  return (
    <section
      aria-labelledby="customer-evaluations"
      className="bg-card border-line overflow-hidden rounded-3xl border"
    >
      <h2
        id="customer-evaluations"
        className="text-section text-heading border-line border-b px-4 py-3"
      >
        {t("listTitle")}
      </h2>
      <ul className="divide-line divide-y">
        {list.map((card) => (
          <li key={card.id}>
            <Link
              href={`/customer/evaluations/${card.id}`}
              aria-label={fill("openCard", { pet: card.petName })}
              className="hover:bg-surface-inset focus-visible:ring-primary/40 flex min-h-14 min-w-0 flex-wrap items-center gap-3 px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span className="text-body-strong text-body-ink block truncate">
                  {card.petName}
                </span>
                <span className="text-meta text-ink-secondary block">
                  {formatDateLong(card.completedAt ?? card.sentAt, locale)}
                </span>
              </span>
              {card.result ? (
                <EvaluationResultChip result={card.result} />
              ) : null}
              {card.openedAt ? null : (
                <Badge variant="default">{t("new")}</Badge>
              )}
              <ChevronRight
                className="text-ink-disabled size-4 shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
