"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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

import { DetailsCard, DetailsCardHeader } from "./details-card";

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
    case "care_log": {
      // A log taken back (20261003150843): what it had said.
      const was = (change.from ?? {}) as {
        outcome?: string;
        occurredOn?: string;
      };
      return fill("historyCareCleared", {
        outcome: name(was.outcome?.replace(/_/g, " ")),
        day:
          typeof was.occurredOn === "string"
            ? formatDateLong(`${was.occurredOn}T12:00:00`, locale)
            : "—",
      });
    }
    case "careGate": {
      const n = Array.isArray(change.from) ? change.from.length : 0;
      return fill(n === 1 ? "historyCareGateOne" : "historyCareGateMany", {
        n,
        reason: name(change.to),
      });
    }
    default:
      return t("historyChanged");
  }
}

/**
 * History, as the mock draws it: a grey dot and a sentence for each thing that
 * happened to the booking, who did it and when, newest first. Recorded by the
 * database on every write (20260919142555), so nothing in the app can forget
 * to. Price changes reach only who may see the booking's money: the policy on
 * audit_log leaves them out for everyone else.
 */
export function HistoryCard({ bookingRef }: { bookingRef: number }) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const [showAll, setShowAll] = useState(false);
  const { data, isPending, isError, refetch } = useQuery(
    bookingHistoryQueries.forBooking(bookingRef),
  );

  const entries = data ?? [];
  const visible = showAll ? entries : entries.slice(0, FIRST);

  return (
    <DetailsCard id="history">
      <DetailsCardHeader title={t("historyTitle")} />
      <div className="flex flex-col px-5 pt-2 pb-3.5">
        {isPending ? (
          <div className="flex flex-col gap-3 py-2" aria-busy="true">
            <Skeleton className="h-8 w-full rounded-[12px]" />
            <Skeleton className="h-8 w-2/3 rounded-[12px]" />
          </div>
        ) : isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
            <p role="alert" className="text-bad text-[14px]">
              {t("historyLoadFailed")}
            </p>
            <Button variant="quiet" size="bd-34" onClick={() => void refetch()}>
              {t("historyRetry")}
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col gap-0.5 py-2">
            <p className="text-[14px]">{t("historyEmpty")}</p>
            <p className="text-ink-disabled text-[12px]">
              {t("historyEmptyHelp")}
            </p>
          </div>
        ) : (
          <>
            <ol className="flex flex-col">
              {visible.map((entry) => (
                <li
                  key={entry.id}
                  className="grid grid-cols-[12px_minmax(0,1fr)] gap-3 py-2.5"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 size-2 rounded-full bg-(--check-off)"
                  />
                  <span className="flex flex-col gap-0.5">
                    {entry.changes.map((change, i) => (
                      <span key={i} className="text-[14px] tabular-nums">
                        {describe(change, t, fill, locale)}
                      </span>
                    ))}
                    <span className="text-ink-disabled text-[12px]">
                      {fill("historyBy", {
                        who:
                          !entry.who || entry.who === "System"
                            ? t("historyAutomatic")
                            : entry.who,
                        when: formatRelative(entry.at, locale),
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {entries.length > FIRST ? (
              <Button
                variant="quiet"
                size="bd-34"
                className="self-start"
                onClick={() => setShowAll((all) => !all)}
              >
                {showAll
                  ? t("historyShowFewer")
                  : fill("historyShowAll", { n: entries.length })}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </DetailsCard>
  );
}
