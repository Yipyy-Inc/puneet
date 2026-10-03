"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { trainingQueries } from "@/lib/api/training";
import { useFacilityTimeZone } from "@/lib/api/facility-profile";
import {
  curriculumOf,
  sessionPlace,
} from "@/lib/bookings/details/training-view";
import { formatDateShort, formatTimeInZone } from "@/lib/i18n/format";
import { wallClockParts } from "@/lib/time/facility-time";
import { cn } from "@/lib/utils";

import { DetailsCard, DetailsCardHeader } from "../details-card";
import type { BookingDetails } from "../use-booking-details";
import type { ServiceFacts } from "../use-service-facts";

// ============================================================================
// Sessions, as the mock draws them: every session of the class, in order — a
// green tick for the ones gone by, today's in blue, the rest grey — with its
// title from the course's curriculum, its day and time on the facility's
// clock, and where it sits.
// ============================================================================

export function SessionsCard({
  d,
  facts,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
}) {
  const { t, fill, locale } = d.text;
  // The facility's course catalogue: the week-by-week titles.
  const { data: courseTypes = [] } = useQuery(trainingQueries.allCourseTypes());
  const timeZone = useFacilityTimeZone();
  // Fixed for the mount, like the care log's day: no clock read in render.
  const [now] = useState(() => new Date().toISOString());
  const training = facts.training;
  if (!training?.series) return null;

  const weeks = curriculumOf(courseTypes, training.series.courseTypeName);
  // Days on the facility's clock, not this browser's — today included.
  const dayOf = (iso: string) => wallClockParts(iso, timeZone).date;
  const today = dayOf(now);

  return (
    <DetailsCard>
      <DetailsCardHeader title={t("cardSessions")} />
      <ol className="flex flex-col px-5 pt-1.5 pb-3.5">
        {training.sessions.map((session) => {
          const place = sessionPlace(session, today, dayOf);
          const title =
            weeks.find((w) => w.sessionNumber === session.number)?.title ??
            fill("sessionNumber", { n: session.number });
          const time = formatTimeInZone(session.startAt, locale, timeZone);
          const when =
            place === "today"
              ? fill("todayAt", { time })
              : `${formatDateShort(`${dayOf(session.startAt)}T12:00:00`, locale)} · ${time}`;
          return (
            <li
              key={session.id}
              aria-current={
                session.id === training.currentSessionId ? "true" : undefined
              }
              className="border-line-soft grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b py-2.5"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-7 place-items-center rounded-full text-[12px] font-bold",
                  place === "done" && "bg-success text-white",
                  place === "today" && "bg-acc-soft text-primary",
                  place === "upcoming" &&
                    "bg-surface-inset-2 text-ink-disabled",
                )}
              >
                {place === "done" ? "✓" : session.number}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] font-medium">{title}</span>
                <span className="text-ink-tertiary text-[12px]">{when}</span>
              </span>
              <span
                data-kind={place === "today" ? "today" : "upcoming"}
                className="rounded-full bg-(--chip-bg) px-2 py-[3px] text-[12px] font-semibold text-(--chip-ink)"
              >
                {t(
                  place === "done"
                    ? "sessionDone"
                    : place === "today"
                      ? "sessionToday"
                      : "sessionUpcoming",
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </DetailsCard>
  );
}
