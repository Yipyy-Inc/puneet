"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CircleAlert, Search, SearchX } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TrainingMissedSession } from "@/lib/api/mappers/training-makeups";
import { trainingMakeupQueries } from "@/lib/api/training-makeups";
import { NO_ITEMS } from "@/lib/no-items";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { IneligibleDialog } from "./ineligible-dialog";
import { MakeupRow } from "./makeup-row";
import { OfferMakeupDialog } from "./offer-makeup-dialog";

type Bucket = "needs" | "booked" | "closed";

const BUCKETS: readonly Bucket[] = ["needs", "booked", "closed"];

const TAB_LABEL: Record<Bucket, string> = {
  needs: "tabNeeds",
  booked: "tabBooked",
  closed: "tabClosed",
};

const EMPTY: Record<Bucket, { title: string; body: string }> = {
  needs: { title: "emptyNeedsTitle", body: "emptyNeedsBody" },
  booked: { title: "emptyBookedTitle", body: "emptyBookedBody" },
  closed: { title: "emptyClosedTitle", body: "emptyClosedBody" },
};

/** Where a missed session stands. A declined seat needs action again: the
 *  owner still has no make-up, and staff may book another. */
function bucketOf(session: TrainingMissedSession): Bucket {
  const status = session.makeup?.status;
  if (status === "offered") return "booked";
  if (status === "skipped" || status === "ineligible") return "closed";
  return "needs";
}

/** The facility's Make-up sessions page. Every dog who missed a session of
 *  its series, from the bookings that never checked in; staff book one a seat
 *  in another series of the same course, or mark the absence ineligible. */
export function MakeupSessionsBoard() {
  const text = useStaffText("trainingMakeups");
  const { t, fill } = text;
  const { data, error, isPending } = useQuery(trainingMakeupQueries.all());
  const [search, setSearch] = useState("");
  const [offering, setOffering] = useState<TrainingMissedSession | null>(null);
  const [closing, setClosing] = useState<TrainingMissedSession | null>(null);

  const query = search.trim().toLowerCase();
  const sessions = data ?? NO_ITEMS;
  const buckets = useMemo(() => {
    const out: Record<Bucket, TrainingMissedSession[]> = {
      needs: [],
      booked: [],
      closed: [],
    };
    for (const session of sessions) {
      if (
        query &&
        ![
          session.petName,
          session.ownerName,
          session.seriesName,
          session.courseName,
        ].some((value) => value.toLowerCase().includes(query))
      ) {
        continue;
      }
      out[bucketOf(session)].push(session);
    }
    return out;
  }, [sessions, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={t("title")} description={t("description")} />
        <div className="relative w-full min-w-0 sm:w-72">
          <Search
            aria-hidden
            className="text-ink-tertiary pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="pl-10"
          />
        </div>
      </div>

      {error ? (
        // §5d2's ladder: a panel that would not load takes `error`.
        <RouteState
          surface="card"
          className="min-h-0 p-0"
          pose="error"
          icon={CircleAlert}
          inkClassName="text-destructive"
          title={t("loadFailedTitle")}
          description={t("loadFailed")}
        />
      ) : isPending ? (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">{t("loading")}</span>
          <Skeleton className="h-32 rounded-2xl motion-reduce:animate-none" />
          <Skeleton className="h-32 rounded-2xl motion-reduce:animate-none" />
        </div>
      ) : (
        <Tabs defaultValue="needs" className="space-y-4">
          <TabsList>
            {BUCKETS.map((bucket) => (
              <TabsTrigger key={bucket} value={bucket} className="gap-2">
                {t(TAB_LABEL[bucket])}
                <span className="text-ink-secondary tabular-nums">
                  {buckets[bucket].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {BUCKETS.map((bucket) => (
            <TabsContent key={bucket} value={bucket} className="space-y-3">
              {buckets[bucket].length === 0 ? (
                query ? (
                  // A filtered empty is an empty surface: `searching` (§5d2).
                  <RouteState
                    surface="card"
                    className="min-h-0 p-0"
                    pose="searching"
                    icon={SearchX}
                    inkClassName="text-ink-secondary"
                    title={fill("emptySearchTitle", { query: search.trim() })}
                    description={t("emptySearchBody")}
                  />
                ) : (
                  // Never had data: training's pose is `idea` (§5d2).
                  <RouteState
                    surface="card"
                    className="min-h-0 p-0"
                    pose="idea"
                    icon={CalendarCheck}
                    inkClassName="text-ink-secondary"
                    title={t(EMPTY[bucket].title)}
                    description={t(EMPTY[bucket].body)}
                  />
                )
              ) : (
                <ul className="space-y-3" aria-label={t(TAB_LABEL[bucket])}>
                  {buckets[bucket].map((session) => (
                    <MakeupRow
                      key={session.bookingId}
                      session={session}
                      text={text}
                      onOffer={() => setOffering(session)}
                      onIneligible={() => setClosing(session)}
                    />
                  ))}
                </ul>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <OfferMakeupDialog
        session={offering}
        onOpenChange={(open) => {
          if (!open) setOffering(null);
        }}
      />
      <IneligibleDialog
        session={closing}
        onOpenChange={(open) => {
          if (!open) setClosing(null);
        }}
      />
    </div>
  );
}
