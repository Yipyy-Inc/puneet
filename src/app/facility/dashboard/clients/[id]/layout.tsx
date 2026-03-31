import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { ClientFileSidebar } from "@/components/clients/ClientFileSidebar";

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
