"use client";

import { use } from "react";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { BookingCard } from "@/components/clients/BookingCard";

export default function ClientBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);
  const clientBookings = bookings
    .filter((b) => b.clientId === clientId)
    .sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

  if (!client) return null;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">
        Bookings ({clientBookings.length})
      </h2>
      {clientBookings.length > 0 ? (
        <div className="space-y-2">
          {clientBookings.map((booking, idx) => {
            const pet = client.pets.find(
              (p) =>
                p.id ===
                (Array.isArray(booking.petId)
                  ? booking.petId[0]
                  : booking.petId),
            );
            return (
              <BookingCard
                key={booking.id}
                booking={booking}
                pet={pet}
                pets={client.pets}
                bookingIndex={idx}
                totalBookings={clientBookings.length}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No bookings yet
        </p>
      )}
    </div>
  );
}
