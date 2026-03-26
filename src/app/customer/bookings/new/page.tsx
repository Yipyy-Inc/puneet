"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CustomerBookingModal } from "@/components/customer/CustomerBookingModal";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export default function NewBookingPage() {
  const router = useRouter();

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
        <CustomerBookingModal
          asPage
          open={true}
          onOpenChange={() => {}}
          onCancel={() => router.back()}
          onBookingCreated={() => {
            toast.success("Booking created successfully!");
            router.push("/customer/bookings");
          }}
        />
      </div>
    </div>
  );
}
