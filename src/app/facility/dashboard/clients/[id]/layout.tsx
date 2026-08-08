"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { ClientFileSidebar } from "@/components/clients/ClientFileSidebar";

export default function ClientFileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const clientId = parseInt(id, 10);

  // Standalone profile page — no sidebar
  const isStandalonePage = pathname === `/facility/dashboard/clients/${id}`;
  // Booking and pet detail pages get a compact client header instead of the full sidebar
  const isDetailPage = /\/(bookings|pets)\/\d+/.test(pathname ?? "");

  // ── THE CLIENT LOOKUP BELONGS TO THE SIDEBAR, SO IT HAPPENS AFTER THIS ────
  //
  // These two branches render `children` and nothing else — no sidebar, no
  // client. Looking a client up in order to reject the page is a refusal the
  // layout has no standing to make, and it was refusing on FIXTURE data: every
  // booking detail page whose client lives in Postgres (which is every client
  // created since the migration) died here, before its own page ran, with
  // "Client not found." on a record that plainly exists.
  if (isStandalonePage || isDetailPage) {
    return <>{children}</>;
  }

  // The sidebar branch still reads the fixtures, along with the twelve pages it
  // wraps (pets, billing, vaccinations, forms …), and it must keep doing so
  // until they move together: the clients LIST is mock too, so a live lookup
  // here would leave every demo client in that list clicking through to
  // "Client not found." Converting the whole client file is its own change.
  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  const bookingCount = bookings.filter((b) => b.clientId === clientId).length;

  return (
    <div className="flex min-h-0 flex-1">
      <ClientFileSidebar
        client={client}
        petCount={client.pets.length}
        bookingCount={bookingCount}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
