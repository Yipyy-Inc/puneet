import { TicketDetailClient } from "./_components/ticket-detail-client";

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketDetailClient ticketId={id} />;
}
