"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { ChevronLeft } from "lucide-react";
import { clients } from "@/data/clients";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";

const MOCK_CUSTOMER_ID = 15;

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();

  const { bookingFlow } = useSettings();

  const customer = useMemo(
    () => clients.find((client) => client.id === MOCK_CUSTOMER_ID),
    [],
  );

  const preSelectedService = searchParams?.get("service") ?? undefined;

  if (!selectedFacility || !customer) {
    return (
      <div className="bg-background min-h-screen">
        <div className="bg-card border-b">
          <div className="mx-auto max-w-5xl p-4">
            <Link
              href="/customer/bookings"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="size-4" />
              Back to bookings
            </Link>
            <h1 className="mt-1 text-xl font-semibold">New booking</h1>
          </div>
        </div>
        <div className="mx-auto max-w-5xl p-4">
          <p className="text-muted-foreground text-sm">
            Unable to load booking wizard. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b">
        <div className="mx-auto max-w-5xl p-4">
          <Link
            href="/customer/bookings"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="size-4" />
            Back to bookings
          </Link>
          <h1 className="mt-1 text-xl font-semibold">New booking</h1>
          <p className="text-muted-foreground text-sm">
            Select a service and book for your pets
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl">
        <BookingModal
          open={true}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) router.push("/customer/bookings");
          }}
          clients={[customer]}
          facilityId={selectedFacility.id}
          facilityName={selectedFacility.name}
          preSelectedClientId={customer.id}
          preSelectedService={preSelectedService}
          isCustomerMode={true}
          bookingRequestMessage={bookingFlow.bookingRequestConfirmationMessage}
          onCreateBooking={() => {
            // Booking data is recorded; the modal shows the confirmation screen.
            // Navigation happens when the customer clicks Done (via onOpenChange).
          }}
        />
      </div>
    </div>
  );
}
