"use client";

import { ArrowRightLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { KennelRun } from "@/components/icons/yipyy-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookingStays } from "@/lib/api/boarding-rooms";
import { pgTimestamp } from "@/lib/boarding/stay-segments";
import { todayIso } from "@/lib/care-log-scheduler";
import { formatCalendarDayLong } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

const MoveKennelDialog = dynamic(() =>
  import("./move-kennel-dialog").then((m) => m.MoveKennelDialog),
);

// ============================================================================
// Where a boarding guest sleeps, night by night.
//
// The page showed `booking.kennel`, which nothing writes for a real booking,
// so a boarding booking said nothing about its kennel at all. This reads the
// stays themselves: one while the guest keeps one kennel, one per kennel once
// they move part-way — each with the nights it covers — and offers the move.
// ============================================================================

export function BookingKennelsCard({
  bookingRef,
  petName,
  startDate,
  endDate,
  canMove,
}: {
  bookingRef: number;
  petName: string;
  /** The booking's first night and check-out day, YYYY-MM-DD. */
  startDate: string;
  endDate: string;
  /** Staff who may change a booking; a closed booking offers no move. */
  canMove: boolean;
}) {
  const { t, fill, locale } = useStaffText("kennelMoves");
  const { data: stays, isPending, error } = useBookingStays(bookingRef);
  const [moving, setMoving] = useState(false);

  // A stay's first night is where its range begins; the last stay runs to
  // check-out, whatever a late check-out cut-off extends its range to.
  const day = (value: string) => {
    const ms = pgTimestamp(value);
    return ms === null
      ? ""
      : formatCalendarDayLong(todayIso(new Date(ms)), locale);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-ink-tertiary flex items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
          <KennelRun className="size-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-1 text-sm">
        {isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : error ? (
          <p role="alert" className="text-destructive">
            {t("loadFailed")}
          </p>
        ) : stays.length === 0 ? (
          <p className="text-ink-tertiary">{t("none")}</p>
        ) : (
          <ol className="space-y-3">
            {stays.map((stay, index) => (
              <li
                key={stay.segment}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1"
              >
                <span className="text-ink-tertiary">
                  {fill("nights", {
                    from: day(stay.from),
                    to:
                      index === stays.length - 1
                        ? formatCalendarDayLong(endDate, locale)
                        : day(stay.to),
                  })}
                </span>
                <span className="text-body-ink min-w-0 text-right font-semibold">
                  {stay.roomName ?? t("unknownKennel")}
                </span>
              </li>
            ))}
          </ol>
        )}

        {canMove && stays && stays.length > 0 && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setMoving(true)}>
              <ArrowRightLeft className="size-4" />
              {fill("moveButton", { pet: petName })}
            </Button>
          </div>
        )}
      </CardContent>

      {moving && (
        <MoveKennelDialog
          open={moving}
          onOpenChange={setMoving}
          bookingRef={bookingRef}
          petName={petName}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </Card>
  );
}
