import { CustomerBookingDetailView } from "./_components/customer-booking-detail-view";

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerBookingDetailView refParam={id} />;
}
