"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types/booking";
import type { Pet } from "@/types/pet";

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function nightsBetween(start: string, end: string) {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return {
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "confirmed":
      return {
        color: "bg-blue-500/10 text-blue-600 border-blue-200",
        dot: "bg-blue-500",
      };
    case "pending":
      return {
        color: "bg-amber-500/10 text-amber-600 border-amber-200",
        dot: "bg-amber-500",
      };
    case "cancelled":
      return {
        color: "bg-red-500/10 text-red-600 border-red-200",
        dot: "bg-red-500",
      };
    default:
      return {
        color: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
      };
  }
}

interface BookingCardProps {
  booking: Booking;
  pet?: Pet;
  pets: Pet[];
  bookingIndex: number;
  totalBookings: number;
  clientId?: number;
}

export function BookingCard({ booking, pet, clientId }: BookingCardProps) {
  const sc = statusConfig(booking.status);
  const nights = nightsBetween(booking.startDate, booking.endDate);
  const total = booking.invoice?.total ?? booking.totalCost;
  const cId = clientId ?? booking.clientId;
  const duration = nights > 0 ? `${nights}n` : "day";

  return (
    <Link
      href={`/facility/dashboard/clients/${cId}/bookings/${booking.id}`}
      className="bg-card hover:bg-muted/50 group flex w-full items-center gap-3 rounded-lg border p-3 transition-all"
    >
      {/* Status dot */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          sc.color,
        )}
      >
        <div className={cn("size-2 rounded-full", sc.dot)} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">
            {booking.service}
          </span>
          {pet && (
            <span className="text-muted-foreground text-xs">• {pet.name}</span>
          )}
          <Badge
            variant="outline"
            className={cn("text-[10px] capitalize", sc.color)}
          >
            {booking.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatDateShort(booking.startDate)}
          {booking.startDate !== booking.endDate &&
            ` → ${formatDateShort(booking.endDate)}`}{" "}
          · {duration}
          {booking.kennel && ` · ${booking.kennel}`}
        </p>
      </div>

      {/* Price + payment */}
      <div className="text-right">
        <p className="font-[tabular-nums] text-sm font-semibold">
          ${total.toFixed(2)}
        </p>
        {booking.paymentStatus === "paid" ? (
          <p className="text-xs text-emerald-600">Paid</p>
        ) : (
          <p className="text-muted-foreground text-xs capitalize">
            {booking.paymentStatus}
          </p>
        )}
      </div>

      {/* Navigate arrow */}
      <ChevronRight className="text-muted-foreground/30 group-hover:text-muted-foreground size-4 shrink-0 transition-colors" />
    </Link>
  );
}
