"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useClientRecord } from "@/lib/api/client";
import { bookingQueries } from "@/lib/api/booking";
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

  return <ClientFileShell clientId={clientId}>{children}</ClientFileShell>;
}

/**
 * The sidebar branch, split out so the hooks below run only when it renders.
 *
 * The two early returns above leave before any query is made, and React
 * forbids a conditional hook — so the branch that needs data becomes its own
 * component rather than the parent fetching a client for pages that do not want
 * one.
 */
function ClientFileShell({
  clientId,
  children,
}: {
  clientId: number;
  children: React.ReactNode;
}) {
  const { client, pending } = useClientRecord(clientId);
  const { data: clientBookings = [] } = useQuery(
    bookingQueries.byClient(clientId),
  );

  // Pending is not absent. This used to read the fixtures, so it could answer
  // instantly and never had to tell the two apart; against the database,
  // rendering "Client not found." while the request is open states a fact
  // nobody has established.
  if (pending) {
    return <div className="min-h-0 flex-1" />;
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  const bookingCount = clientBookings.length;

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
