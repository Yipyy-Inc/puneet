"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainingMissedSession } from "@/lib/api/mappers/training-makeups";
import {
  trainingMakeupQueries,
  useMakeupAction,
} from "@/lib/api/training-makeups";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
import { NO_ITEMS } from "@/lib/no-items";
import { useStaffText } from "@/lib/staff/use-staff-text";

/** Book a missed session's make-up: a seat in a future session of the same
 *  course, in another series, confirmed at $0. It was "Send offer", which put
 *  a record in the query cache and toasted that the owner had been told. */
export function OfferMakeupDialog({
  session,
  onOpenChange,
}: {
  session: TrainingMissedSession | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, fill, locale } = useStaffText("trainingMakeups");
  const seats = useQuery(
    trainingMakeupQueries.seats(session?.bookingId ?? null),
  );
  const action = useMakeupAction();

  async function book(seat: {
    sessionId: string;
    seriesName: string;
    startAt: string;
  }) {
    if (!session) return;
    try {
      await action.mutateAsync({
        bookingId: session.bookingId,
        action: "offer",
        hostSessionId: seat.sessionId,
      });
      toast.success(
        fill("seatBooked", {
          pet: session.petName,
          series: seat.seriesName,
          date: formatDateLong(seat.startAt, locale),
        }),
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  const rows = seats.data ?? NO_ITEMS;
  const booking =
    action.isPending && action.variables?.action === "offer"
      ? action.variables.hostSessionId
      : null;

  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {session ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {fill("offerTitle", { pet: session.petName })}
              </DialogTitle>
              <DialogDescription>
                {fill("offerDescription", {
                  course: session.courseName,
                  owner: session.ownerName,
                })}
              </DialogDescription>
            </DialogHeader>

            {seats.error ? (
              <RouteState
                surface="card"
                className="min-h-0 p-0"
                pose="error"
                icon={CircleAlert}
                inkClassName="text-destructive"
                title={t("seatsFailed")}
                description={t("loadFailed")}
              />
            ) : seats.isPending ? (
              <div className="space-y-2" aria-busy="true">
                <span className="sr-only">{t("seatsLoading")}</span>
                <Skeleton className="h-20 rounded-md motion-reduce:animate-none" />
                <Skeleton className="h-20 rounded-md motion-reduce:animate-none" />
              </div>
            ) : rows.length === 0 ? (
              <RouteState
                surface="card"
                className="min-h-0 p-0"
                pose="searching"
                icon={Users}
                inkClassName="text-ink-secondary"
                title={fill("noSeatsTitle", { course: session.courseName })}
                description={fill("noSeatsBody", { pet: session.petName })}
              />
            ) : (
              <ul className="space-y-2">
                {rows.map((seat) => (
                  <li
                    key={seat.sessionId}
                    className="border-line flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-body-strong text-body-ink">
                        {seat.seriesName}
                      </p>
                      <p className="text-meta text-ink-secondary">
                        {fill("seat", {
                          number: seat.sessionNumber,
                          series: seat.seriesName,
                          date: formatDateLong(seat.startAt, locale),
                          time: formatTime(seat.startAt, locale),
                        })}
                      </p>
                      <p className="text-meta text-ink-tertiary tabular-nums">
                        {[
                          seat.trainerName,
                          seat.locationName,
                          seat.seatsLeft === 1
                            ? t("seatsLeftOne")
                            : fill("seatsLeftOther", { n: seat.seatsLeft }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button
                      onClick={() => void book(seat)}
                      loading={booking === seat.sessionId}
                      disabled={action.isPending}
                    >
                      {t("bookThisSeat")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
