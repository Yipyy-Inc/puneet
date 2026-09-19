"use client";

import * as React from "react";
import { Bed, Calendar, GraduationCap, Scissors, Sun } from "lucide-react";

import type { BookingRequest, BookingRequestService } from "@/types/booking";
import { BookingRequestDetailDialog } from "@/components/facility/BookingRequestDetailDialog";
import {
  BookingRequestActions,
  type BookingRequestActionHandlers,
} from "@/components/facility/BookingRequestActions";
import {
  formatDateShort,
  formatMoney,
  formatRelative,
  formatTime,
} from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { PetAvatar } from "@/components/ui/pet-avatar";

const SERVICE: Record<
  BookingRequestService,
  { key: string; icon: React.ComponentType<{ className?: string }> }
> = {
  daycare: { key: "serviceDaycare", icon: Sun },
  boarding: { key: "serviceBoarding", icon: Bed },
  grooming: { key: "serviceGrooming", icon: Scissors },
  training: { key: "serviceTraining", icon: GraduationCap },
};

export interface BookingRequestCardProps extends BookingRequestActionHandlers {
  request: BookingRequest;
  variant?: "pending" | "waitlist";
  busy?: boolean;
}

/**
 * One customer request: who, what, when, the price they were quoted, and the
 * decision. A multi-day daycare request is one card for all its days — it is
 * a booking per day underneath, and one decision.
 *
 * It was English only, formatted every date and time as en-US, coloured its
 * service with a dot of a status colour, and never showed the price.
 */
export function BookingRequestCard({
  request,
  variant = "pending",
  busy,
  ...handlers
}: BookingRequestCardProps) {
  const { t, fill, locale } = useStaffText("bookingRequests");
  const [detailOpen, setDetailOpen] = React.useState(false);

  const service = SERVICE[request.services[0]] ?? SERVICE.daycare;
  const ServiceIcon = service.icon;
  const days = request.dayDates ?? [request.startDate ?? ""];
  const first = days[0];
  const last = days[days.length - 1];
  const when =
    days.length > 1
      ? `${formatDateShort(`${first}T12:00:00`, locale)} – ${formatDateShort(
          `${last}T12:00:00`,
          locale,
        )} · ${fill("daysCount", { n: days.length })}`
      : `${formatDateShort(request.appointmentAt, locale)}, ${formatTime(
          request.appointmentAt,
          locale,
        )}`;

  return (
    <>
      <div className="bg-card flex flex-col gap-4 rounded-2xl border p-5">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="focus-visible:ring-ring/50 -m-2 flex min-w-0 flex-col gap-3 rounded-xl p-2 text-left outline-none focus-visible:ring-[3px]"
        >
          <div className="flex items-start gap-3">
            <PetAvatar name={request.petName || "?"} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px] font-semibold">
                  {request.petName || `#${request.id}`}
                </span>
                <span className="text-muted-foreground shrink-0 text-[12px]">
                  {fill("sentAgo", {
                    when: formatRelative(request.createdAt, locale),
                  })}
                </span>
              </div>
              <div className="text-muted-foreground truncate text-[13.5px]">
                {request.clientName}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
            <span className="flex items-center gap-1.5 font-medium">
              <ServiceIcon className="size-4" />
              {t(service.key)}
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5 tabular-nums">
              <Calendar className="size-4" />
              {when}
            </span>
          </div>

          <div className="text-[13.5px] tabular-nums">
            {request.quote != null ? (
              <span className="font-semibold">
                {fill("quotedPrice", {
                  price: formatMoney(request.quote, locale),
                })}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("noQuote")}</span>
            )}
          </div>

          {request.notes && (
            <p className="text-muted-foreground line-clamp-2 text-[13.5px]">
              {request.notes}
            </p>
          )}
        </button>

        <BookingRequestActions
          request={request}
          variant={variant}
          busy={busy}
          {...handlers}
        />
      </div>

      <BookingRequestDetailDialog
        request={request}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        variant={variant}
        busy={busy}
        {...handlers}
      />
    </>
  );
}
