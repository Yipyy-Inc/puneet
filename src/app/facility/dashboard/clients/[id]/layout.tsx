import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { ClientFileSidebar } from "@/components/clients/ClientFileSidebar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ClientFileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = parseInt(id, 10);
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
    <div className="flex h-[calc(100vh-64px)]">
      <ClientFileSidebar
        client={client}
        petCount={client.pets.length}
        bookingCount={bookingCount}
      />
      <div className="flex-1 overflow-y-auto">
        {/* Breadcrumb */}
        <div className="border-b px-4 py-2 md:px-6">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/facility/dashboard/clients"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="size-3" />
              Clients
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              href={`/facility/dashboard/clients/${id}`}
              className="text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              {client.name}
            </Link>
          </div>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
