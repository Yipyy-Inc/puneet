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
  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  // The main /clients/[id] page is the standalone full profile — no sidebar
  // All sub-pages (/overview, /bookings, /billing, etc.) get the sidebar
  const isStandalonePage = pathname === `/facility/dashboard/clients/${id}`;

  if (isStandalonePage) {
    return <>{children}</>;
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
