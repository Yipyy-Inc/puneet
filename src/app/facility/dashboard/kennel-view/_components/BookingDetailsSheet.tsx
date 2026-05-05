"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  CircleDot,
  Edit3,
  LogIn,
  LogOut,
  PawPrint,
  Phone,
  Pill,
  Sparkles,
  Tag,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getBookingSurfaceClasses,
  getStatusLabel,
} from "../_lib/calendar-helpers";
import { roomCategories } from "@/data/rooms";
import type { OccupancyKennel } from "../_lib/calendar-types";
import { getTagsForEntity, getNoteCount } from "@/data/tags-notes";

interface BookingDetailsSheetProps {
  booking: OccupancyKennel | null;
  isPastWeek?: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn?: (bookingId: number) => void;
  onCheckOut?: (bookingId: number) => void;
  onEdit?: (bookingId: number) => void;
}

export function BookingDetailsSheet({
  booking,
  isPastWeek,
  onOpenChange,
  onCheckIn,
  onCheckOut,
  onEdit,
}: BookingDetailsSheetProps) {
  const open = booking !== null;
  const category = booking
    ? roomCategories.find((c) => c.id === booking.categoryId)
    : undefined;
  const petTags = booking?.petId ? getTagsForEntity("pet", booking.petId) : [];
  const noteCount = booking?.petId ? getNoteCount("pet", booking.petId) : 0;
  const isCritical = petTags.some((t) => t.priority === "critical");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Custom overlay — strong blur, slow fade for a smoother feel. */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/30 backdrop-blur-md duration-300",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl border shadow-2xl duration-300 sm:max-w-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2",
          )}
        >
          {booking && (
            <div className="flex max-h-[90vh] flex-col">
              {/* Close button (positioned over coloured header) */}
              <DialogPrimitive.Close
                className="ring-offset-background focus:ring-ring absolute top-4 right-4 z-10 rounded-full bg-white/70 p-1.5 shadow-sm backdrop-blur-sm transition-opacity hover:bg-white focus:ring-2 focus:ring-offset-2 focus:outline-hidden dark:bg-black/40 dark:hover:bg-black/60"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>

              {/* Header with pet photo */}
              <div
                className={cn(
                  "relative px-6 pt-6 pb-5",
                  getBookingSurfaceClasses(booking.bookingStatus),
                )}
              >
                <div className="flex items-center gap-4 pr-8">
                  <div className="ring-background size-20 shrink-0 overflow-hidden rounded-full ring-4 shadow-lg">
                    {booking.petPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={booking.petPhotoUrl}
                        alt={booking.petName ?? ""}
                        width={80}
                        height={80}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex size-full items-center justify-center">
                        <PawPrint className="text-muted-foreground size-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <DialogPrimitive.Title className="text-xl/tight font-semibold">
                      {booking.petName}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-foreground/70 text-xs">
                      {booking.petBreed ?? booking.petSpecies}
                      {booking.petSize ? ` • ${booking.petSize}` : ""}
                    </DialogPrimitive.Description>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {booking.bookingStatus && (
                        <Badge
                          variant="secondary"
                          className="bg-background/80 backdrop-blur-sm"
                        >
                          {getStatusLabel(booking.bookingStatus)}
                        </Badge>
                      )}
                      {booking.paymentStatus && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "bg-background/80",
                            booking.paymentStatus === "paid" &&
                              "border-emerald-500 text-emerald-700 dark:text-emerald-300",
                            booking.paymentStatus === "pending" &&
                              "border-amber-500 text-amber-700 dark:text-amber-300",
                            booking.paymentStatus === "refunded" &&
                              "border-slate-500 text-slate-700 dark:text-slate-300",
                          )}
                        >
                          {booking.paymentStatus === "paid"
                            ? "Paid"
                            : booking.paymentStatus === "pending"
                              ? "Payment pending"
                              : "Refunded"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {isCritical && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                    <div className="text-sm">
                      <div className="font-semibold text-red-900 dark:text-red-200">
                        Critical alert
                      </div>
                      <div className="text-red-800 dark:text-red-300">
                        {petTags
                          .filter((t) => t.priority === "critical")
                          .map((t) => t.name)
                          .join(", ")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Owner */}
                <section className="space-y-2">
                  <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Owner
                  </h4>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
                        <CircleDot className="text-muted-foreground size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {booking.clientName}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {booking.clientPhone ?? "No phone on file"}
                        </div>
                      </div>
                    </div>
                    {booking.clientPhone && (
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <a href={`tel:${booking.clientPhone}`}>
                          <Phone className="size-3.5" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </section>

                {/* Stay details */}
                <section className="space-y-2">
                  <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Stay
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-3">
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <LogIn className="size-3" />
                        Check-in
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {booking.checkIn}
                      </div>
                      {booking.checkInTime && (
                        <div className="text-muted-foreground text-xs">
                          {booking.checkInTime}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <LogOut className="size-3" />
                        Check-out
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {booking.checkOut}
                      </div>
                      {booking.checkOutTime && (
                        <div className="text-muted-foreground text-xs">
                          {booking.checkOutTime}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-muted-foreground size-4" />
                      <div>
                        <div className="text-sm font-medium">{booking.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {category?.name ?? "Room"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        ${booking.dailyRate}
                      </div>
                      <div className="text-muted-foreground text-xs">/ night</div>
                    </div>
                  </div>
                </section>

                {/* Care */}
                {(booking.hasFeedingInstructions ||
                  booking.hasMedications ||
                  booking.specialRequests ||
                  noteCount > 0 ||
                  petTags.length > 0) && (
                  <section className="space-y-2">
                    <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Care
                    </h4>
                    <div className="space-y-2 rounded-lg border p-3">
                      {petTags.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <Tag className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {petTags.map((t) => (
                              <Badge key={t.id} variant="outline" className="text-[10px]">
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {booking.hasFeedingInstructions && (
                        <div className="flex items-start gap-2 text-sm">
                          <Utensils className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>Feeding instructions on file</span>
                        </div>
                      )}
                      {booking.hasMedications && (
                        <div className="flex items-start gap-2 text-sm">
                          <Pill className="mt-0.5 size-4 shrink-0 text-purple-600 dark:text-purple-400" />
                          <span>Medications on file</span>
                        </div>
                      )}
                      {noteCount > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <Sparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                          <span>
                            {noteCount} {noteCount === 1 ? "note" : "notes"} on file
                          </span>
                        </div>
                      )}
                      {booking.specialRequests && (
                        <p className="text-muted-foreground border-l-2 pl-2 text-xs italic">
                          {booking.specialRequests}
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </div>

              {/* Footer actions */}
              <Separator />
              <div className="bg-muted/30 grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
                <Button
                  variant="default"
                  size="sm"
                  disabled={
                    isPastWeek ||
                    !booking.bookingId ||
                    booking.bookingStatus === "checked_in" ||
                    booking.bookingStatus === "completed"
                  }
                  onClick={() =>
                    booking.bookingId && onCheckIn?.(booking.bookingId)
                  }
                  className="gap-1.5"
                >
                  <LogIn className="size-3.5" />
                  Check in
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={
                    isPastWeek ||
                    !booking.bookingId ||
                    booking.bookingStatus !== "checked_in"
                  }
                  onClick={() =>
                    booking.bookingId && onCheckOut?.(booking.bookingId)
                  }
                  className="gap-1.5"
                >
                  <CheckCircle className="size-3.5" />
                  Check out
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPastWeek || !booking.bookingId}
                  onClick={() => booking.bookingId && onEdit?.(booking.bookingId)}
                  className="gap-1.5"
                  asChild={!!booking.bookingId && !isPastWeek}
                >
                  {booking.bookingId && !isPastWeek ? (
                    <Link href={`/facility/dashboard/bookings/${booking.bookingId}`}>
                      <Edit3 className="size-3.5" />
                      Edit
                    </Link>
                  ) : (
                    <span>
                      <Edit3 className="size-3.5" />
                      Edit
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!booking.clientPhone}
                  asChild={!!booking.clientPhone}
                  className="gap-1.5"
                >
                  {booking.clientPhone ? (
                    <a href={`tel:${booking.clientPhone}`}>
                      <Phone className="size-3.5" />
                      Call owner
                    </a>
                  ) : (
                    <span>
                      <Phone className="size-3.5" />
                      Call owner
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
