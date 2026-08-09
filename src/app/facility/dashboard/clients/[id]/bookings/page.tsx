"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientRecord } from "@/lib/api/client";
import { bookingQueries } from "@/lib/api/booking";
import { BookingCard } from "@/components/clients/BookingCard";

export default function ClientBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  // The client, from Postgres. This was `clients.find(...)` over
  // `src/data/clients.ts`, so every client created since the migration was
  // told they did not exist on their own file.
  const { client } = useClientRecord(clientId);
  // This client's bookings, from Postgres. It used to filter the
  // `@/data/bookings` fixture by clientId, so a real client's booking history
  // was whatever the fixture happened to contain for that number — usually
  // nothing, sometimes somebody else's stay.
  //
  // `byClient` rather than filtering `all()`: the query is scoped server-side
  // and RLS decides which rows come back, so no comparison in a browser can
  // improve on it.
  const { data: unsorted = [] } = useQuery(bookingQueries.byClient(clientId));
  const clientBookings = [...unsorted].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
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
