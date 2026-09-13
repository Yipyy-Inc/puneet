"use client";

import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CalendarX2,
  CircleCheck,
  Clock3,
  Mail,
  Phone,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  MakeupStatus,
  TrainingMissedSession,
} from "@/lib/api/mappers/training-makeups";
import { formatDateLong, formatPhone, formatTime } from "@/lib/i18n/format";
import type { useStaffText } from "@/lib/staff/use-staff-text";

type StaffText = ReturnType<typeof useStaffText>;

// A status is its glyph, its word and its ink (§3).
const STATUS: Record<
  MakeupStatus,
  {
    key: string;
    variant: "pending" | "confirmed" | "cancelled" | "overdue";
    icon: LucideIcon;
  }
> = {
  requested: { key: "statusRequested", variant: "pending", icon: Clock3 },
  offered: { key: "statusOffered", variant: "confirmed", icon: CircleCheck },
  declined: { key: "statusDeclined", variant: "cancelled", icon: CalendarX2 },
  skipped: { key: "statusSkipped", variant: "cancelled", icon: CalendarX2 },
  ineligible: { key: "statusIneligible", variant: "overdue", icon: Ban },
};

export function MakeupRow({
  session,
  text,
  onOffer,
  onIneligible,
}: {
  session: TrainingMissedSession;
  text: StaffText;
  onOffer: () => void;
  onIneligible: () => void;
}) {
  const { t, fill, locale } = text;
  const makeup = session.makeup;
  const status = makeup ? STATUS[makeup.status] : null;
  // Nothing decided yet, the owner asked, or the owner turned a seat down.
  const open =
    !makeup || makeup.status === "requested" || makeup.status === "declined";
  const seat = makeup?.status === "offered" ? makeup.seat : null;

  return (
    <li className="bg-card border-line shadow-card flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body-strong text-body-ink">{session.petName}</p>
          {status ? (
            <Badge variant={status.variant} className="gap-1">
              <status.icon aria-hidden className="size-4" />
              {t(status.key)}
            </Badge>
          ) : null}
        </div>
        <p className="text-meta text-ink-secondary">
          {fill("missed", {
            number: session.sessionNumber,
            series: session.seriesName,
            date: formatDateLong(session.sessionStartAt, locale),
          })}
        </p>
        <p className="text-meta text-ink-tertiary flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{session.ownerName}</span>
          {session.ownerPhone ? (
            <span className="inline-flex items-center gap-1">
              <Phone aria-hidden className="size-4" />
              {formatPhone(session.ownerPhone, locale)}
            </span>
          ) : null}
          {session.ownerEmail ? (
            <span className="inline-flex min-w-0 items-center gap-1 break-all">
              <Mail aria-hidden className="size-4 shrink-0" />
              {session.ownerEmail}
            </span>
          ) : null}
        </p>
        {makeup?.ownerNote ? (
          <p className="text-body text-body-ink">
            {fill("ownerNote", { note: makeup.ownerNote })}
          </p>
        ) : null}
        {seat?.startAt ? (
          <p className="text-body text-body-ink">
            {fill("seat", {
              number: seat.sessionNumber ?? "",
              series: seat.seriesName ?? "",
              date: formatDateLong(seat.startAt, locale),
              time: formatTime(seat.startAt, locale),
            })}
          </p>
        ) : null}
        {seat && makeup?.offeredByName ? (
          <p className="text-meta text-ink-tertiary">
            {fill("bookedBy", { name: makeup.offeredByName })}
          </p>
        ) : null}
        {makeup?.status === "ineligible" && makeup.ineligibleReason ? (
          <p className="text-body text-body-ink">
            {fill("reason", { reason: makeup.ineligibleReason })}
          </p>
        ) : null}
      </div>
      {open ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={onOffer}>
            {fill("bookSeat", { pet: session.petName })}
          </Button>
          <Button variant="outline" onClick={onIneligible}>
            {fill("markIneligible", { pet: session.petName })}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
