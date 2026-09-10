"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, PawPrint, Building2 } from "lucide-react";
import type { YipyyGoFormSectionProps } from "@/types/yipyygo";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateLong,
  formatTimeOfDay,
  formatWeightFromLb,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";

type BookingDetailsSectionProps = YipyyGoFormSectionProps;

function formatDate(locale: AppLocale, dateStr?: string) {
  if (!dateStr) return "—";
  // A bare YYYY-MM-DD is a calendar day: read it at LOCAL midnight, or it
  // parses as UTC and shows the day before anywhere in Canada.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? (() => {
        const [y, m, day] = dateStr.split("-").map(Number);
        return new Date(y, m - 1, day);
      })()
    : new Date(dateStr);
  return formatDateLong(d, locale);
}

export function BookingDetailsSection({
  booking,
  pet,
  onNext,
  onBack,
}: BookingDetailsSectionProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const isMultiDay = booking.endDate && booking.endDate !== booking.startDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="text-primary size-5" />
          {t("confirmBookingDetails")}
        </CardTitle>
        <CardDescription>{t("doubleCheckBooking")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <PawPrint className="size-3" /> {t("pet")}
            </div>
            <p className="text-lg font-semibold">{pet.name}</p>
            <p className="text-muted-foreground text-sm">
              {pet.breed}
              {pet.weight ? ` · ${formatWeightFromLb(pet.weight, locale)}` : ""}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Building2 className="size-3" /> {t("service")}
            </div>
            <p className="text-lg font-semibold">
              {booking.service
                ? serviceTypeLabel(locale, booking.service)
                : "—"}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Calendar className="size-3" />{" "}
              {isMultiDay ? t("dates") : t("date")}
            </div>
            <p className="text-lg font-semibold">
              {formatDate(locale, booking.startDate)}
              {isMultiDay && (
                <>
                  {" → "}
                  {formatDate(locale, booking.endDate)}
                </>
              )}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Clock className="size-3" /> {t("checkInCheckOut")}
            </div>
            <p className="text-lg font-semibold">
              {booking.checkInTime
                ? formatTimeOfDay(booking.checkInTime, locale)
                : t("toBeDecided")}
              {booking.checkOutTime
                ? ` → ${formatTimeOfDay(booking.checkOutTime, locale)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            {t("back")}
          </Button>
          <Button onClick={onNext}>Next: Feeding</Button>
        </div>
      </CardContent>
    </Card>
  );
}
