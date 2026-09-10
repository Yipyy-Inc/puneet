"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Bed,
  Clock,
  DollarSign,
  LogIn,
  LogOut,
  PawPrint,
  Phone,
  Pill,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useBoardingRooms, summariseOccupancy } from "@/lib/api/boarding-rooms";
import { useBoardingDay } from "@/lib/api/boarding-attendance";
import { bookingQueries } from "@/lib/api/booking";
import { clientQueries } from "@/lib/api/client";
import {
  formatDateShort,
  formatMoney,
  formatPercent,
  formatTime,
} from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { BoardingArrival } from "@/lib/api/mappers/boarding-arrival";

// ============================================================================
// The boarding overview: who is here, who is coming, who is going.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// Every list on this page read the `boardingGuests` FIXTURE, filtered against
// a hard-coded `today = "2026-04-26"` — so a real facility saw the same
// invented April guests forever, and the arrivals it had actually booked for
// today appeared nowhere. Only the occupancy card was real.
//
// Arrivals, departures and the guests on site now come from the same
// `/api/boarding/attendance` day the arrivals board works from, so the two
// pages cannot disagree. Medication comes from the booking; allergies from the
// pet record.
// ============================================================================

const DAY_MS = 86_400_000;

/** A date's local YYYY-MM-DD, for "which day" questions. */
function localDay(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hasAllergy(text: string | undefined): boolean {
  const value = (text ?? "").trim();
  return value !== "" && !/^(none|no|n\/a|aucune?)$/i.test(value);
}

export default function BoardingDashboardPage() {
  const { t, fill, locale } = useStaffText("boardingOverview");
  const { data: roomsPayload } = useBoardingRooms();
  const occupancy = summariseOccupancy(roomsPayload);
  const { data: day, isPending, isError } = useBoardingDay();
  const { data: bookings = [] } = useQuery(bookingQueries.all());
  const { data: clients = [] } = useQuery(clientQueries.all());

  const guests = useMemo(() => day?.guests ?? [], [day]);
  const current = guests.filter((g) => g.status === "checked-in");
  const arrivals = guests.filter((g) => g.isArrivingToday);
  const departures = guests.filter(
    (g) => g.isDepartingToday && g.status !== "scheduled",
  );

  const medsByBooking = useMemo(
    () =>
      new Set(
        bookings
          .filter((b) => (b.medications ?? []).length > 0)
          .map((b) => String(b.id)),
      ),
    [bookings],
  );
  const allergicPets = useMemo(
    () =>
      new Set(
        clients.flatMap((c) =>
          (c.pets ?? [])
            .filter((p) => hasAllergy(p.allergies))
            .map((p) => p.id),
        ),
      ),
    [clients],
  );
  const onMeds = current.filter((g) => medsByBooking.has(g.id));
  const allergic = current.filter((g) => allergicPets.has(g.petId));

  const owed = current.reduce(
    (sum, g) => sum + Math.max(0, g.amountDue - g.amountPaid),
    0,
  );
  const totalNights = current.reduce((sum, g) => sum + g.nights, 0);
  const nightlyRate =
    totalNights > 0
      ? current.reduce((sum, g) => sum + g.totalCost, 0) / totalNights
      : 0;
  const averageStay =
    current.length > 0
      ? Math.round((totalNights / current.length) * 10) / 10
      : 0;

  const nightsLabel = (n: number) =>
    n === 1 ? t("nightOne") : fill("nights", { n });
  const petLabel = (g: BoardingArrival) => g.petNames.join(", ");
  const bookingHref = (g: BoardingArrival) =>
    `/facility/dashboard/clients/${g.ownerId}/bookings/${g.id}`;

  const capacity =
    occupancy.percentage >= 90
      ? t("capacityFull")
      : occupancy.percentage >= 75
        ? t("capacityBusy")
        : occupancy.percentage >= 50
          ? t("capacityModerate")
          : t("capacityAvailable");

  const today = localDay(new Date().toISOString());
  const goesHome = (g: BoardingArrival) => {
    if (g.isOverdue) return t("overdue");
    const days = Math.round(
      (new Date(`${localDay(g.scheduledDeparture)}T12:00:00`).getTime() -
        new Date(`${today}T12:00:00`).getTime()) /
        DAY_MS,
    );
    if (days <= 0) return t("today");
    if (days === 1) return t("tomorrow");
    return fill("inDays", { n: days });
  };

  const empty = (text: string, Icon: typeof Bed) => (
    <div className="text-ink-tertiary flex flex-col items-center gap-2 py-8 text-center">
      <Icon className="size-6" />
      <p className="text-sm">{text}</p>
    </div>
  );

  const listSkeleton = (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Capacity — orange is the capacity territory, and full is not an error. */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg font-semibold">
              {t("occupancyTitle")}
            </CardTitle>
            <Badge variant="outline">{capacity}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink-secondary">
              {fill("kennelsOccupied", {
                occupied: occupancy.occupied,
                total: occupancy.total,
              })}
            </span>
            <span className="font-semibold tabular-nums">
              {formatPercent(occupancy.percentage / 100, locale)}
            </span>
          </div>
          <div className="bg-primary-tint-2 h-3 w-full overflow-hidden rounded-full">
            <div
              className="bg-brand-orange h-full rounded-full"
              style={{ width: `${Math.min(100, occupancy.percentage)}%` }}
            />
          </div>
          {Object.keys(occupancy.byType).length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
              {Object.entries(occupancy.byType).map(([typeId, counts]) => (
                <div
                  key={typeId}
                  className="rounded-2xl border p-3 text-center"
                >
                  <p className="text-2xl font-bold tabular-nums">
                    {counts.occupied}
                  </p>
                  <p className="text-ink-tertiary text-xs capitalize">
                    {typeId.replace(/-/g, " ")} / {counts.total}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t("statCurrent")}
          value={current.length}
          subtitle={fill("statCurrentSub", {
            pct: formatPercent(occupancy.percentage / 100, locale),
          })}
          icon={Bed}
          variant="primary"
        />
        <StatCard
          title={t("statArrivals")}
          value={arrivals.length}
          subtitle={fill("statArrivalsSub", {
            n: arrivals.filter((g) => g.status === "scheduled").length,
          })}
          icon={LogIn}
          variant="success"
        />
        <StatCard
          title={t("statDepartures")}
          value={departures.length}
          subtitle={fill("statDeparturesSub", {
            n: departures.filter((g) => g.status === "checked-in").length,
          })}
          icon={LogOut}
          variant="warning"
        />
        <StatCard
          title={t("statBalance")}
          value={formatMoney(owed, locale)}
          subtitle={t("statBalanceSub")}
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title={t("statAdr")}
          value={formatMoney(nightlyRate, locale)}
          subtitle={t("statAdrSub")}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title={t("statStay")}
          value={nightsLabel(averageStay)}
          subtitle={t("statAdrSub")}
          icon={Clock}
          variant="info"
        />
      </div>

      {(onMeds.length > 0 || allergic.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-warning flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="size-5" />
              {t("attention")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {onMeds.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border p-3">
                  <Pill className="text-ink-secondary mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {fill("onMeds", { n: onMeds.length })}
                    </p>
                    <p className="text-ink-secondary text-sm">
                      {onMeds.map(petLabel).join(", ")}
                    </p>
                  </div>
                </div>
              )}
              {allergic.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border p-3">
                  <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {fill("withAllergies", { n: allergic.length })}
                    </p>
                    <p className="text-ink-secondary text-sm">
                      {allergic.map(petLabel).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isError && <p className="text-destructive text-sm">{t("loadFailed")}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LogIn className="text-success size-5" />
              {t("statArrivals")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              listSkeleton
            ) : arrivals.length === 0 ? (
              empty(t("noArrivals"), LogIn)
            ) : (
              <ul className="space-y-3">
                {arrivals.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={bookingHref(g)}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <PawPrint className="text-primary size-5 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {petLabel(g)}
                          </p>
                          <p className="text-ink-tertiary truncate text-xs">
                            {[g.petBreed, g.ownerName]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant="outline">
                          {g.roomName ?? t("noKennel")}
                        </Badge>
                        <p className="text-ink-tertiary mt-1 text-xs tabular-nums">
                          {g.checkedInAt
                            ? fill("onSiteSince", {
                                time: formatTime(g.checkedInAt, locale),
                              })
                            : fill("dueAt", {
                                time: formatTime(g.scheduledArrival, locale),
                              })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LogOut className="text-warning size-5" />
              {t("statDepartures")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              listSkeleton
            ) : departures.length === 0 ? (
              empty(t("noDepartures"), LogOut)
            ) : (
              <ul className="space-y-3">
                {departures.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={bookingHref(g)}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <PawPrint className="text-primary size-5 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {petLabel(g)}
                          </p>
                          <p className="text-ink-tertiary truncate text-xs">
                            {[g.petBreed, nightsLabel(g.nights)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular-nums">
                          {g.checkedOutAt
                            ? fill("leftAt", {
                                time: formatTime(g.checkedOutAt, locale),
                              })
                            : fill("balanceDue", {
                                amount: formatMoney(
                                  Math.max(0, g.amountDue - g.amountPaid),
                                  locale,
                                ),
                              })}
                        </p>
                        {g.ownerPhone && (
                          <p className="text-ink-tertiary mt-1 flex items-center justify-end gap-1 text-xs">
                            <Phone className="size-3" />
                            {g.ownerPhone}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Bed className="size-5" />
              {t("currentTitle")}
            </CardTitle>
            {current.length > 0 && (
              <span className="text-ink-tertiary text-sm">
                {fill("averageStayLine", { nights: nightsLabel(averageStay) })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            listSkeleton
          ) : current.length === 0 ? (
            empty(t("noneBoarding"), Bed)
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {current.map((g) => (
                <div key={g.id} className="rounded-2xl border p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <PawPrint className="text-primary size-6 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{petLabel(g)}</p>
                        <p className="text-ink-tertiary truncate text-sm">
                          {g.petBreed}
                        </p>
                      </div>
                    </div>
                    {g.roomName && (
                      <Badge variant="outline">{g.roomName}</Badge>
                    )}
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-tertiary">{t("owner")}</dt>
                      <dd className="truncate">{g.ownerName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-tertiary">{t("stay")}</dt>
                      <dd className="tabular-nums">
                        {formatDateShort(localDay(g.scheduledArrival), locale)}{" "}
                        →{" "}
                        {formatDateShort(
                          localDay(g.scheduledDeparture),
                          locale,
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-tertiary">{t("goesHome")}</dt>
                      <dd
                        className={
                          g.isOverdue || g.isDepartingToday
                            ? "text-warning font-semibold"
                            : ""
                        }
                      >
                        {goesHome(g)}
                      </dd>
                    </div>
                  </dl>
                  {(medsByBooking.has(g.id) || allergicPets.has(g.petId)) && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                      {medsByBooking.has(g.id) && (
                        <Badge variant="outline" className="gap-1">
                          <Pill className="size-3" />
                          {t("medication")}
                        </Badge>
                      )}
                      {allergicPets.has(g.petId) && (
                        <Badge variant="outline" className="text-warning gap-1">
                          <AlertTriangle className="size-3" />
                          {t("allergies")}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-3 border-t pt-3">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={bookingHref(g)}>
                        <BookOpen className="size-4" />
                        {fill("openStay", { pet: petLabel(g) })}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
