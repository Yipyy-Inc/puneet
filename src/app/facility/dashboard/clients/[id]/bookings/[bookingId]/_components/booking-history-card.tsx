"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  bookingHistoryQueries,
  type BookingHistoryEntry,
} from "@/lib/api/booking-history";
import {
  formatDateLong,
  formatMoney,
  formatRelative,
  formatTime,
} from "@/lib/i18n/format";
import { statusLabel } from "@/lib/i18n/labels";
import type { AppLocale } from "@/lib/language-settings";
import { useStaffText } from "@/lib/staff/use-staff-text";

/** Entries shown before "Show all". */
const FIRST = 6;

type Fill = (key: string, values: Record<string, string | number>) => string;

/** One recorded change, as a sentence in the reader's language. */
function describe(
  change: BookingHistoryEntry["changes"][number],
  t: (key: string) => string,
  fill: Fill,
  locale: AppLocale,
): string {
  const money = (v: unknown) =>
    v == null ? "—" : formatMoney(Number(v), locale);
  const when = (v: unknown) =>
    typeof v === "string"
      ? `${formatDateLong(v, locale)}, ${formatTime(v, locale)}`
      : "—";
  const status = (v: unknown) =>
    typeof v === "string" ? statusLabel(locale, v) : "—";
  const name = (v: unknown) => (typeof v === "string" && v ? v : "—");

  switch (change.field) {
    case "status":
      return change.from == null
        ? fill("historyCreated", { status: status(change.to) })
        : fill("historyStatus", {
            from: status(change.from),
            to: status(change.to),
          });
    case "start":
      return fill("historyStart", {
        from: when(change.from),
        to: when(change.to),
      });
    case "end":
      return fill("historyEnd", {
        from: when(change.from),
        to: when(change.to),
      });
    case "staff":
      return change.to
        ? fill("historyStaffAssigned", { name: name(change.to) })
        : fill("historyStaffRemoved", { name: name(change.from) });
    case "serviceType":
      return fill("historyServiceType", { to: name(change.to) });
    case "notes":
      return t("historyNotes");
    case "basePrice":
      return fill("historyBasePrice", {
        from: money(change.from),
        to: money(change.to),
      });
    case "discount":
      return fill("historyDiscount", {
        from: money(change.from),
        to: money(change.to),
      });
    case "total":
      return fill("historyTotal", {
        from: money(change.from),
        to: money(change.to),
      });
    case "tip":
      return fill("historyTip", {
        from: money(change.from),
        to: money(change.to),
      });
    case "location_id":
      return t("historyLocation");
    default:
      return t("historyChanged");
  }
}

/**
 * What happened to this booking, newest first — recorded by the database on
 * every write (20260919142555), so nothing in the app can forget to. It
 * replaced six invented "Change History" entries every booking page showed.
 *
 * Price changes reach only who may see the booking's money: the policy on
 * audit_log leaves them out of the answer for everyone else, so this card
 * never has to hide them.
 */
export function BookingHistoryCard({ bookingRef }: { bookingRef: number }) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const [showAll, setShowAll] = useState(false);
  const { data, isPending, isError, refetch } = useQuery(
    bookingHistoryQueries.forBooking(bookingRef),
  );

  const entries = data ?? [];
  const visible = showAll ? entries : entries.slice(0, FIRST);

  return (
    <Card id="history">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[17px]">
          <History className="size-5" />
          {t("historyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-full rounded-[14px]" />
            <Skeleton className="h-10 w-full rounded-[14px]" />
            <Skeleton className="h-10 w-2/3 rounded-[14px]" />
          </div>
        ) : isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-destructive flex items-center gap-2 text-sm">
              <CircleAlert className="size-4" />
              {t("historyLoadFailed")}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t("historyRetry")}
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("historyEmpty")}</p>
            <p className="text-muted-foreground text-[13.5px]">
              {t("historyEmptyHelp")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-4">
              {visible.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1">
                  {entry.changes.map((change, i) => (
                    <span key={i} className="text-sm tabular-nums">
                      {describe(change, t, fill, locale)}
                    </span>
                  ))}
                  <span className="text-muted-foreground text-[12px]">
                    {fill("historyBy", {
                      who:
                        !entry.who || entry.who === "System"
                          ? t("historyAutomatic")
                          : entry.who,
                      when: formatRelative(entry.at, locale),
                    })}
                  </span>
                </li>
              ))}
            </ol>
            {entries.length > FIRST && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll((all) => !all)}
              >
                {showAll
                  ? t("historyShowFewer")
                  : fill("historyShowAll", { n: entries.length })}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
