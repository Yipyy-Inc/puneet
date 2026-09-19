import { AdminBookingDetailView } from "./_components/admin-booking-detail";

export default async function AdminBookingPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return <AdminBookingDetailView refParam={ref} />;
}
