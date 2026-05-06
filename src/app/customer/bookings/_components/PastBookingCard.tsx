"use client";

import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Cat,
  CreditCard,
  Dog,
  Heart,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Pet } from "@/types/pet";
import {
  formatDate,
  getPaymentBadge,
  getPetForBooking,
  ServiceIcon,
  getStatusBadge,
  type Booking,
} from "./booking-helpers";

interface PastBookingCardProps {
  booking: Booking;
  pets: Pet[];
  isMounted: boolean;
  existingTip: number;
  canTip: boolean;
  onLeaveTip: (booking: Booking) => void;
}

export function PastBookingCard({
  booking,
  pets,
  isMounted,
  existingTip,
  canTip,
  onLeaveTip,
}: PastBookingCardProps) {
  const pet = getPetForBooking(booking, pets);
  const PetIcon = pet?.type === "Cat" ? Cat : Dog;

  const isUnpaid = booking.paymentStatus === "pending";
  const isPaid = booking.paymentStatus === "paid";

  const handleReceipt = () => {
    // TODO: hook up to real receipt download/email when API lands.
    toast.success("Receipt sent to your email.");
  };

  return (
    <div className="space-y-2">
      <Link href={`/customer/bookings/${booking.id}`} className="block">
        <Card className="cursor-pointer opacity-75 transition-opacity hover:opacity-90">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
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
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <ServiceIcon
                        service={booking.service}
                        className="text-muted-foreground size-5"
                      />
                      <h3 className="font-semibold capitalize">
                        {booking.service}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {pet?.name || "Pet"} · {formatDate(booking.startDate, isMounted)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {getStatusBadge(booking.status)}
                    {getPaymentBadge(booking.paymentStatus)}
                  </div>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span>${booking.totalCost.toFixed(2)}</span>
                  {booking.checkInTime && <span>{booking.checkInTime}</span>}
                  {existingTip > 0 && (
                    <span className="text-primary inline-flex items-center gap-1 font-medium">
                      <Heart className="size-3 fill-current" />
                      ${existingTip.toFixed(2)} tipped
                    </span>
                  )}
                </div>
                {(isPaid || isUnpaid) && (
                  <div
                    className="flex flex-wrap items-center gap-2 pt-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {isPaid && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleReceipt();
                        }}
                      >
                        <Receipt className="mr-2 size-4" />
                        Email receipt
                      </Button>
                    )}
                    {isUnpaid && (
                      <Button variant="default" size="sm" asChild>
                        <Link href="/customer/billing">
                          <CreditCard className="mr-2 size-4" />
                          Pay outstanding balance
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {canTip && (
        <button
          type="button"
          onClick={() => onLeaveTip(booking)}
          className="border-primary/30 from-primary/10 via-primary/5 hover:border-primary/50 hover:from-primary/15 group flex w-full items-center gap-3 rounded-xl border-2 border-dashed bg-linear-to-r to-transparent px-4 py-3 text-left transition-all"
        >
          <div className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-full">
            <Heart className="size-4" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              Leave a tip for{" "}
              {pet?.name
                ? `the team that cared for ${pet.name}`
                : "the care team"}
            </p>
            <p className="text-muted-foreground text-[12px]">
              100% goes to the staff · takes 10 seconds
            </p>
          </div>
          <Badge className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-[11px] font-semibold group-hover:scale-105 transition-transform">
            Tip now
          </Badge>
        </button>
      )}
    </div>
  );
}
