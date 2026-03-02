"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CustomerBookingModal } from "@/components/customer/CustomerBookingModal";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export default function NewBookingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href="/customer/bookings"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to bookings
          </Link>
          <h1 className="text-xl font-semibold mt-1">New booking</h1>
          <p className="text-sm text-muted-foreground">
            Select a service and book for your pets
          </p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto">
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
