"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type {
  CustomerYipyyGoBooking,
  CustomerYipyyGoPet,
} from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { calendarDay } from "@/lib/yipyy-go/owner-form";

// Whose form this is, for which stay, whether the facility requires it, and
// until when it can change — the deadline the server computed
// (yipyy_go_deadline), shown in the owner's own time.
export function FormHeader({
  data,
  pet,
}: {
  data: CustomerYipyyGoBooking;
  pet: CustomerYipyyGoPet;
}) {
  const { t, fill, locale } = useCustomerText("yipyygo");
  const deadline = data.deadline ? new Date(data.deadline) : null;

  return (
    <header className="space-y-3">
      <Button variant="ghost" asChild className="-ml-3">
        <Link href={`/customer/bookings/${data.booking.ref}`}>
          <ArrowLeft aria-hidden />
          {t("backToBooking")}
        </Link>
      </Button>
      <PageHeader
        title={fill("formTitle", { pet: pet.name })}
        description={fill("formFor", {
          service: serviceTypeLabel(locale, data.booking.service),
          date: formatDateLong(calendarDay(data.booking.startDate), locale),
        })}
      />
      <p className="text-ink-secondary text-[13.5px]">
        {data.requirement === "mandatory"
          ? t("requiredBeforeDropoff")
          : t("formOptional")}
        {pet.editable && deadline && (
          <>
            {" · "}
            {fill("openUntil", {
              date: formatDateLong(deadline, locale),
              time: formatTime(deadline, locale),
            })}
          </>
        )}
      </p>
    </header>
  );
}
