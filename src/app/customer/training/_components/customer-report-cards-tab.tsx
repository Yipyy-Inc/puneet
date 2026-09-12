"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { reportCardQueries } from "@/lib/api/report-cards";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { NO_ITEMS } from "@/lib/no-items";
import { sectionsOf } from "@/lib/report-cards/sections";
import type { ReportCard } from "@/types/report-card";

type CustomerText = ReturnType<typeof useCustomerText>;

/** The Report cards tab on the customer's training page — the training
 *  report cards the facility has sent, newest first, each opening on the
 *  Report cards page.
 *
 *  ── WHAT CHANGED (2026-09-12) ────────────────────────────────────────────
 *
 *  It read `trainingQueries.allReportCards()`, cards the training fixture
 *  invented, matched to the customer through `@/data/clients`. Opening one
 *  "marked it viewed" in the query cache only, and on load it fired a toast
 *  dressed as a system message about a graduation follow-up. It lists the
 *  sent training cards from /api/report-cards now — the rows the Report cards
 *  page shows — and each opens there (`?report=<id>`), which records the view
 *  and carries the real favourite, reply and rating. It no longer promises a
 *  progress summary after every session: nothing sends one. */
export function CustomerReportCardsTab() {
  const text = useCustomerText("training");
  const { t, fill } = text;
  const { data, error, isPending } = useQuery(reportCardQueries.mine());

  if (error) {
    // §5d2's ladder: a panel that would not load takes `error`.
    return (
      <RouteState
        surface="card"
        className="min-h-0 p-0"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={t("rcLoadFailedTitle")}
        description={t("rcLoadFailed")}
      />
    );
  }

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy>
        <span className="sr-only">{t("rcLoading")}</span>
        <Skeleton className="h-32 rounded-2xl motion-reduce:animate-none" />
      </div>
    );
  }

  // `mine()` asks for SENT cards, so a draft the facility is still writing
  // never reaches this list.
  const cards = (data ?? NO_ITEMS).filter(
    (card) => card.serviceType === "training",
  );

  if (cards.length === 0) {
    // Never had data: training's pose is `idea` (§5d2).
    return (
      <RouteState
        surface="card"
        className="min-h-0 p-0"
        pose="idea"
        icon={FileText}
        inkClassName="text-ink-secondary"
        title={t("rcEmptyTitle")}
        description={t("rcEmptyBody")}
      />
    );
  }

  const unread = cards.filter((card) => !card.viewedAt).length;

  return (
    <div className="space-y-3">
      <p className="text-body-ink text-body">
        {rich(
          t(cards.length === 1 ? "reportCardCountOne" : "reportCardCountOther"),
          {
            n: (
              <span className="font-semibold tabular-nums">{cards.length}</span>
            ),
          },
        )}
        {unread > 0 && (
          <span className="text-ink-secondary">
            {" · "}
            {fill("newCount", { n: unread })}
          </span>
        )}
      </p>
      <ul aria-label={t("rcListLabel")} className="space-y-3">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} text={text} />
        ))}
      </ul>
    </div>
  );
}

function CardItem({ card, text }: { card: ReportCard; text: CustomerText }) {
  const { t, fill, locale } = text;
  // The first section the facility wrote is the preview; the rest is on the
  // Report cards page, with the photos.
  const preview = sectionsOf(card)[0]?.body;
  const visit = fill("rcVisit", {
    date: formatDateLong(card.visitDate, locale),
  });

  return (
    <li className="border-line bg-card shadow-card rounded-2xl border p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body-ink text-body-strong">
            {fill("rcCardTitle", { pet: card.petName ?? t("rcYourDog") })}
          </h3>
          <p className="text-ink-tertiary text-meta mt-0.5">
            {card.sentAt
              ? `${visit} · ${fill("rcSentOn", { date: formatDateLong(card.sentAt, locale) })}`
              : visit}
          </p>
        </div>
        {!card.viewedAt && (
          <span className="text-info text-meta font-semibold">{t("new")}</span>
        )}
      </div>

      {preview && (
        // The facility's own words, never through the locale layer.
        <p className="text-body-ink text-body mt-3 line-clamp-3 wrap-break-word whitespace-pre-line">
          {preview}
        </p>
      )}

      <Button asChild variant="outline" className="mt-4">
        <Link
          href={`/customer/report-cards?report=${encodeURIComponent(card.id)}`}
        >
          <FileText aria-hidden />
          {t("rcRead")}
        </Link>
      </Button>
    </li>
  );
}
