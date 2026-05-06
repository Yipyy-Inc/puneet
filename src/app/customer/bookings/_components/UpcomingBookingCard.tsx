"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Calendar as CalendarIcon,
  Cat,
  Clock,
  CreditCard,
  Dog,
  DollarSign,
  Download,
  Edit,
  MapPin,
  MessageSquare,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagList } from "@/components/shared/TagList";
import { getNotesForEntity } from "@/data/tags-notes";
import type { Pet } from "@/types/pet";
import {
  downloadCalendarEvent,
  formatDate,
  getPaymentBadge,
  getPetForBooking,
  ServiceIcon,
  getStatusBadge,
  type Booking,
} from "./booking-helpers";

interface UpcomingBookingCardProps {
  booking: Booking;
  pets: Pet[];
  facilityName: string | undefined;
  isMounted: boolean;
  onCancel: (booking: Booking) => void;
  onAddNote: (booking: Booking) => void;
}

export function UpcomingBookingCard({
  booking,
  pets,
  facilityName,
  isMounted,
  onCancel,
  onAddNote,
}: UpcomingBookingCardProps) {
  const router = useRouter();
  const pet = getPetForBooking(booking, pets);
  const PetIcon = pet?.type === "Cat" ? Cat : Dog;

  const sharedNotes = getNotesForEntity("booking", booking.id).filter(
    (n) => n.visibility === "shared_with_customer",
  );

  const isUnpaid = booking.paymentStatus === "pending";

  return (
    <Link href={`/customer/bookings/${booking.id}`} className="block">
      <Card className="cursor-pointer transition-shadow hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Pet Photo */}
            <div className="shrink-0">
              {pet?.imageUrl ? (
                <Image
                  src={pet.imageUrl}
                  alt={pet.name}
                  width={64}
                  height={64}
                  className="size-16 rounded-lg object-cover"
                />
              ) : (
                <div className="bg-primary/10 flex size-16 items-center justify-center rounded-lg">
                  <PetIcon className="text-primary size-8" />
                </div>
              )}
            </div>

            {/* Booking Details */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <ServiceIcon
                      service={booking.service}
                      className="text-muted-foreground size-5"
                    />
                    <h3 className="text-lg font-semibold capitalize">
                      {booking.service}
                      {booking.serviceType && (
                        <span className="text-muted-foreground ml-2 font-normal">
                          • {booking.serviceType.replace(/_/g, " ")}
                        </span>
                      )}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {pet?.name || "Pet"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {getStatusBadge(booking.status)}
                  {getPaymentBadge(booking.paymentStatus)}
                  {booking.status === "request_submitted" && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 size-3" />
                      Response in ~24h
                    </Badge>
                  )}
                </div>
              </div>

              <TagList
                entityType="booking"
                entityId={booking.id}
                compact
                maxVisible={3}
                isCustomerView
              />

              {/* Shared booking notes from staff */}
              {sharedNotes.length > 0 && (
                <div className="space-y-1">
                  {sharedNotes.map((note) => (
                    <blockquote
                      key={note.id}
                      className="rounded-sm border border-blue-200 bg-blue-50 p-2 text-xs dark:border-blue-800 dark:bg-blue-950/20"
                      aria-label={`Staff note from ${note.createdBy}`}
                    >
                      <span className="font-medium">{note.createdBy}:</span>{" "}
                      {note.content}
                    </blockquote>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <BookingMeta
                  icon={Calendar}
                  label="Date"
                  value={formatDate(booking.startDate, isMounted)}
                />
                <BookingMeta
                  icon={Clock}
                  label="Time"
                  value={
                    booking.checkInTime
                      ? `${booking.checkInTime}${booking.checkOutTime ? ` - ${booking.checkOutTime}` : ""}`
                      : "—"
                  }
                />
                <BookingMeta
                  icon={MapPin}
                  label="Location"
                  value={facilityName || "—"}
                />
                <BookingMeta
                  icon={DollarSign}
                  label="Total"
                  value={`$${booking.totalCost.toFixed(2)}`}
                />
              </div>

              {/* Actions row — stop propagation so clicking buttons doesn't navigate */}
              <div
                className="flex flex-wrap items-center gap-2 border-t pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {(booking.status === "confirmed" ||
                  booking.status === "pending") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push("/customer/bookings/new");
                      }}
                    >
                      <Edit className="mr-2 size-4" />
                      Reschedule
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        onCancel(booking);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="mr-2 size-4" />
                      Cancel
                    </Button>
                  </>
                )}
                {isUnpaid && (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href="/customer/billing">
                      <CreditCard className="mr-2 size-4" />
                      Pay now
                    </Link>
                  </Button>
                )}
                {booking.status === "request_submitted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push("/customer/messages");
                    }}
                  >
                    <MessageSquare className="mr-2 size-4" />
                    Message Facility
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="mr-2 size-4" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onAddNote(booking)}>
                      <MessageSquare className="mr-2 size-4" />
                      Add Note/Message
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        downloadCalendarEvent(
                          booking,
                          pet?.name ?? "Pet",
                          facilityName,
                        )
                      }
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      Add to Calendar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function BookingMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-muted-foreground size-4" />
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
