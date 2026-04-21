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

type BookingDetailsSectionProps = YipyyGoFormSectionProps;

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BookingDetailsSection({
  booking,
  pet,
  onNext,
  onBack,
}: BookingDetailsSectionProps) {
  const isMultiDay = booking.endDate && booking.endDate !== booking.startDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="text-primary size-5" />
          Confirm booking details
        </CardTitle>
        <CardDescription>
          Double-check the booking below. If anything looks wrong, contact the
          facility before continuing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <PawPrint className="size-3" /> Pet
            </div>
            <p className="text-lg font-semibold">{pet.name}</p>
            <p className="text-muted-foreground text-sm">
              {pet.breed}
              {pet.weight ? ` · ${pet.weight} lb` : ""}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Building2 className="size-3" /> Service
            </div>
            <p className="text-lg font-semibold capitalize">
              {booking.service ?? "—"}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Calendar className="size-3" />{" "}
              {isMultiDay ? "Dates" : "Date"}
            </div>
            <p className="text-lg font-semibold">
              {formatDate(booking.startDate)}
              {isMultiDay && (
                <>
                  {" → "}
                  {formatDate(booking.endDate)}
                </>
              )}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Clock className="size-3" /> Check-in / Check-out
            </div>
            <p className="text-lg font-semibold">
              {booking.checkInTime ?? "TBD"}
              {booking.checkOutTime ? ` → ${booking.checkOutTime}` : ""}
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>Next: Feeding</Button>
        </div>
      </CardContent>
    </Card>
  );
}
