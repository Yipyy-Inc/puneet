"use client";

import type { ReactNode } from "react";
import {
  Building2,
  Calendar,
  Clock,
  PawPrint,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateLong,
  formatTimeOfDay,
  formatWeightFromLb,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { calendarDay } from "@/lib/yipyy-go/owner-form";
import type { Pet } from "@/types/pet";
import type { YipyyGoFormSectionBooking } from "@/types/yipyygo";

interface BookingDetailsSectionProps {
  booking: YipyyGoFormSectionBooking;
  pet: Pick<Pet, "name"> & Partial<Pick<Pet, "breed" | "weight">>;
}

export function BookingDetailsSection({
  booking,
  pet,
}: BookingDetailsSectionProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const isMultiDay = Boolean(
    booking.endDate && booking.endDate !== booking.startDate,
  );
  // The booking's days are facility-local `YYYY-MM-DD`: read at local
  // midnight, or they parse as UTC and show the day before in Canada.
  const day = (value?: string) =>
    value ? formatDateLong(calendarDay(value), locale) : "—";
  const petMeta = [
    pet.breed,
    pet.weight ? formatWeightFromLb(pet.weight, locale) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5" aria-hidden />
          {t("confirmBookingDetails")}
        </CardTitle>
        <CardDescription>{t("doubleCheckBooking")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Tile icon={PawPrint} label={t("pet")}>
            <p className="text-body-ink text-[15px] font-semibold">
              {pet.name}
            </p>
            {petMeta && (
              <p className="text-ink-secondary text-[13.5px]">{petMeta}</p>
            )}
          </Tile>
          <Tile icon={Building2} label={t("service")}>
            <p className="text-body-ink text-[15px] font-semibold">
              {booking.service
                ? serviceTypeLabel(locale, booking.service)
                : "—"}
            </p>
          </Tile>
          <Tile icon={Calendar} label={isMultiDay ? t("dates") : t("date")}>
            <p className="text-body-ink text-[15px] font-semibold">
              {day(booking.startDate)}
              {isMultiDay && <> → {day(booking.endDate)}</>}
            </p>
          </Tile>
          <Tile icon={Clock} label={t("checkInCheckOut")}>
            <p className="text-body-ink text-[15px] font-semibold tabular-nums">
              {booking.checkInTime
                ? formatTimeOfDay(booking.checkInTime, locale)
                : t("toBeDecided")}
              {booking.checkOutTime &&
                ` → ${formatTimeOfDay(booking.checkOutTime, locale)}`}
            </p>
          </Tile>
        </dl>
      </CardContent>
    </Card>
  );
}

function Tile({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-line min-w-0 space-y-1 rounded-xl border p-4">
      <dt className="text-ink-tertiary flex items-center gap-1.5 text-[12px] font-bold tracking-[.06em] uppercase">
        <Icon className="size-4" aria-hidden />
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
