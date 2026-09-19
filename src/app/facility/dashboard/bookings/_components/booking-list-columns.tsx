"use client";

import {
  Calendar,
  CheckSquare,
  CircleDot,
  Clock,
  CalendarDays,
  DollarSign,
  FileText,
  Hash,
  User,
} from "lucide-react";

import type { ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TagList } from "@/components/shared/TagList";
import { FormStatusChip } from "@/components/yipyygo/form-status-chip";
import {
  formatCalendarDayLong,
  formatMoney,
  formatTime,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import type { AppLocale } from "@/lib/language-settings";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";

/** Statuses in which no pet is expected to arrive. */
const NOT_COMING = new Set<string>([
  "cancelled",
  "declined",
  "no_show",
  "estimate_sent",
  "request_submitted",
  "waitlisted",
]);

/** Care tasks a booking carries: feedings, medication doses, extras, walks. */
export function careTaskCount(booking: Booking): number {
  let count = booking.feedingSchedule?.length ?? 0;
  for (const med of booking.medications ?? []) count += med.times.length;
  count += booking.extraServices?.length ?? 0;
  if (booking.service === "boarding" && booking.walkSchedule) count += 1;
  return count;
}

/** Whole days between two YYYY-MM-DD days, counted in UTC so no zone moves it. */
export function daysBetween(start: string, end: string): number {
  const at = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  return Math.max(0, Math.round((at(end) - at(start)) / 86_400_000));
}

/** "08:00" in the reader's own clock — `8:00 AM`, `8 h 00`. */
function clock(time: string | undefined, locale: AppLocale): string {
  if (!time) return "—";
  return formatTime(`2000-01-01T${time.slice(0, 5)}:00`, locale);
}

export interface BookingListColumnsInput {
  t: (key: string) => string;
  fill: (key: string, values: Record<string, string | number>) => string;
  formText: (key: string) => string;
  locale: AppLocale;
  clientById: Map<number, Client>;
  noteCounts: Record<number, number> | undefined;
  /** HQ view across several locations: the booking's own branch. */
  locations?: ReadonlyArray<{
    id: string;
    name: string;
    shortCode?: string | null;
  }>;
  /** Omitted from the DOM without view_booking_financials (3C). */
  showMoney: boolean;
  maskAmount: (value: string, field: "booking_financials") => string;
  /** What is still owed and the total, from bookingTotals — the booking
   * page's own numbers, tax included where the facility charges it. */
  moneyOf: (booking: Booking) => { balance: number; total: number };
}

/**
 * The bookings list's columns. Every word is the reader's language and every
 * date, time and amount goes through `Intl` (§5q): this was English, en-US
 * dates and a `$` pasted before `toFixed(2)`. "Cost" showed the price whatever
 * had been paid; the column is what is still OWED now, with the total under
 * it, because that is what a person scanning a list of bookings is looking
 * for.
 */
export function bookingListColumns({
  t,
  fill,
  formText,
  locale,
  clientById,
  noteCounts,
  locations,
  showMoney,
  maskAmount,
  moneyOf,
}: BookingListColumnsInput): ColumnDef<Booking>[] {
  const day = (d: string) => formatCalendarDayLong(d, locale);

  return [
    {
      key: "id",
      label: t("listColId"),
      icon: Hash,
      defaultVisible: true,
      sortable: true,
      render: (booking) => (
        <span className="font-mono text-sm tabular-nums">#{booking.id}</span>
      ),
    },
    ...(locations
      ? [
          {
            key: "location",
            label: t("listColLocation"),
            icon: CircleDot,
            defaultVisible: true,
            sortable: false,
            render: (booking: Booking) => {
              const loc = locations.find((l) => l.id === booking.locationId);
              if (!loc) {
                return <span className="text-muted-foreground text-xs">—</span>;
              }
              return (
                <span className="text-xs font-medium">
                  {loc.shortCode ?? loc.name}
                </span>
              );
            },
          } satisfies ColumnDef<Booking>,
        ]
      : []),
    {
      key: "client",
      label: t("listColClient"),
      icon: User,
      defaultVisible: true,
      sortable: false,
      render: (booking) => {
        const client = clientById.get(booking.clientId);
        const pet = client?.pets.find((p) => p.id === booking.petId);
        return (
          <div className="flex items-center gap-2.5">
            {pet && (
              <PetAvatar
                name={pet.name}
                src={pet.imageUrl}
                size="sm"
                present={booking.presence === "on-site"}
              />
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {client?.name || t("listUnknownClient")}
              </span>
              <span className="text-ink-tertiary truncate text-xs">
                {pet?.name || t("listUnknownPet")}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "service",
      label: t("service"),
      icon: CalendarDays,
      defaultVisible: true,
      sortable: false,
      render: (booking) => (
        <Badge variant="outline">
          {serviceTypeLabel(locale, booking.service)}
        </Badge>
      ),
    },
    {
      key: "dates",
      label: t("listColDates"),
      icon: Calendar,
      defaultVisible: true,
      sortable: true,
      render: (booking) => {
        const span = daysBetween(booking.startDate, booking.endDate);
        const length =
          span === 0
            ? t("listSameDay")
            : booking.service === "boarding"
              ? span === 1
                ? t("listNight")
                : fill("listNights", { n: span })
              : fill("listDays", { n: span + 1 });
        return (
          <div className="flex flex-col">
            <span className="text-sm tabular-nums">
              {day(booking.startDate)}
            </span>
            {booking.startDate !== booking.endDate && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {fill("listDateTo", { date: day(booking.endDate) })}
              </span>
            )}
            <span className="text-muted-foreground mt-0.5 text-xs">
              {length}
            </span>
          </div>
        );
      },
    },
    {
      key: "time",
      label: t("listColTime"),
      icon: Clock,
      defaultVisible: true,
      sortable: false,
      render: (booking) => (
        <div className="flex flex-col text-xs tabular-nums">
          <span>
            {fill("listIn", { time: clock(booking.checkInTime, locale) })}
          </span>
          <span className="text-muted-foreground">
            {fill("listOut", { time: clock(booking.checkOutTime, locale) })}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: t("listColStatus"),
      icon: CircleDot,
      defaultVisible: true,
      sortable: true,
      render: (booking) => <StatusBadge type="status" value={booking.status} />,
    },
    {
      // Where the pet is — a separate axis from `status`, derived in SQL
      // (booking_presence) from whichever attendance table owns it. `unknown`
      // is honest: training and custom services have no attendance record.
      key: "presence",
      label: t("listColPresence"),
      icon: CircleDot,
      defaultVisible: true,
      sortable: false,
      render: (booking) => {
        const presence = booking.presence ?? "unknown";
        // "Expected" is a promise that the pet is coming, so a booking that
        // will not happen — cancelled, declined, a no-show, a request not yet
        // accepted — makes none. It said "Expected" down every cancelled row.
        const coming = !NOT_COMING.has(booking.status);
        if (presence === "unknown" || (presence === "expected" && !coming)) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const label =
          presence === "on-site"
            ? t("listPresenceOnSite")
            : presence === "departed"
              ? t("listPresenceDeparted")
              : t("listPresenceExpected");
        return (
          <span
            data-presence={presence}
            className="data-[presence=departed]:text-muted-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium data-[presence=expected]:border-amber-200 data-[presence=expected]:text-amber-700 data-[presence=on-site]:border-emerald-200 data-[presence=on-site]:text-emerald-700"
          >
            {label}
          </span>
        );
      },
    },
    ...(showMoney
      ? [
          {
            key: "payment",
            label: t("listColPayment"),
            icon: DollarSign,
            defaultVisible: true,
            sortable: false,
            render: (booking: Booking) => (
              <StatusBadge type="status" value={booking.paymentStatus} />
            ),
          } satisfies ColumnDef<Booking>,
        ]
      : []),
    {
      key: "tags",
      label: t("listColTags"),
      icon: FileText,
      defaultVisible: true,
      sortable: false,
      render: (booking) => (
        <TagList
          entityType="booking"
          entityId={booking.id}
          compact
          maxVisible={2}
        />
      ),
    },
    {
      key: "notes",
      label: t("listColNotes"),
      icon: FileText,
      defaultVisible: true,
      sortable: false,
      render: (booking) => {
        const count = noteCounts?.[booking.id] ?? 0;
        return count > 0 ? (
          <Badge variant="outline" className="gap-1 text-xs">
            {count === 1
              ? t("listNotesOne")
              : fill("listNotesMany", { n: count })}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      key: "yipyygo",
      label: formText("columnLabel"),
      icon: FileText,
      defaultVisible: true,
      sortable: false,
      render: (booking) =>
        booking.yipyyGo?.requirement ? (
          <FormStatusChip
            status={booking.yipyyGo.status}
            mandatory={booking.yipyyGo.requirement === "mandatory"}
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "tasks",
      label: t("listColTasks"),
      icon: CheckSquare,
      defaultVisible: true,
      sortable: false,
      render: (booking) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {careTaskCount(booking)}
        </span>
      ),
    },
    ...(showMoney
      ? [
          {
            key: "owed",
            label: t("listColOwed"),
            icon: DollarSign,
            defaultVisible: true,
            sortable: false,
            render: (booking: Booking) => {
              const { balance, total } = moneyOf(booking);
              return balance > 0 ? (
                <div className="flex flex-col tabular-nums">
                  <span className="font-medium">
                    {maskAmount(
                      formatMoney(balance, locale),
                      "booking_financials",
                    )}
                  </span>
                  {balance < total && (
                    <span className="text-muted-foreground text-xs">
                      {fill("listOfTotal", {
                        total: maskAmount(
                          formatMoney(total, locale),
                          "booking_financials",
                        ),
                      })}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {total > 0 ? t("listPaidInFull") : "—"}
                </span>
              );
            },
          } satisfies ColumnDef<Booking>,
        ]
      : []),
  ];
}
